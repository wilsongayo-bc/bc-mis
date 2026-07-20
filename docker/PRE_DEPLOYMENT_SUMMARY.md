# 🚀 Benedict College MIS VPS Deployment - Complete Pre-Deployment Guide

## ✅ Prerequisites Summary

Before deploying Benedict College MIS on your Vultr VPS, ensure you have completed these essential prerequisites:

### 🔧 System Requirements (MUST HAVE)
- **✅ VPS Specs**: 4 vCPUs, 8GB RAM, 160GB SSD (your current specs)
- **✅ OS**: Ubuntu 20.04+ or Debian 11+ (freshly installed)
- **✅ Network**: 1Gbps connection with static IP
- **✅ Access**: SSH access with sudo privileges

### 📋 Essential Pre-Deployment Checklist

#### 1. System Preparation (5 minutes)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git unzip tar nano htop net-tools ufw fail2ban
```

#### 2. Docker Installation (3 minutes)
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### 3. Security Setup (2 minutes)
```bash
# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### 4. Verification (1 minute)
```bash
# Check versions
docker --version
docker-compose --version
sudo ufw status

# IMPORTANT: Log out and back in for Docker group changes
echo "Please log out and SSH back in before continuing"
```

### 🔍 Run System Verification

After completing the prerequisites, run the comprehensive system check:

```bash
# Download and run verification script
wget -O check-prerequisites.sh https://raw.githubusercontent.com/your-repo/bc-mis/main/scripts/check-prerequisites.sh
chmod +x check-prerequisites.sh
./check-prerequisites.sh --domain your-domain.com
```

**Expected Results:**
- ✅ All system requirements met
- ✅ Docker and Docker Compose installed
- ✅ Firewall configured
- ✅ No critical issues

### 🌐 Domain Setup (Optional but Recommended)

If you have a domain:
1. **A Record**: Point `your-domain.com` to your VPS IP
2. **WWW Record**: Point `www.your-domain.com` to your VPS IP
3. **Verify**: `dig +short your-domain.com`

### 📊 Resource Allocation

Your Vultr VPS (4 vCPUs, 8GB RAM, 160GB SSD) will be allocated as:
- **MySQL Database**: ~2GB RAM, 20GB storage
- **Node.js API**: ~1GB RAM, 1GB storage
- **Nginx Proxy**: ~100MB RAM, 100MB storage
- **System/OS**: ~2GB RAM, 5GB storage
- **Buffer/Cache**: ~3GB RAM remaining

### 🚀 Ready for Deployment

Once all prerequisites are verified, proceed with deployment:

#### Option 1: Automated Deployment (Recommended)
```bash
# Run the complete deployment script
wget -O deploy.sh https://raw.githubusercontent.com/your-repo/bc-mis/main/scripts/deploy-vps.sh
chmod +x deploy.sh
./deploy.sh
```

#### Option 2: Manual Deployment
```bash
# Clone repository
git clone https://github.com/your-repo/bc-mis.git /opt/bc-mis
cd /opt/bc-mis

# Configure environment
cp docker/.env.vps-example .env.production
nano .env.production  # Update with your settings

# Deploy services
docker-compose -f docker-compose.prod.yml up -d

# Initialize production data
./scripts/init-production.sh
```

### 🔒 Post-Deployment SSL Setup

If you have a domain:
```bash
# Set up SSL with Let's Encrypt
./scripts/setup-ssl.sh your-domain.com
```

### 📱 Frontend Configuration

Update your Vercel frontend:
1. Go to Vercel dashboard → Settings → Environment Variables
2. Add: `VITE_API_BASE_URL=https://your-domain.com/api`
3. Redeploy your frontend

## ⚠️ Common Issues to Avoid

### ❌ Don't Skip These Steps:
1. **Docker group membership** - Log out/in after adding user to docker group
2. **Firewall configuration** - Essential for security
3. **System updates** - Always update before installing Docker
4. **Port conflicts** - Ensure ports 80, 443, 3000, 3306 are available

### 🔧 Quick Fixes for Common Problems:

**Docker Permission Issues:**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Port Conflicts:**
```bash
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443
sudo systemctl stop apache2 nginx mysql  # Stop conflicting services
```

**Memory Issues:**
```bash
free -h  # Check available memory
df -h    # Check disk space
```

## 📈 Performance Expectations

With your VPS specs, expect:
- **Concurrent Users**: 1000+
- **Database Performance**: < 100ms queries
- **API Response Time**: < 200ms
- **File Upload**: Up to 100MB
- **Backup Time**: < 5 minutes
- **SSL Handshake**: < 50ms

## 🎯 Success Indicators

✅ **Ready for Deployment:**
- System check passes with no critical errors
- Docker and Docker Compose working
- Firewall active with correct ports
- Domain DNS configured (if applicable)
- All prerequisites verified

✅ **Successful Deployment:**
- All containers running (`docker ps`)
- API health check: `https://your-domain.com/api/health`
- Database connectivity verified
- SSL certificate active (if domain configured)
- Default admin account created

## 📞 Support Resources

If you encounter issues:
1. **Check logs**: `docker-compose -f docker-compose.prod.yml logs`
2. **Run system check**: `./scripts/check-prerequisites.sh`
3. **Check service status**: `docker ps -a`
4. **Verify resources**: `free -h && df -h`
5. **Review deployment guide**: `docker/VPS_DEPLOYMENT_GUIDE.md`

---

**🎉 You're ready to deploy when:**
- All prerequisites are ✅ completed
- System verification shows no critical errors
- You have your domain configured (optional)
- You've logged out/in after Docker installation

**Total preparation time: 10-15 minutes**

Ready to proceed with deployment? 🚀