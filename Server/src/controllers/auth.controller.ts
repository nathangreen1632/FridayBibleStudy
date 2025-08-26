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
  res.json(req.user);
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
