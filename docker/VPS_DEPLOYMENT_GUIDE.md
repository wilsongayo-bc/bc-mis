# VPS Deployment Guide for Benedict College MIS

This guide walks you through deploying the Benedict College Management Information System on a Vultr VPS with MySQL, while keeping the frontend on Vercel.

## Prerequisites

- Vultr VPS with minimum 4 vCPUs, 8GB RAM, 160GB SSD
- Domain name (optional but recommended)
- Basic knowledge of Linux command line
- Git repository access

## Quick Start

1. **SSH into your VPS:**
   ```bash
   ssh root@your-vps-ip
   ```

2. **Run the deployment script:**
   ```bash
   wget -O deploy.sh https://raw.githubusercontent.com/your-repo/bc-mis/main/scripts/deploy-vps.sh
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Configure environment:**
   ```bash
   cd /opt/bc-mis
   cp docker/.env.vps-example .env.production
   nano .env.production  # Edit with your configuration
   ```

4. **Deploy services:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

5. **Initialize production data:**
   ```bash
   ./scripts/init-production.sh
   ```

## Detailed Deployment Steps

### 1. Server Preparation

**Update system packages:**
```bash
sudo apt update && sudo apt upgrade -y
```

**Install Docker and Docker Compose:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo apt-get update
sudo apt-get install docker-compose-plugin
```

**Install additional tools:**
```bash
sudo apt install -y git nginx certbot python3-certbot-nginx ufw fail2ban
```

### 2. Application Setup

**Clone repository:**
```bash
git clone https://github.com/your-repo/bc-mis.git /opt/bc-mis
cd /opt/bc-mis
```

**Create production environment file:**
```bash
cp docker/.env.vps-example .env.production
nano .env.production
```

**Key configuration variables:**
```bash
# Database
DB_PASSWORD=your-secure-password

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key

# Domain
SERVER_NAME=your-domain.com

# Optional: Vercel Blob for file uploads
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### 3. SSL Certificate Setup

**For production domain (recommended):**
```bash
# Generate SSL certificate with Let's Encrypt
sudo certbot certonly --standalone -d your-domain.com

# Copy certificates to Docker directory
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem docker/nginx/ssl/key.pem
sudo chmod 644 docker/nginx/ssl/*.pem
```

**For testing (self-signed):**
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout docker/nginx/ssl/key.pem \
  -out docker/nginx/ssl/cert.pem \
  -subj "/C=PH/ST=Philippines/L=Manila/O=Benedict College/CN=your-domain.com"
```

### 4. Service Deployment

**Start services:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

**Check service status:**
```bash
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

### 5. Database Initialization

**Run production initialization:**
```bash
./scripts/init-production.sh
```

**Manual database setup (if needed):**
```bash
# Access MySQL container
docker exec -it bc-mysql mysql -u root -p

# Create database
CREATE DATABASE bc_mis;

# Run migrations (from API container)
docker exec bc-api npm run typeorm migration:run
```

### 6. Frontend Configuration

**Update Vercel environment variables:**
```bash
VITE_API_BASE_URL=https://your-domain.com/api
```

**Or update frontend code:**
```typescript
// In src/lib/api.ts
const API_BASE_URL = 'https://your-domain.com/api';
```

## Service Management

### Daily Operations

**View logs:**
```bash
docker-compose -f docker-compose.prod.yml logs -f api
docker-compose -f docker-compose.prod.yml logs -f mysql
```

**Monitor resources:**
```bash
./scripts/monitor.sh
docker stats
```

**Backup database:**
```bash
./backup.sh
```

**Update application:**
```bash
./update.sh
```

### Troubleshooting

**Check service health:**
```bash
# Test API endpoint
curl https://your-domain.com/api/health

# Check database connectivity
docker exec bc-api node -e "
const mysql = require('mysql2/promise');
mysql.createConnection({
  host: 'mysql',
  user: 'bc_user',
  password: 'your-password',
  database: 'bc_mis'
}).then(conn => {
  console.log('Database connected successfully');
  conn.end();
}).catch(err => console.error('Database connection failed:', err));
"
```

**Common issues:**

1. **Port conflicts:**
   ```bash
   sudo netstat -tulpn | grep :3306
   sudo systemctl stop mysql  # Stop system MySQL if running
   ```

2. **Permission issues:**
   ```bash
   sudo chown -R $USER:$USER /opt/bc-mis
   sudo chmod +x scripts/*.sh
   ```

3. **SSL certificate issues:**
   ```bash
   sudo certbot renew --dry-run
   ```

## Security Configuration

### Firewall Setup

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Fail2ban Configuration

```bash
sudo tee /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

sudo systemctl restart fail2ban
```

### Nginx Security Headers

The nginx configuration already includes:
- XSS Protection
- Content Type Options
- Frame Options
- HSTS (HTTPS only)
- CSP headers

## Performance Optimization

### MySQL Tuning

Add to docker-compose.yml:
```yaml
mysql:
  command: 
    - --innodb-buffer-pool-size=2G
    - --query-cache-size=256M
    - --max-connections=200
```

### Node.js Performance

Environment variables:
```bash
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

## Monitoring and Maintenance

### Automated Backups

Backup script is configured to run daily at 2 AM via cron.

Manual backup:
```bash
./backup.sh
```

### Log Rotation

Docker logs are automatically rotated. Nginx logs:
```bash
sudo logrotate -f /etc/logrotate.d/nginx
```

### Health Checks

- API: `https://your-domain.com/api/health`
- Database: Container health check
- Nginx: Service status

## Domain and DNS Setup

1. **Point domain to VPS IP:**
   - A record: `your-domain.com` → `VPS_IP`
   - A record: `www.your-domain.com` → `VPS_IP`

2. **Configure reverse DNS:**
   - Set PTR record for VPS IP to `your-domain.com`

## Cost Optimization

### Resource Usage

With your Vultr VPS specs (4 vCPUs, 8GB RAM, 160GB SSD):
- MySQL: ~2GB RAM, 20GB storage
- Node.js API: ~1GB RAM, 1GB storage
- Nginx: ~100MB RAM, 100MB storage
- Remaining: ~5GB RAM for OS and buffer

### Scaling Considerations

Current setup handles:
- 1000+ concurrent users
- 10,000+ students
- 50,000+ daily API requests

For higher loads:
- Add Redis caching
- Implement CDN for static assets
- Consider load balancing

## Support and Troubleshooting

### Logs Location

```bash
# Application logs
docker-compose -f docker-compose.prod.yml logs

# Nginx logs
docker exec bc-nginx tail -f /var/log/nginx/access.log
docker exec bc-nginx tail -f /var/log/nginx/error.log

# System logs
sudo journalctl -u bc-mis.service -f
```

### Common Commands

```bash
# Restart all services
docker-compose -f docker-compose.prod.yml restart

# Rebuild and restart
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Reset everything (careful!)
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

## Next Steps

1. **Test thoroughly** all application features
2. **Set up monitoring** with alerts
3. **Configure email** notifications
4. **Train users** on the new system
5. **Plan maintenance** windows
6. **Document** any custom configurations

For support, check the application logs and refer to the troubleshooting guide in the main documentation.