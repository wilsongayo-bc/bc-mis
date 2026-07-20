# Custom Domain Setup Guide

## Overview
This guide provides step-by-step instructions for setting up the custom subdomain `mis.benedictcollege.com` to point to your Vercel deployment at `bc-mis.vercel.app`.

## Prerequisites
- Access to your domain registrar's DNS management panel for `benedictcollege.com`
- Access to your Vercel project dashboard
- Current Vercel deployment URL: `bc-mis.vercel.app`

## Step 1: Configure Custom Domain in Vercel

### 1.1 Access Vercel Project Settings
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to your `bc-mis` project
3. Click on the **Settings** tab
4. Select **Domains** from the left sidebar

### 1.2 Add Custom Domain
1. In the "Domains" section, click **Add**
2. Enter your custom domain: `mis.benedictcollege.com`
3. Click **Add** to proceed
4. Vercel will provide DNS configuration instructions

### 1.3 Note DNS Requirements
Vercel will display the required DNS records. Typically, this will be:
- **Type**: CNAME
- **Name**: `mis` (or `mis.benedictcollege.com` depending on your DNS provider)
- **Value**: `cname.vercel-dns.com` (or similar Vercel CNAME target)

## Step 2: Configure DNS Records

### 2.1 Access DNS Management
1. Log into your domain registrar's control panel
2. Navigate to DNS management for `benedictcollege.com`
3. Look for options like "DNS Records", "Zone File", or "DNS Management"

### 2.2 Add CNAME Record
1. Click **Add Record** or **Create New Record**
2. Select **CNAME** as the record type
3. Configure the record:
   - **Name/Host**: `mis`
   - **Value/Target**: Use the CNAME target provided by Vercel (usually `cname.vercel-dns.com`)
   - **TTL**: 300 seconds (5 minutes) for faster propagation, or use default

### 2.3 Save DNS Changes
1. Click **Save** or **Add Record**
2. Confirm the changes in your DNS management panel

## Step 3: Verify Configuration

### 3.1 Check DNS Propagation
Use online tools to verify DNS propagation:
- [DNS Checker](https://dnschecker.org/)
- [What's My DNS](https://www.whatsmydns.net/)

Search for: `mis.benedictcollege.com` with record type `CNAME`

### 3.2 Verify in Vercel
1. Return to your Vercel project's Domains settings
2. The domain status should show as "Valid" once DNS propagates
3. If there are issues, Vercel will display specific error messages

## Step 4: SSL Certificate Setup

### 4.1 Automatic SSL
- Vercel automatically provisions SSL certificates for custom domains
- This process typically takes 5-10 minutes after DNS propagation
- No manual configuration required

### 4.2 Verify SSL
Once the domain is active:
1. Visit `https://mis.benedictcollege.com`
2. Check for the secure lock icon in your browser
3. Verify the certificate is issued by Vercel/Let's Encrypt

## Expected Timeline

| Phase | Duration | Description |
|-------|----------|-------------|
| Vercel Configuration | 2-5 minutes | Adding domain in Vercel dashboard |
| DNS Record Creation | 2-5 minutes | Adding CNAME record to DNS |
| DNS Propagation | 5 minutes - 48 hours | Global DNS propagation (usually 5-30 minutes) |
| SSL Certificate | 5-10 minutes | Automatic SSL provisioning after DNS |
| **Total Time** | **15 minutes - 48 hours** | **Typically complete within 1 hour** |

## Troubleshooting

### Common Issues and Solutions

#### 1. DNS Not Propagating
**Symptoms**: DNS checkers show no CNAME record
**Solutions**:
- Wait longer (up to 48 hours for full propagation)
- Check TTL settings (lower TTL = faster propagation)
- Verify CNAME record syntax is correct
- Contact your DNS provider if issues persist

#### 2. Vercel Shows "Invalid Configuration"
**Symptoms**: Domain shows as invalid in Vercel
**Solutions**:
- Verify CNAME points to correct Vercel target
- Ensure no conflicting A records exist for the subdomain
- Check for typos in domain name or CNAME value

#### 3. SSL Certificate Issues
**Symptoms**: Browser shows security warnings
**Solutions**:
- Wait for automatic SSL provisioning (up to 10 minutes)
- Verify domain is fully propagated first
- Check Vercel domain status for SSL errors

#### 4. 404 Errors on Custom Domain
**Symptoms**: Custom domain loads but shows 404
**Solutions**:
- Verify Vercel deployment is working on `.vercel.app` domain
- Check Vercel project settings for correct branch deployment
- Ensure no redirect rules are interfering

### Verification Commands

Use these commands to troubleshoot DNS issues:

```bash
# Check CNAME record
nslookup mis.benedictcollege.com

# Check DNS propagation
dig mis.benedictcollege.com CNAME

# Test HTTPS connectivity
curl -I https://mis.benedictcollege.com
```

## Testing Checklist

After setup completion, verify:

- [ ] `mis.benedictcollege.com` resolves to Vercel servers
- [ ] HTTPS works without security warnings
- [ ] Application loads correctly on custom domain
- [ ] All functionality works (login, navigation, etc.)
- [ ] Mobile responsiveness maintained
- [ ] Performance is acceptable

## Maintenance Notes

### Regular Monitoring
- Monitor domain expiration dates
- Keep DNS records updated if Vercel requirements change
- Monitor SSL certificate auto-renewal

### Future Considerations
- Consider setting up additional subdomains if needed
- Plan for domain renewal well in advance
- Document any custom configurations for team reference

## Support Resources

### Vercel Documentation
- [Custom Domains Guide](https://vercel.com/docs/concepts/projects/domains)
- [DNS Configuration](https://vercel.com/docs/concepts/projects/domains/dns)

### DNS Providers
- Contact your domain registrar's support for DNS-specific issues
- Most providers offer 24/7 support for DNS configuration

### Emergency Contacts
- Vercel Support: Available through dashboard
- Domain Registrar: Check your provider's support channels

---

## Quick Reference

**Custom Domain**: `mis.benedictcollege.com`  
**Vercel App**: `bc-mis.vercel.app`  
**DNS Record Type**: CNAME  
**DNS Record Name**: `mis`  
**DNS Record Value**: `cname.vercel-dns.com` (verify in Vercel dashboard)

---

*Last Updated: January 2025*  
*Project: Coldea MIS*  
*Environment: Production*