import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { AppDataSource } from '../config/database';
import { EmailVerificationRequest } from '../entities/EmailVerificationRequest';
import { User } from '../entities/User';

const router = express.Router();

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

router.post('/verify', async (req: Request, res: Response) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';

    if (!token || !code) {
      return res.status(400).json({ success: false, message: 'Token and code are required' });
    }

    const tokenHash = hashToken(token);
    const requestRepo = AppDataSource.getRepository(EmailVerificationRequest);
    const userRepo = AppDataSource.getRepository(User);

    const request = await requestRepo.findOne({ where: { tokenHash } });
    if (!request) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    const now = new Date();
    if (request.usedAt) {
      return res.status(400).json({ success: false, message: 'This verification request has already been used' });
    }

    if (new Date(request.expiresAt).getTime() <= now.getTime()) {
      return res.status(400).json({ success: false, message: 'This verification request has expired' });
    }

    if (request.attemptCount >= 10) {
      return res.status(429).json({ success: false, message: 'Too many attempts. Please request a new verification email.' });
    }

    const expectedCodeHash = hashCode(code, request.tokenHash);
    if (expectedCodeHash !== request.codeHash) {
      request.attemptCount += 1;
      await requestRepo.save(request);
      return res.status(400).json({ success: false, message: 'Invalid verification code' });
    }

    const user = await userRepo.findOne({ where: { id: request.userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.email !== request.email) {
      return res.status(400).json({ success: false, message: 'Email address has changed. Please request a new verification email.' });
    }

    await AppDataSource.transaction(async (manager) => {
      const txRequestRepo = manager.getRepository(EmailVerificationRequest);
      const txUserRepo = manager.getRepository(User);

      await txRequestRepo.update({ id: request.id }, { usedAt: now });
      await txUserRepo.update(
        { id: user.id },
        {
          isEmailVerified: true,
          emailVerifiedAt: now
        }
      );
    });

    return res.json({
      success: true,
      message: 'Email verified successfully',
      data: { verified: true }
    });
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify email' });
  }
});

export default router;

