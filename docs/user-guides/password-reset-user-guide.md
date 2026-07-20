# User Password Reset (Verified Email)

## Purpose
This guide explains how a user can reset their password using a **verified email address**.

If your email is not verified, this feature will not send a reset email. Contact your MIS Administrator for help or verify your email first.

## Step 1 — Open “Forgot Password”
1. Go to the MIS login page.
2. Click **Forgot password?**

**Screenshot Placeholder**
- `Login page → Forgot password link`  
  ![Forgot Password Link](images/user/placeholders/forgot-password-link.png)

## Step 2 — Request a Reset Email
1. Enter your email address.
2. Click **Send Reset Email**.

Expected result:
- If the email is verified and belongs to an active account, you will receive an email with:
  - a **6-digit reset code**
  - a **Reset Password link**

**Screenshot Placeholder**
- `Forgot Password page`  
  ![Forgot Password Page](images/user/placeholders/forgot-password-page.png)

## Step 3 — Check Your Email for the Reset Code + Link
Open your email and locate the message titled **Password Reset - Benedict College**.

You will see:
- Reset Code (6 digits)
- Reset Password button/link

**Screenshot Placeholder**
- `Email message with reset code + link`  
  ![Reset Email](images/user/placeholders/reset-email.png)

## Step 4 — Reset Your Password
1. Click the Reset Password link from the email (opens the reset page).
2. Enter the 6-digit reset code.
3. Enter your new password and confirm it.
4. Click **Reset Password**.

Expected result:
- You will see a success message.
- You can log in using your new password.

**Screenshot Placeholders**
- `Reset Password page (token present)`  
  ![Reset Password Page](images/user/placeholders/reset-password-page.png)
- `Reset success state`  
  ![Reset Password Success](images/user/placeholders/reset-password-success.png)

## Common Issues

### I didn’t receive an email
- Check Spam/Junk folder.
- Confirm you entered the correct email.
- If your email is not verified, a reset email will not be sent. Contact the MIS Administrator.

### “Missing reset token”
- You opened the reset page directly without using the link from the email.
- Use the Reset Password link from the email.

### “Invalid or expired reset token” / “This reset request has expired”
- Reset codes expire after 30 minutes.
- Request a new reset email and try again.

### “Invalid reset code”
- Ensure you entered the exact 6-digit code from the email.
- Too many attempts will require requesting a new reset email.

