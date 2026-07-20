# Vercel Blob Storage Setup Guide

## Issue Description
The logo upload functionality is failing in production because the `BLOB_READ_WRITE_TOKEN` environment variable is not properly configured with an actual Vercel Blob storage token.

## Current Status
- ✅ Code implementation is correct
- ✅ Error handling is improved
- ❌ Missing actual BLOB_READ_WRITE_TOKEN
- ❌ Production environment not configured

## Step-by-Step Solution

### 1. Get Vercel Blob Storage Token

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Login to your account

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Select "Blob" from the storage options

3. **Create or Select Blob Store**
   - If you don't have a blob store: Click "Create Store"
   - If you have one: Select your existing store
   - Store name suggestion: `bc-mis-assets`

4. **Copy the Token**
   - In the store settings, find "Read/Write Token"
   - Copy the token (starts with `vercel_blob_rw_`)

### 2. Update Local Environment

1. **Update .env file**
   ```bash
   # Replace the placeholder with your actual token
   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_YOUR_ACTUAL_TOKEN_HERE
   ```

2. **Restart your development server**
   ```bash
   npm run dev
   ```

### 3. Configure Production Environment

1. **Go to Vercel Project Settings**
   - Visit your project in Vercel Dashboard
   - Go to Settings → Environment Variables

2. **Add/Update BLOB_READ_WRITE_TOKEN**
   - Variable name: `BLOB_READ_WRITE_TOKEN`
   - Value: Your actual token from step 1
   - Environments: Check all (Production, Preview, Development)

3. **Redeploy the Application**
   - Go to Deployments tab
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger deployment

### 4. Test the Fix

1. **Test Locally**
   - Go to Settings page
   - Try uploading a logo
   - Check browser console for any errors

2. **Test in Production**
   - Go to your production URL
   - Navigate to Settings
   - Try uploading a logo
   - Verify the upload works

## Verification Commands

### Check Local Configuration
```bash
# Check if token is set (should not show the actual token)
echo "Token configured: $([ -n "$BLOB_READ_WRITE_TOKEN" ] && echo 'YES' || echo 'NO')"
```

### Check Production Logs
1. Go to Vercel Dashboard → Your Project → Functions
2. Look for `/api/settings/logo` function
3. Check recent invocations for error details

## Expected Results

### Before Fix
- Error: "Server error. Please try again later."
- Console logs: "BLOB_READ_WRITE_TOKEN is not configured"

### After Fix
- Logo uploads successfully
- New logo appears immediately
- No console errors
- Blob URL format: `https://[hash].public.blob.vercel-storage.com/[filename]`

## Troubleshooting

### Common Issues

1. **Token still not working**
   - Verify token is copied completely
   - Check for extra spaces or characters
   - Ensure token starts with `vercel_blob_rw_`

2. **Production not updating**
   - Force redeploy the application
   - Clear Vercel cache if needed
   - Check environment variable is set for Production

3. **File upload still failing**
   - Check file size (must be < 2MB)
   - Verify file type (JPEG, PNG, SVG only)
   - Check network connectivity

### Debug Information
With the improved error logging, you'll now see detailed error information including:
- Token configuration status
- File details
- Specific error messages
- Environment information

## Security Notes

- Never commit the actual token to version control
- Keep the token secure and don't share it
- Rotate the token if compromised
- Use environment variables for all deployments

---

**Next Steps**: Follow the steps above to get your actual Vercel Blob token and configure it in both local and production environments.