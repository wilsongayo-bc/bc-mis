import nodemailer from 'nodemailer';

/**
 * Two-Factor Authentication Service
 * Implements Email-based 2FA only
 */

// In-memory store for verification codes (in production, use Redis or database)
interface VerificationCode {
  code: string;
  expiresAt: Date;
  attempts: number;
}

const verificationCodes = new Map<string, VerificationCode>();

// Code expiration time (5 minutes)
const CODE_EXPIRATION_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

/**
 * Generate a random 6-digit verification code
 */
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Store verification code for a user
 */
export const storeVerificationCode = (userId: string, code: string): void => {
  verificationCodes.set(userId, {
    code,
    expiresAt: new Date(Date.now() + CODE_EXPIRATION_MS),
    attempts: 0
  });
  
  console.log(`🔐 2FA Code stored for user ${userId}: ${code} (expires in 5 minutes)`);
  console.log(`📊 Total codes in memory: ${verificationCodes.size}`);
  
  // Auto-cleanup after expiration
  setTimeout(() => {
    verificationCodes.delete(userId);
    console.log(`🗑️  2FA Code expired and deleted for user ${userId}`);
  }, CODE_EXPIRATION_MS);
};

/**
 * Verify a code for a user
 */
export const verifyCode = (userId: string, code: string): { valid: boolean; message?: string } => {
  console.log(`🔍 Verifying code for user ${userId}`);
  console.log(`📊 Codes in memory: ${verificationCodes.size}`);
  console.log(`🔑 Received code: ${code}`);
  
  const stored = verificationCodes.get(userId);
  
  if (!stored) {
    console.log(`❌ No code found in memory for user ${userId}`);
    return { valid: false, message: 'No verification code found. Please request a new code.' };
  }
  
  console.log(`✅ Found stored code: ${stored.code}`);
  console.log(`⏰ Expires at: ${stored.expiresAt}`);
  console.log(`🔢 Attempts: ${stored.attempts}/${MAX_ATTEMPTS}`);
  
  if (new Date() > stored.expiresAt) {
    verificationCodes.delete(userId);
    console.log(`❌ Code expired`);
    return { valid: false, message: 'Verification code has expired. Please request a new code.' };
  }
  
  if (stored.attempts >= MAX_ATTEMPTS) {
    verificationCodes.delete(userId);
    console.log(`❌ Too many attempts`);
    return { valid: false, message: 'Too many failed attempts. Please request a new code.' };
  }
  
  stored.attempts++;
  
  if (stored.code !== code) {
    console.log(`❌ Code mismatch: expected ${stored.code}, got ${code}`);
    return { valid: false, message: 'Invalid verification code. Please try again.' };
  }
  
  // Code is valid, remove it
  verificationCodes.delete(userId);
  console.log(`✅ Code verified successfully!`);
  return { valid: true };
};

/**
 * Send verification code via Email
 */
export const sendEmailCode = async (email: string, code: string, userName: string): Promise<void> => {
  // Use SMTP_* vars as primary (consistent with emailService.ts), MAIL_* as fallback
  const SMTP_HOST = process.env.SMTP_HOST || process.env.MAIL_HOST || 'smtp.gmail.com';
  const SMTP_PORT = process.env.SMTP_PORT || process.env.MAIL_PORT || '587';
  const SMTP_SECURE = process.env.SMTP_SECURE || process.env.MAIL_SECURE;
  const SMTP_USER = process.env.SMTP_USER || process.env.MAIL_USER;
  const SMTP_PASS = process.env.SMTP_PASS || process.env.MAIL_PASSWORD;

  // Configure email transporter
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT),
    secure: SMTP_SECURE === 'true',
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || '"Benedict College" <noreply@benedictcollege.edu.ph>',
    to: email,
    subject: 'Your Two-Factor Authentication Code',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .code-box { background-color: white; border: 2px solid #2563eb; border-radius: 5px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb; }
          .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 5px 5px; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 10px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Two-Factor Authentication</h1>
          </div>
          <div class="content">
            <p>Hello ${userName},</p>
            <p>You are attempting to log in to your Benedict College MIS account. Please use the verification code below to complete your login:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <p><strong>This code will expire in 5 minutes.</strong></p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong> If you did not attempt to log in, please ignore this email and contact your administrator immediately.
            </div>
            
            <p>For security reasons, never share this code with anyone.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Benedicto College MIS. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Benedict0 College. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hello ${userName},

You are attempting to log in to your Benedict College MIS account.

Your verification code is: ${code}

This code will expire in 5 minutes.

If you did not attempt to log in, please ignore this email and contact your administrator immediately.

For security reasons, never share this code with anyone.

---
This is an automated message from Benedicto College MIS.
© ${new Date().getFullYear()} Benedicto College. All rights reserved.
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ 2FA email sent to ${email}`);
  } catch (error) {
    console.error('❌ Failed to send 2FA email:', error);
    throw new Error('Failed to send verification email. Please try again or contact support.');
  }
};

/**
 * Clean up expired codes (run periodically)
 */
export const cleanupExpiredCodes = (): void => {
  const now = new Date();
  for (const [userId, data] of verificationCodes.entries()) {
    if (now > data.expiresAt) {
      verificationCodes.delete(userId);
    }
  }
};

// Run cleanup every minute
setInterval(cleanupExpiredCodes, 60000);
