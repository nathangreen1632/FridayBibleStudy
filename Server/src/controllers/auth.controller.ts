// Server/src/controllers/auth.controller.ts
import type { Request, Response } from 'express';
import dayjs from 'dayjs';
import { User, OtpToken } from '../models/index.js';
import { hashPassword, verifyPassword } from '../utils/passwords.util.js';
import { signJwt } from '../utils/jwt.util.js';
import { env } from '../config/env.config.js';
import { sendEmail } from '../services/email.service.js';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function setCookie(res: Response, token: string): void {
  res.cookie(env.JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.JWT_FIXED_EXP_HOURS * 60 * 60 * 1000
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { name, phone, email, password } = req.body as { name: string; phone: string; email: string; password: string };
  const exists = await User.findOne({ where: { email } });
  if (exists) { res.status(409).json({ error: 'Email already registered' }); return; }
  const passwordHash = await hashPassword(password);
  const user = await User.create({ name, phone, email, passwordHash });
  const token = signJwt({ userId: user.id, role: user.role });
  setCookie(res, token);

  // Verification email (simple)
  await sendEmail({
    to: email,
    subject: 'Welcome to Friday Night Bible Study',
    html: `<p>Hi ${user.name}, your account has been created.</p>`
  });

  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ where: { email } });
  if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const token = signJwt({ userId: user.id, role: user.role });
  setCookie(res, token);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(env.JWT_COOKIE_NAME);
  res.json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: [
        'id', 'name', 'email', 'role',
        'phone', 'addressStreet', 'addressCity', 'addressState', 'addressZip', 'spouseName'
      ],
    });

    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      addressStreet: user.addressStreet,
      addressCity: user.addressCity,
      addressState: user.addressState,
      addressZip: user.addressZip,
      spouseName: user.spouseName
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch user';
    res.status(500).json({ error: msg });
  }
}

export async function requestReset(req: Request, res: Response): Promise<void> {
  const { email } = req.body as { email: string };
  const user = await User.findOne({ where: { email } });
  if (!user) { res.json({ ok: true }); return; } // avoid user enumeration

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = dayjs().add(10, 'minute').toDate();
  await OtpToken.create({ userId: user.id, otpHash, expiresAt });

  await sendEmail({
    to: user.email,
    subject: 'Your OTP Code',
    html: `<p>Your OTP is <b>${otp}</b>. It expires in 10 minutes.</p>`
  });

  res.json({ ok: true });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const { email, otp, newPassword } = req.body as { email: string; otp: string; newPassword: string };
  const user = await User.findOne({ where: { email } });
  if (!user) { res.status(400).json({ error: 'Invalid OTP' }); return; }

  const token = await OtpToken.findOne({ where: { userId: user.id }, order: [['createdAt', 'DESC']] });
  if (!token || token.expiresAt < new Date()) { res.status(400).json({ error: 'OTP expired' }); return; }

  const ok = await bcrypt.compare(otp, token.otpHash);
  if (!ok) { res.status(400).json({ error: 'Invalid OTP' }); return; }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await token.destroy(); // single-use

  res.json({ ok: true });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const {
      name,
      phone,
      addressStreet,
      addressCity,
      addressState,
      addressZip,
      spouseName
    } = (req.body ?? {}) as Partial<{
      name: string; phone: string;
      addressStreet: string; addressCity: string; addressState: string; addressZip: string;
      spouseName: string | null;
    }>;

    const user = await User.findByPk(req.user.userId);
    if (!user) { res.status(404).json({ error: 'Not found' }); return; }

    // Helpers
    const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
    const phoneRE = /^\d{3}-\d{3}-\d{4}$/;

    // Server-side phone validation (only if provided and non-empty)
    if (phone !== undefined) {
      const cleanedPhone = clean(phone) as string | undefined;
      if (cleanedPhone && !phoneRE.test(cleanedPhone)) {
        res.status(400).json({ error: 'Invalid phone format. Use 555-123-4567' });
        return;
      }
    }

    // Start from current values; only overwrite if a non-empty value is provided
    const next = {
      name: user.name,
      phone: user.phone,
      addressStreet: user.addressStreet,
      addressCity: user.addressCity,
      addressState: user.addressState,
      addressZip: user.addressZip,
      spouseName: user.spouseName,
    };

    const candidates: Partial<typeof next> = {
      name: clean(name) as string | undefined,
      phone: clean(phone) as string | undefined,
      addressStreet: clean(addressStreet) as string | undefined,
      addressCity: clean(addressCity) as string | undefined,
      addressState: clean(addressState) as string | undefined,
      addressZip: clean(addressZip) as string | undefined,
      spouseName: clean(spouseName ?? undefined) as string | null | undefined,
    };

    (Object.keys(candidates) as (keyof typeof next)[]).forEach((key) => {
      const val = candidates[key];
      if (val === undefined) return;                      // not provided -> leave as-is
      if (typeof val === 'string' && val.trim() === '') { // empty string -> ignore to protect data
        return;
      }
      (next as any)[key] = val;
    });

    // Detect no-op
    const unchanged =
      next.name === user.name &&
      next.phone === user.phone &&
      next.addressStreet === user.addressStreet &&
      next.addressCity === user.addressCity &&
      next.addressState === user.addressState &&
      next.addressZip === user.addressZip &&
      next.spouseName === user.spouseName;

    if (unchanged) {
      res.status(200).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        addressStreet: user.addressStreet,
        addressCity: user.addressCity,
        addressState: user.addressState,
        addressZip: user.addressZip,
        spouseName: user.spouseName,
        message: 'No changes',
      });
      return;
    }

    // Persist only when there are changes
    user.name = next.name;
    user.phone = next.phone;
    user.addressStreet = next.addressStreet;
    user.addressCity = next.addressCity;
    user.addressState = next.addressState;
    user.addressZip = next.addressZip;
    user.spouseName = next.spouseName;

    await user.save();

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      addressStreet: user.addressStreet,
      addressCity: user.addressCity,
      addressState: user.addressState,
      addressZip: user.addressZip,
      spouseName: user.spouseName
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to update profile';
    res.status(500).json({ error: msg });
  }
}


