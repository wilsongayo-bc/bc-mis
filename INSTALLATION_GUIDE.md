# Authentication Fixes - Installation Guide

## Quick Start

Follow these steps to install and activate the authentication fixes:

### Step 1: Install Backend Dependencies

Navigate to the `api` directory and install required packages:

```bash
cd api
npm install speakeasy qrcode @types/speakeasy @types/qrcode
```

### Step 2: Run Database Migration

The 2FA feature requires new database columns. Run the migration:

**Development:**
```bash
npm run migrate
```

**Production:**
```bash
npm run migrate:prod
```

This will add the following columns to the `users` table:
- `twoFactorSecret` (varchar 255)
- `twoFactorEnabled` (boolean)
- `twoFactorBackupCodes` (json)

### Step 3: Restart the Application

**Development:**
```bash
# In the root directory
npm run dev
```

**Production:**
```bash
# In the api directory
npm run build
npm start
```

### Step 4: Verify Installation

1. **Check Backend Health:**
   - Visit: `http://localhost:3001/api/health`
   - Should return status: "healthy"

2. **Check Frontend:**
   - Visit: `http://localhost:5173` (or your configured port)
   - Log in as admin
   - Navigate to Settings

3. **Verify Features:**
   - ✅ Settings reset button persists changes
   - ✅ Inactivity logout works (test with short timeout)
   - ✅ 2FA setup button appears when enabled

---

## Feature Configuration

### 1. Configure Session Timeout

1. Log in as Admin or SuperAdmin
2. Navigate to **Settings > Authentication Configuration**
3. Set **Session Timeout** (in minutes)
4. Click **Save Changes**

**Recommended Values:**
- Development: 30 minutes
- Production: 15-30 minutes
- High Security: 5-10 minutes

### 2. Enable Two-Factor Authentication

1. Log in as Admin or SuperAdmin
2. Navigate to **Settings > Authentication Configuration**
3. Toggle **Two-Factor Authentication** to ON
4. Click **Save Changes**
5. Click **Setup 2FA** button to configure for your account
6. Scan QR code with authenticator app
7. Enter verification code
8. Save backup codes in a secure location

**Supported Authenticator Apps:**
- Google Authenticator
- Microsoft Authenticator
- Authy
- 1Password
- LastPass Authenticator

### 3. Test Inactivity Logout

1. Set session timeout to 1 minute (for testing)
2. Save changes
3. Remain inactive for 1 minute
4. You should be automatically logged out
5. Reset timeout to desired value

---

## Troubleshooting

### Issue: Migration Fails

**Error:** "Table 'users' doesn't exist"

**Solution:**
```bash
# Ensure database is initialized
npm run migrate
```

### Issue: 2FA Setup Button Not Appearing

**Possible Causes:**
1. 2FA not enabled system-wide
2. User not logged in
3. User already has 2FA enabled

**Solution:**
1. Check Settings > Authentication Configuration
2. Ensure "Two-Factor Authentication" toggle is ON
3. Save changes
4. Refresh page

### Issue: Inactivity Logout Not Working

**Possible Causes:**
1. Session timeout set too high
2. Browser preventing event listeners
3. User activity detected (mouse movements, etc.)

**Solution:**
1. Set timeout to 1 minute for testing
2. Ensure no browser extensions interfering
3. Keep mouse/keyboard completely still

### Issue: QR Code Not Displaying

**Possible Causes:**
1. Backend packages not installed
2. API route not registered
3. Network error

**Solution:**
```bash
# Reinstall packages
cd api
npm install speakeasy qrcode

# Check API logs for errors
npm run dev
```

### Issue: TypeScript Errors

**Error:** "Cannot find module 'speakeasy'"

**Solution:**
```bash
cd api
npm install @types/speakeasy @types/qrcode
```

---

## Verification Checklist

Use this checklist to verify all features are working:

### Settings Reset Persistence
- [ ] Change authentication settings
- [ ] Click "Reset" button
- [ ] Navigate away and return
- [ ] Settings remain at default values

### Inactivity Logout
- [ ] Set timeout to 1 minute
- [ ] Remain inactive for 1 minute
- [ ] Automatically logged out
- [ ] Redirected to login page

### 2FA Setup
- [ ] Enable 2FA system-wide
- [ ] "Setup 2FA" button appears
- [ ] QR code displays correctly
- [ ] Can scan with authenticator app
- [ ] Verification code accepted
- [ ] Backup codes displayed
- [ ] Can download backup codes

### 2FA Login
- [ ] Log out after 2FA setup
- [ ] Log in with username/password
- [ ] Prompted for 2FA code
- [ ] TOTP code from app works
- [ ] Backup code works (single-use)
- [ ] Successfully logged in

---

## Security Best Practices

### For Administrators:

1. **Enable 2FA for all admin accounts**
   - Mandatory for SUPERADMIN and ADMIN roles
   - Recommended for all users with sensitive access

2. **Set appropriate session timeouts**
   - Balance security with user experience
   - Consider user roles and access levels

3. **Educate users about backup codes**
   - Store in password manager
   - Print and store securely
   - Never share with others

4. **Monitor 2FA adoption**
   - Track which users have enabled 2FA
   - Encourage adoption through training

### For Users:

1. **Save backup codes immediately**
   - Download as text file
   - Store in password manager
   - Print and store in safe location

2. **Use reputable authenticator apps**
   - Google Authenticator
   - Microsoft Authenticator
   - Authy (with cloud backup)

3. **Don't share QR codes or secrets**
   - QR code is equivalent to password
   - Secret key should remain private

4. **Test backup codes**
   - Verify at least one backup code works
   - Before relying on 2FA for critical access

---

## Rollback Instructions

If you need to rollback these changes:

### 1. Rollback Database Migration

```bash
cd api
npm run migrate:revert
```

This will remove the 2FA columns from the users table.

### 2. Revert Code Changes

```bash
git revert <commit-hash>
```

Or manually remove/restore files:
- Delete: `api/services/twoFactorService.ts`
- Delete: `api/routes/twoFactor.ts`
- Delete: `src/services/twoFactorService.ts`
- Delete: `src/components/TwoFactorModal.tsx`
- Delete: `src/hooks/useInactivityLogout.ts`
- Restore: Previous versions of modified files

### 3. Remove Dependencies

```bash
cd api
npm uninstall speakeasy qrcode @types/speakeasy @types/qrcode
```

---

## Support and Documentation

### Additional Resources:

- **Full Implementation Details**: See `AUTHENTICATION_FIXES_SUMMARY.md`
- **Project Rules**: `.trae/rules/project_rules.md`
- **Developer Guide**: `docs/developer-guide.md`
- **Technical Manual**: `docs/technical/technical-manual.md`

### Getting Help:

1. Check application logs for errors
2. Review browser console for frontend issues
3. Verify all dependencies installed
4. Ensure database migration completed
5. Check environment variables (JWT_SECRET)

---

## Next Steps

After successful installation:

1. **Test all features** using the verification checklist
2. **Configure settings** according to your security requirements
3. **Enable 2FA** for admin accounts
4. **Train users** on 2FA setup and usage
5. **Monitor adoption** and address any issues

---

**Last Updated**: December 31, 2024
**Version**: 1.0.0
