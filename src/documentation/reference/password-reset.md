---
title: "Password Reset (Verified Email)"
description: "How users can reset their password using their verified email address (code + reset link)."
roles: ["SUPERADMIN","ADMIN","REGISTRAR","FINANCE","LIBRARIAN","STAFF","TEACHER","STUDENT"]
category: "reference"
order: 30
---

## Overview
Users can reset their password without admin assistance using a **verified email address**.

The reset flow sends:
- A **Reset Password link**
- A **6-digit reset code**

Both are required to set a new password.

## Step 1 — Open “Forgot Password”
1. Go to the Login page.
2. Click **Forgot password?**

## Step 2 — Request Reset Email
1. Enter your email address.
2. Click **Send Reset Email**.

If the email is verified and belongs to an active account, you will receive an email shortly.

## Step 3 — Open Email and Copy the Code
Look for the email titled **Password Reset - Benedict College**.

You will see:
- Reset Code (6 digits)
- Reset Password link

## Step 4 — Reset Your Password
1. Open the Reset Password link (this includes the reset token).
2. Enter the 6-digit reset code.
3. Enter and confirm your new password.
4. Click **Reset Password**.

After success, log in using your new password.

## Common Issues
### No email received
- Check Spam/Junk folder.
- Verify the email address is correct.
- If your email is not verified, you will not receive a reset email. Contact the MIS Administrator or verify your email first.

### Missing reset token
- The reset page must be opened using the link from the email.

### Expired reset request
- Reset links/codes expire after 30 minutes. Request a new reset email and try again.

