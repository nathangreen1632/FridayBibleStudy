import type { Request, Response } from 'express';
import dayjs from 'dayjs';
import { User, OtpToken } from '../models/index.js';
import { hashPassword, verifyPassword } from '../utils/passwords.util.js';
import { signJwt } from '../utils/jwt.util.js';
import { env } from '../config/env.config.js';
import { sendEmail } from '../services/email.service.js';
import { anyAdminExists, isBootstrapEmail } from '../services/admin/bootstrap.service.js';

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
  const {name, phone, email, password} = req.body as { name: string; phone: string; email: string; password: string };
  const exists = await User.findOne({where: {email}});
  if (exists) {
    res.status(409).json({error: 'Email already registered'});
    return;
  }
  const passwordHash = await hashPassword(password);
  const user = await User.create({name, phone, email, passwordHash});
  const token = signJwt({userId: user.id, role: user.role});
  setCookie(res, token);

  await sendEmail({
    to: email,
    subject: 'Welcome to Friday Bible Study',
    html: `
  <div style="background-color:#CCDAD1; padding:20px; font-family:Inter, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background-color:#9CAEA9; border-radius:12px; padding:24px; color:#38302E; line-height:1.7; font-size:16px;">

      <style>
        @media (prefers-color-scheme: dark) {
          .fallback-link { color: #ffffff !important; }
        }
      </style>

      <h2 style="margin-top:0; color:#38302E; font-size:22px;">Welcome to Friday Bible Study</h2>

      <p>Hi ${user.name},</p>

      <p>
        Welcome to <strong>Friday Bible Study</strong>! Your account has been created successfully!
      </p>

      <p>
        This program is designed to help you stay connected with your study group. 
        You can add prayer requests, share updates, and celebrate praises together. 
        Everything is organized on boards so you can easily see what’s active, what’s long-term, 
        and what has been moved to praises.
      </p>

      <p>
        The boards use simple drag-and-drop. Click and hold on a prayer card, then drag it to a new spot 
        or into a different list (for example, from Active to Praises). This helps keep everything organized 
        in a way that feels natural and easy.
      </p>

      <p>Once you log in, here are a few things you can do:</p>
      <ul style="padding-left:20px; margin-top:0.5em; margin-bottom:1em;">
        <li><strong>Update your profile</strong> — add your phone, email, address, and spouse name so your group can stay in touch.</li>
        <li><strong>Prayer Board</strong> — post new prayer requests or updates and move them to “Praises” when God answers.</li>
        <li><strong>Categories</strong> — filter by categories such as Prayer, Praise, Long-Term, Salvation, Pregnancy, or Birth.</li>
        <li><strong>Media</strong> — attach photos to requests so your group can walk with you visually.</li>
        <li><strong>Search</strong> — quickly find specific requests or praises you have created to keep them up to date.</li>
      </ul>

      <p style="margin: 1.5em 0; text-align:center;">
        <a href="https://www.fridaybiblestudy.org/login"
           style="display:inline-block; background-color:#00274C; color:#ffffff; 
                  text-decoration:none; padding:14px 24px; border-radius:8px; 
                  font-weight:600; font-size:16px; 
                  width:auto; text-align:center; box-sizing:border-box;">
          Log In to Friday Bible Study
        </a>
      </p>

      <p style="font-size:15px; color:#38302E; margin-top:1em; text-align:center;">
        If the button above doesn’t work, copy and paste this link into your browser:<br>
        <a href="https://www.fridaybiblestudy.org/login" 
           class="fallback-link"
           style="color:#2563EB; font-size:15px; text-decoration:none;">
          https://www.fridaybiblestudy.org/login
        </a>
      </p>

      <p style="margin-top:1em;">
        We’re so glad you’re here. Please log in and take a few minutes to set up your profile so others can connect with you.
      </p>

      <p style="margin-top:1em;">
        Grace and peace,<br>
        <br>
        The Friday Bible Study Team
      </p>

    </div>
  </div>
  `
  });

  res.json({id: user.id, name: user.name, email: user.email, role: user.role});
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ where: { email } });
  if (!user) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) { res.status(401).json({ error: 'Invalid credentials' }); return; }

  try {
    const alreadyHasAdmin = await anyAdminExists();
    if (!alreadyHasAdmin && isBootstrapEmail(user.email)) {
      user.role = 'admin';
      await user.save();
    }
  } catch {

  }

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
  if (!user) { res.json({ ok: true }); return; }

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = dayjs().add(10, 'minute').toDate();
  await OtpToken.create({ userId: user.id, otpHash, expiresAt });

  await sendEmail({
    to: user.email,
    subject: 'Your Friday Bible Study verification code',
    html: `
  <div style="background-color:#CCDAD1; padding:20px; font-family:Inter, sans-serif;">
    <div style="max-width:600px; margin:0 auto; background-color:#9CAEA9; border-radius:12px; padding:24px; color:#38302E; line-height:1.7; font-size:16px;">

      <style>
        @media (prefers-color-scheme: dark) {
          .fallback-link { color: #ffffff !important; }
        }
      </style>

      <h2 style="margin-top:0; color:#38302E; font-size:22px;">Verify your password reset</h2>

      <p>Hi ${user.name},</p>
      <p>Use this one-time code to reset your password. It expires in 10 minutes.</p>

      <p style="margin: 1.25em 0; text-align:center;">
        <span style="
          display:inline-block;
          background-color:#00274C;
          color:#ffffff;
          text-decoration:none;
          padding:14px 24px;
          border-radius:8px;
          font-weight:800;
          font-size:28px;
          letter-spacing:0.25em;
          white-space:nowrap;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
        ">
          ${otp.slice(0,3)}<span style="letter-spacing:0;">-</span>${otp.slice(3)}
        </span>
      </p>

      <p style="font-size:15px; color:#38302E; margin-top:1em; text-align:center;">
        Then open the reset page and enter your code:<br>
        <a href="https://www.fridaybiblestudy.org/reset-password"
           class="fallback-link"
           style="color:#2563EB; font-size:15px; text-decoration:none;">
          https://www.fridaybiblestudy.org/reset-password
        </a>
      </p>

      <p style="margin-top:1em;">If you didn’t request this, you can safely ignore this email.</p>

      <p style="margin-top:1em;">
        Grace and peace,<br>
        <br>
        The Friday Bible Study Team
      </p>

    </div>
  </div>
  `
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

  await token.destroy();

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

    const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
    const phoneRE = /^\d{3}-\d{3}-\d{4}$/;

    if (phone !== undefined) {
      const cleanedPhone = clean(phone) as string | undefined;
      if (cleanedPhone && !phoneRE.test(cleanedPhone)) {
        res.status(400).json({ error: 'Invalid phone format. Use 555-123-4567' });
        return;
      }
    }

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
      if (val === undefined) return;
      if (typeof val === 'string' && val.trim() === '') {
        return;
      }
      (next as any)[key] = val;
    });

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


