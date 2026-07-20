import express, { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { MoreThan } from 'typeorm';
import { AppDataSource } from '../config/database';
import { PasswordResetRequest } from '../entities/PasswordResetRequest';
import { User } from '../entities/User';
import { emailService } from '../services/emailService';
import { validatePassword } from '../middleware/authConfig';

const router = express.Router();

const resolveFrontendUrl = (): string => {
  const isProd = process.env.NODE_ENV === 'production';
  const candidates: Array<string | undefined> = [
    process.env.FRONTEND_URL,
    process.env.PUBLIC_FRONTEND_URL,
    process.env.DEFAULT_FRONTEND_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  ];

  const fromList = (value?: string): string | undefined => {
    if (!value) return undefined;
    const first = value
      .split(',')
      .map(v => v.trim())
      .find(v => v.startsWith('http://') || v.startsWith('https://'));
    return first;
  };

  candidates.push(fromList(process.env.ALLOWED_ORIGINS));
  candidates.push(fromList(process.env.CORS_ORIGIN));

  const chosen = candidates.find(v => {
    if (typeof v !== 'string') return false;
    const trimmed = v.trim();
    if (!trimmed) return false;
    if (!isProd) return true;
    return !/(localhost|127\.0\.0\.1)/i.test(trimmed);
  });
  if (!chosen) {
    return isProd ? 'https://mis.benedictcollege.com' : 'http://localhost:5173';
  }

  return chosen.replace(/\/$/, '');
};

const getPepper = (): string => {
  const pepper = process.env.PASSWORD_RESET_PEPPER || process.env.JWT_SECRET;
  if (!pepper) {
    throw new Error('Missing PASSWORD_RESET_PEPPER/JWT_SECRET');
  }
  return pepper;
};

const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const hashToken = (token: string): string => sha256Hex(`${token}:${getPepper()}`);

const hashCode = (code: string, tokenHash: string): string => sha256Hex(`${code}:${getPepper()}:${tokenHash}`);

router.post('/request', async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const requestRepo = AppDataSource.getRepository(PasswordResetRequest);

    const user = await userRepo.findOne({ where: { email } });

    const genericResponse = {
      success: true,
      message: 'If your email is verified, you will receive a password reset email shortly.'
    };

    if (!user || !user.isActive || !user.isEmailVerified) {
      return res.json(genericResponse);
    }

    const now = new Date();

    const latest = await requestRepo.findOne({
      where: { userId: user.id },
      order: { createdAt: 'DESC' }
    });

    if (latest) {
      const cooldownMs = 60_000;
      const elapsed = now.getTime() - new Date(latest.createdAt).getTime();
      if (elapsed < cooldownMs) {
        return res.json(genericResponse);
      }
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const countLastHour = await requestRepo.count({
      where: {
        userId: user.id,
        createdAt: MoreThan(oneHourAgo)
      }
    });

    if (countLastHour >= 3) {
      return res.json(genericResponse);
    }

    await requestRepo
      .createQueryBuilder()
      .update(PasswordResetRequest)
      .set({ usedAt: now })
      .where('userId = :userId', { userId: user.id })
      .andWhere('usedAt IS NULL')
      .andWhere('expiresAt > :now', { now })
      .execute();

    const token = crypto.randomBytes(32).toString('hex');
    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

    const tokenHash = hashToken(token);
    const codeHash = hashCode(code, tokenHash);
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);

    const request = requestRepo.create({
      userId: user.id,
      email: user.email,
      tokenHash,
      codeHash,
      expiresAt,
      usedAt: null,
      attemptCount: 0
    });

    await requestRepo.save(request);

    const frontendUrl = resolveFrontendUrl();
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset - Benedict College',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db;">Password Reset</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>Use the code below and open the link to reset your password.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Reset Code</div>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</div>
          </div>
          <p>
            <a href="${resetUrl}" style="display: inline-block; background-color: #1a56db; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">
              Reset Password
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">
            This code will expire in 30 minutes. If you did not request this, you can ignore this email.
          </p>
        </div>
      `
    });

    return res.json(genericResponse);
  } catch (error) {
    console.error('Error requesting password reset:', error);
    return res.status(500).json({ success: false, message: 'Failed to request password reset' });
  }
});

router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!token || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'Token, code, and newPassword are required' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Invalid code format' });
    }

    const passwordValidation = await validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, message: passwordValidation.message });
    }

    const tokenHash = hashToken(token);
    const requestRepo = AppDataSource.getRepository(PasswordResetRequest);
    const userRepo = AppDataSource.getRepository(User);

    const request = await requestRepo.findOne({ where: { tokenHash } });
    if (!request) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const now = new Date();
    if (request.usedAt) {
      return res.status(400).json({ success: false, message: 'This reset request has already been used' });
    }

    if (new Date(request.expiresAt).getTime() <= now.getTime()) {
      return res.status(400).json({ success: false, message: 'This reset request has expired' });
    }

    if (request.attemptCount >= 10) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new password reset email.' });
    }

    const expectedCodeHash = hashCode(code, request.tokenHash);
    if (expectedCodeHash !== request.codeHash) {
      request.attemptCount += 1;
      await requestRepo.save(request);
      return res.status(400).json({ success: false, message: 'Invalid reset code' });
    }

    const user = await userRepo.findOne({ where: { id: request.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email !== request.email) {
      return res.status(400).json({ success: false, message: 'Email address has changed. Please request a new password reset email.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is inactive. Please contact your administrator.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ success: false, message: 'Email is not verified. Please verify your email first.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await AppDataSource.transaction(async (manager) => {
      const txRequestRepo = manager.getRepository(PasswordResetRequest);
      const txUserRepo = manager.getRepository(User);

      await txRequestRepo.update({ id: request.id }, { usedAt: now });
      await txUserRepo.update(
        { id: user.id },
        {
          password: hashedPassword,
          mustChangePassword: false
        }
      );
    });

    return res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error confirming password reset:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

export default router;
