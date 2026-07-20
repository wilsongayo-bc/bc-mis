---
title: "Admin Password Reset (Single + Bulk)"
description: "How admins reset user passwords, force password change, and perform bulk resets"
roles: ["ADMIN", "SUPERADMIN"]
category: "reference"
order: 2
lastUpdated: "2026-07-08"
author: "Documentation Team"
tags: ["admin", "users", "password-reset", "security"]
---

# Admin Password Reset (Single + Bulk) + Forced Password Change

This guide explains how administrators reset user passwords in Coldea MIS. After a reset, the user is required to change their password on next login.

## What happens when you reset a password

- The system sets a new password for the selected user.
- The user account is flagged to require a **mandatory password change** on the next login.
- The user cannot continue normally until they update their password.

## Default password format

When using the default reset option, the system generates a password using this format:

`bc-{last5digits}`

Where `last5digits` comes from the user’s linked identifier:

- Employee ID (preferred, if the user is linked to an employee record)
- Student ID (fallback, if the user is linked to a student record)

Example:

- `bc-00001`

## Single-user reset (User Management)

1. Login as **ADMIN** or **SUPERADMIN**.
2. Open **User Management**.
3. Find the user you want to reset.
4. Click the **Reset Password** action (key icon).
5. Choose one of the options:
   - **Reset to Default** (recommended for standard resets)
   - **Set Custom Password** (if you need to specify a temporary password)
6. Confirm the reset.

Expected result:

- A success message is shown.
- The user must change password on next login.

## Bulk reset (multiple users)

1. Login as **ADMIN** or **SUPERADMIN**.
2. Open **User Management**.
3. Select multiple users using the checkboxes.
4. Click **Reset Passwords** in the bulk actions toolbar.
5. Confirm the bulk reset.

Expected result:

- All selected users are reset to the default password format.
- All selected users are flagged to require a password change on next login.

## How to verify it worked

1. Reset a user password (single or bulk).
2. Logout.
3. Login as the reset user using the new password.
4. Confirm the system forces the user to change password before proceeding.

## Common issues

### “You cannot reset your own password”

Admins cannot reset their own password using the admin reset flow. Use the **Change Password** feature in **Profile → Edit** instead.

### Default password could not be generated

The default password requires a linked Employee ID or Student ID. If the system cannot determine an identifier, use **Set Custom Password** instead.

