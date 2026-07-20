import express, { Response } from 'express';
import crypto from 'crypto';
import { MoreThan } from 'typeorm';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { EmailVerificationRequest } from '../entities/EmailVerificationRequest';
import { emailService } from '../services/emailService';

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
  const pepper = process.env.EMAIL_VERIFICATION_PEPPER || process.env.JWT_SECRET;
  if (!pepper) {
    throw new Error('Missing EMAIL_VERIFICATION_PEPPER/JWT_SECRET');
  }
  return pepper;
};

const sha256Hex = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

const hashToken = (token: string): string => sha256Hex(`${token}:${getPepper()}`);

const hashCode = (code: string, tokenHash: string): string => sha256Hex(`${code}:${getPepper()}:${tokenHash}`);

router.post('/email-verification/send', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const userRepo = AppDataSource.getRepository(User);
    const requestRepo = AppDataSource.getRepository(EmailVerificationRequest);

    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
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
        const waitSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds}s before requesting another verification email.`
        });
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
      return res.status(429).json({
        success: false,
        message: 'Too many verification emails requested. Please try again later.'
      });
    }

    await requestRepo
      .createQueryBuilder()
      .update(EmailVerificationRequest)
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
    const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    const emailSent = await emailService.sendEmail({
      to: user.email,
      subject: 'Verify your email address - Benedict College',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db;">Email Verification</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>Use the verification code below and open the link to verify your email address.</p>
          <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <div style="font-size: 12px; color: #6b7280; margin-bottom: 6px;">Verification Code</div>
            <div style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${code}</div>
          </div>
          <p>
            <a href="${verifyUrl}" style="display: inline-block; background-color: #1a56db; color: #ffffff; text-decoration: none; padding: 10px 14px; border-radius: 6px;">
              Verify Email
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280;">
            This code will expire in 30 minutes. If you did not request this, you can ignore this email.
          </p>
        </div>
      `
    });

    return res.json({
      success: true,
      message: 'Verification email sent',
      data: {
        emailSent,
        expiresAt
      }
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return res.status(500).json({ success: false, message: 'Failed to send verification email' });
  }
});

export default router;
