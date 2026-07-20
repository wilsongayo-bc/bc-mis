# Admin Password Reset (Single + Bulk) + Forced Password Change

## Purpose
This guide explains how MIS Administrators can reset user passwords using:
- A **single-user password reset** (default or custom password)
- A **bulk password reset** for multiple selected users

After any reset, the user is required to **change their password on next login**.

## Who Can Use This Feature
- `ADMIN`
- `SUPERADMIN`

## Default Password Format
When using “Reset to Default”, the system generates:

`bc-{last5digits}`

Where `last5digits` is taken from the user’s linked identifier:
- Employee accounts: **Employee ID** (preferred)
- Student accounts: **Student ID**

Examples:
- Employee ID ending in `00001` → `bc-00001`
- Student/Employee ID containing digits ending in `123` → `bc-00123` (left-padded to 5 digits)

## Prerequisites / Data Requirements
For “Reset to Default” to work:
- The user must be linked to either:
  - an Employee record with an `employeeId`, or
  - a Student record with a `studentId`
- If no identifier is linked, the system will block default reset and return an error.

## Single-User Password Reset

### Reset to Default (Recommended)
1. Login as `ADMIN` or `SUPERADMIN`.
2. Go to **User Management**.
3. Find the user and click the **Key icon** (Reset Password).
4. Keep **Set custom password instead of default** unchecked.
5. Click **Reset to Default**.

Expected result:
- The password is reset to `bc-{last5digits}`.
- The user will be forced to change password on next login.

**Screenshot Placeholder**
- `User Management → Reset Password modal (default reset)`  
  ![Reset Password Modal - Default](images/admin/placeholders/password-reset-default.png)

### Reset to a Custom Password (Optional)
Use this when you need to set a temporary password that is not derived from employee/student ID.

1. Login as `ADMIN` or `SUPERADMIN`.
2. Go to **User Management**.
3. Click the **Key icon** for the user.
4. Check **Set custom password instead of default**.
5. Enter the new password.
6. Click **Reset Password**.

Expected result:
- The password is set to the custom value.
- The user will still be forced to change password on next login.

**Screenshot Placeholder**
- `Reset Password modal (custom password enabled)`  
  ![Reset Password Modal - Custom](images/admin/placeholders/password-reset-custom.png)

## Bulk Password Reset (Selected Users)
This resets passwords for multiple users at once to their default values and forces password change on next login.

1. Login as `ADMIN` or `SUPERADMIN`.
2. Go to **User Management**.
3. Select multiple users using the checkboxes in the table.
4. In the bulk actions toolbar, click **Reset Passwords**.
5. Confirm the action.

Expected result:
- Each selected user with a valid identifier gets reset to `bc-{last5digits}`.
- Users missing an identifier will be reported as failures.
- All successful resets set “must change password” on next login.

**Screenshot Placeholders**
- `User list with multiple users selected`  
  ![Bulk Selection](images/admin/placeholders/password-reset-bulk-selection.png)
- `Bulk action toolbar → Reset Passwords`  
  ![Bulk Reset Action](images/admin/placeholders/password-reset-bulk-action.png)
- `Bulk confirmation modal`  
  ![Bulk Reset Confirm](images/admin/placeholders/password-reset-bulk-confirm.png)

## What Users Will Experience After a Reset
1. The user logs in normally (using the default or custom password you set).
2. The system redirects the user to **Edit Profile** to change password.
3. The user must successfully change the password to continue using the system normally.

**Screenshot Placeholder**
- `Forced password change banner on Edit Profile`  
  ![Must Change Password Banner](images/admin/placeholders/must-change-password-banner.png)

## Troubleshooting

### “No employee/student identifier found…”
Cause:
- The user account is not linked to an Employee or Student record (or the identifier field is empty).

Fix:
- Link the user to the correct Employee/Student record (or ensure the identifier exists), then retry “Reset to Default”.

### Bulk reset shows partial failures
Cause:
- Some users may be missing identifiers or are outside your manageable role scope.

Fix:
- Review which users failed in the response (admin logs / API response), fix identifiers/roles, then retry for only the affected users.

### User cannot proceed after login
Cause:
- User is required to change password but has not completed the password update successfully.

Fix:
- Instruct the user to open **Edit Profile → Change Password** and complete the update.

## Security and Operational Notes
- Do not send passwords via public channels (group chats, social media, etc.). Prefer a private channel.
- The default password format is predictable; treat it as a short-lived credential.
- Encourage users to choose a strong password immediately after the forced change.

