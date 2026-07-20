# Benedict College MIS VPS Pre-Deployment Requirements

This document outlines all prerequisites and requirements for deploying Benedict College MIS on a Vultr VPS.

## 🎯 Minimum System Requirements

### Hardware Specifications
- **CPU**: 4 vCPUs (minimum)
- **RAM**: 8GB (minimum, 16GB recommended)
- **Storage**: 160GB SSD (minimum, 50GB available space)
- **Network**: 1Gbps connection

### Operating System
- **Recommended**: Ubuntu 20.04 LTS or 22.04 LTS
- **Alternative**: Debian 11+, CentOS 8+, Rocky Linux 8+
- **Architecture**: x86_64 (64-bit)

## 📋 Pre-Installation Checklist

### 1. System Updates
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Check system version
lsb_release -a
uname -a
```

### 2. Essential Dependencies
```bash
# Install basic utilities
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    tar \
    nano \
    htop \
    net-tools \
    ufw \
    fail2ban
```

### 3. Docker Installation
```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose (Plugin V2)
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

**Important**: Log out and log back in for Docker group changes to take effect.

### 4. Network Configuration

#### Firewall Setup
```bash
# Enable UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Check status
sudo ufw status verbose
```

#### Port Requirements
| Port | Protocol | Service | Direction |
|------|----------|---------|-----------|
| 22 | TCP | SSH | Inbound |
| 80 | TCP | HTTP | Inbound |
| 443 | TCP | HTTPS | Inbound |
| 3000 | TCP | API (internal Docker network) | Internal |
| 3306 | TCP | MySQL (internal Docker network) | Internal |

### 5. Security Hardening

#### SSH Configuration
```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Recommended settings:
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2

# Restart SSH
sudo systemctl restart sshd
```

#### Fail2ban Setup
```bash
# Configure fail2ban
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

sudo systemctl restart fail2ban
sudo systemctl enable fail2ban
```

### 6. System Performance Optimization

#### Kernel Parameters
```bash
# Add to /etc/sysctl.conf
sudo tee -a /etc/sysctl.conf << EOF

# Network optimizations
net.core.somaxconn = 65536
net.ipv4.tcp_max_syn_backlog = 65536
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Memory optimizations
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
EOF

sudo sysctl -p
```

#### File Limits
```bash
# Add to /etc/security/limits.conf
sudo tee -a /etc/security/limits.conf << EOF

* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
EOF
```

## 🔧 System Verification

### Run System Check
```bash
# Download and run the verification script
wget -O check-prerequisites.sh https://raw.githubusercontent.com/your-repo/bc-mis/main/scripts/check-prerequisites.sh
chmod +x check-prerequisites.sh
./check-prerequisites.sh --domain your-domain.com
```

### Manual Verification
```bash
# Check system resources
free -h
df -h
nproc

# Check Docker
docker --version
docker-compose --version
docker run hello-world

# Check network
ping -c 3 google.com
nslookup google.com
curl -s ifconfig.me

# Check firewall
sudo ufw status
sudo fail2ban-client status
```

## 🌐 Domain and DNS Setup

### DNS Configuration
1. **A Record**: Point your domain to VPS IP
   - `your-domain.com` → `YOUR_VPS_IP`
   - `www.your-domain.com` → `YOUR_VPS_IP`

2. **Reverse DNS (PTR Record)**
   - Set PTR record for VPS IP to `your-domain.com`
   - Contact your VPS provider to set this up

### Domain Verification
```bash
# Check DNS propagation
dig +short your-domain.com
nslookup your-domain.com

# Check reverse DNS
dig -x YOUR_VPS_IP +short
```

## 📊 Performance Benchmarks

### Expected Performance
With your Vultr VPS (4 vCPUs, 8GB RAM, 160GB SSD):
- **Concurrent Users**: 1000+
- **Database Connections**: 200+
- **API Requests/Second**: 500+
- **File Upload Size**: Up to 100MB
- **Backup Time**: < 5 minutes

### Load Testing
```bash
# Simple load test
ab -n 1000 -c 10 https://your-domain.com/api/health

# Database performance
docker exec bc-mysql mysql -u root -p -e "SHOW STATUS LIKE 'Threads_connected';"
```

## 🔍 Pre-Deployment Checklist

### System Requirements
- [ ] 4+ vCPUs available
- [ ] 8GB+ RAM available
- [ ] 50GB+ disk space available
- [ ] Ubuntu 20.04+ or compatible OS

### Dependencies
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] User added to docker group
- [ ] Git installed
- [ ] curl/wget installed

### Network & Security
- [ ] Firewall configured (ports 22, 80, 443)
- [ ] SSH hardened (root login disabled)
- [ ] Fail2ban installed and configured
- [ ] System updated

### Domain Setup
- [ ] Domain DNS points to VPS IP
- [ ] Reverse DNS (PTR) configured
- [ ] SSL certificate ready (Let's Encrypt recommended)

### Performance
- [ ] System load < 70%
- [ ] Memory usage < 80%
- [ ] No port conflicts
- [ ] Network connectivity verified

## 🚨 Common Issues and Solutions

### Docker Issues
```bash
# Permission denied
sudo usermod -aG docker $USER
# Log out and back in

# Docker service not starting
sudo systemctl start docker
sudo systemctl enable docker
```

### Port Conflicts
```bash
# Check what's using port 80/443
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Stop conflicting services
sudo systemctl stop apache2  # if Apache is running
sudo systemctl stop nginx    # if system nginx is running
```

### Memory Issues
```bash
# Check memory usage
free -h
htop

# Clear cache if needed
sudo sync && sudo echo 3 > /proc/sys/vm/drop_caches
```

### DNS Issues
```bash
# Check DNS resolution
nslookup google.com
dig google.com

# Check resolv.conf
cat /etc/resolv.conf
```

## 🎯 Next Steps

Once all prerequisites are met:

1. **Run deployment script:**
   ```bash
   ./scripts/deploy-vps.sh
   ```

2. **Configure SSL:**
   ```bash
   ./scripts/setup-ssl.sh your-domain.com
   ```

3. **Initialize production data:**
   ```bash
   ./scripts/init-production.sh
   ```

4. **Update frontend:**
   - Set `VITE_API_BASE_URL=https://your-domain.com/api` in Vercel
   - Or update in your frontend code

## 📞 Support

If you encounter issues:

1. Check system logs: `sudo journalctl -f`
2. Check Docker logs: `docker-compose logs -f`
3. Run system check: `./scripts/check-prerequisites.sh`
4. Check network connectivity
5. Verify all ports are accessible

For additional help, refer to the main deployment guide or contact support.