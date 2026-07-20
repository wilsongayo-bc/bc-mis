import nodemailer from 'nodemailer';

// Interface for email options
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string; // Plain text fallback
}

class EmailService {
  private transporter: nodemailer.Transporter;
  private isConfigured: boolean = false;

  constructor() {
    // Check if required environment variables are present
    // Support both SMTP_* and EMAIL_* / MAIL_* variable names for backward compatibility
    const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || process.env.MAIL_HOST;
    const SMTP_PORT = process.env.SMTP_PORT || process.env.EMAIL_PORT || process.env.MAIL_PORT;
    const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.MAIL_USER;
    const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.MAIL_PASSWORD;

    if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: parseInt(SMTP_PORT, 10),
        secure: parseInt(SMTP_PORT, 10) === 465, // true for 465, false for other ports
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      });
      this.isConfigured = true;
      console.log('✅ Email service configured with SMTP settings');
    } else {
      console.warn('⚠️ Email service not fully configured. Missing SMTP environment variables.');
      console.warn('⚠️ Required: SMTP_HOST (or EMAIL_HOST), SMTP_PORT (or EMAIL_PORT), SMTP_USER (or EMAIL_USER), SMTP_PASS (or EMAIL_PASS)');
      // Initialize with a dummy transporter to prevent crashes, but it won't send
      this.transporter = nodemailer.createTransport({
        jsonTransport: true
      });
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.isConfigured) return false;
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection established successfully');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
      return false;
    }
  }

  /**
   * Send a generic email
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured) {
      console.log(`📧 [Mock Email] To: ${options.to} | Subject: ${options.subject}`);
      return false;
    }

    try {
      const from = process.env.SMTP_FROM || '"Benedict College" <noreply@benedictcollege.edu.ph>';

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Simple strip tags for text fallback
      });

      console.log(`📧 Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}:`, error);
      return false;
    }
  }

  /**
   * Send pre-listing confirmation to student
   */
  async sendPreListingConfirmation(studentData: {
    firstName: string;
    lastName: string;
    email: string;
    studentId?: string; // Temporary ID if available
    referenceNumber?: string; // If you have one
  }): Promise<boolean> {
    const subject = 'Pre-Listing Registration Confirmation - Benedict College';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Pre-Listing Registration Received</h2>
        <p>Dear ${studentData.firstName} ${studentData.lastName},</p>
        <p>Thank you for submitting your pre-listing registration form to Benedict College.</p>
        <p>We have received your information and your application is currently under review by our Registrar's Office.</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Next Steps:</h3>
          <ol>
            <li>Our team will verify your submitted information and documents.</li>
            <li>You will receive another notification once your application has been processed.</li>
            <li>If any additional information is needed, we will contact you via this email address.</li>
          </ol>
        </div>

        <p>If you have any questions, please contact the Registrar's Office.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;

    return this.sendEmail({
      to: studentData.email,
      subject,
      html
    });
  }

  /**
   * Send notification to admin about new pre-listing
   */
  async sendNewPreListingNotificationToAdmin(studentData: {
    firstName: string;
    lastName: string;
    email: string;
    course?: string;
    yearLevel?: string;
  }): Promise<boolean> {
    // In a real app, you might fetch admin emails from DB or env
    const adminEmail = process.env.ADMIN_EMAIL_NOTIFICATIONS;

    if (!adminEmail) return false;

    const subject = `New Pre-Listing Application: ${studentData.lastName}, ${studentData.firstName}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">New Pre-Listing Application</h2>
        <p>A new student has submitted a pre-listing form.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Name:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${studentData.lastName}, ${studentData.firstName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${studentData.email}</td>
          </tr>
          ${studentData.course ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Course:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${studentData.course}</td>
          </tr>
          ` : ''}
          ${studentData.yearLevel ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Year Level:</td>
            <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${studentData.yearLevel}</td>
          </tr>
          ` : ''}
        </table>

        <p><a href="${process.env.FRONTEND_URL || '#'}/admin/students" style="background-color: #1a56db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Applications</a></p>
      </div>
    `;

    return this.sendEmail({
      to: adminEmail,
      subject,
      html
    });
  }

  // Dweezil's Code - Send student account credentials
  /**
   * Send student account credentials after registration
   */
  async sendStudentCredentials(studentData: {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    password: string;
    studentId?: string;
  }): Promise<boolean> {
    const subject = 'Your Student Account Credentials - Benedict College';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a56db;">Welcome to Benedict College!</h2>
        <p>Dear ${studentData.firstName} ${studentData.lastName},</p>
        <p>Your student account has been successfully created. You can now access the student portal using the credentials below:</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1a56db;">Login Credentials</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 8px; font-weight: bold;">Student ID:</td>
              <td style="padding: 8px;">${studentData.studentId || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Username:</td>
              <td style="padding: 8px;">${studentData.username}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Email:</td>
              <td style="padding: 8px;">${studentData.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold;">Temporary Password:</td>
              <td style="padding: 8px; font-family: monospace; background-color: #fff; padding: 8px; border-radius: 4px;">${studentData.password}</td>
            </tr>
          </table>
        </div>

        <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;"><strong>Important Security Notice:</strong></p>
          <p style="margin: 10px 0 0 0; color: #92400e;">Please change your password immediately after your first login for security purposes.</p>
        </div>

        <div style="margin: 30px 0;">
          <p><a href="${process.env.FRONTEND_URL || 'https://benedictcollege.com'}/login" style="background-color: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Login to Student Portal</a></p>
        </div>

        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Next Steps:</h3>
          <ol style="margin: 10px 0;">
            <li>Log in to the student portal using your credentials</li>
            <li>Complete your profile information</li>
            <li>Review your course enrollment</li>
            <li>Check your class schedule</li>
          </ol>
        </div>

        <p>If you have any questions or need assistance, please contact the Registrar's Office or IT Support.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
        <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
        <p style="font-size: 12px; color: #6b7280;">For security reasons, please do not share your login credentials with anyone.</p>
      </div>
    `;

    return this.sendEmail({
      to: studentData.email,
      subject,
      html
    });
  }
}

export const emailService = new EmailService();
