#!/bin/bash

# Benedict College MIS VPS Deployment Script
# This script sets up the production environment on Vultr VPS

set -e

echo "🚀 Starting Benedict College MIS VPS Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    certbot \
    python3-certbot-nginx \
    ufw \
    fail2ban \
    htop \
    nano

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    print_warning "Please log out and log back in for Docker group changes to take effect"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
print_status "Creating application directory..."
sudo mkdir -p /opt/bc-mis
sudo chown $USER:$USER /opt/bc-mis
cd /opt/bc-mis

# Clone repository (if not already cloned)
if [ ! -d ".git" ]; then
    print_status "Cloning repository..."
    git clone https://github.com/benedictcollege25-repo/bc-mis.git .
fi

# Create environment file
print_status "Creating environment configuration..."
cat > .env.production << EOF
# Database Configuration
DB_HOST=mysql
DB_PORT=3306
DB_USERNAME=bc_user
DB_PASSWORD=letmein25
DB_DATABASE=bc_mis

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 32)
JWT_EXPIRES_IN=24h

# Server Configuration
NODE_ENV=production
PORT=3000

# Domain Configuration
SERVER_NAME=mis.benedictcollege.com

# Optional: Vercel Blob Storage (if using file uploads)
BLOB_READ_WRITE_TOKEN=your-blob-token-here
EOF

print_warning "Please edit .env.production with your actual configuration"

# Create SSL directory
print_status "Setting up SSL certificates..."
mkdir -p docker/nginx/ssl

# Generate self-signed certificate for initial setup
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout docker/nginx/ssl/key.pem \
    -out docker/nginx/ssl/cert.pem \
    -subj "/C=PH/ST=Philippines/L=Manila/O=Benedict College/CN=localhost"

# Set up firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create backup script
print_status "Creating backup script..."
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/bc-mis/backups"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec bc-mysql mysqldump -u root -pletmein25 bc_mis > $BACKUP_DIR/database_$DATE.sql

# Backup uploaded files (if any)
if [ -d "uploads" ]; then
    tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/
fi

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/database_$DATE.sql"
EOF

chmod +x backup.sh

# Create update script
print_status "Creating update script..."
cat > update.sh << 'EOF'
#!/bin/bash
echo "Updating Benedict College MIS..."

# Pull latest changes
git pull origin main

# Rebuild and restart services
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo "Update completed!"
EOF

chmod +x update.sh

# Create monitoring script
print_status "Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
echo "Benedict College MIS Service Status:"
echo "========================"

docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Container Resource Usage:"
echo "========================"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo ""
echo "Recent Logs (last 50 lines):"
echo "============================"
docker-compose -f docker-compose.prod.yml logs --tail=50
EOF

chmod +x monitor.sh

# Create systemd service for auto-start
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/bc-mis.service > /dev/null << 'EOF'
[Unit]
Description=Benedict College MIS Docker Services
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/bc-mis
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable bc-mis.service

print_status "✅ VPS setup completed!"
print_status "Next steps:"
echo "1. Edit .env.production with your actual configuration"
echo "2. Set up your domain and SSL certificate with Let's Encrypt"
echo "3. Run: docker-compose -f docker-compose.prod.yml up -d"
echo "4. Initialize your database with: ./scripts/init-production.sh"
echo "5. Set up monitoring and backups"
print_warning "Remember to configure your domain and SSL certificates!"

# Display system info
echo ""
echo "System Information:"
echo "==================="
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "CPU Cores: $(nproc)"
echo "Disk Space: $(df -h / | awk 'NR==2 {print $4 " available"}')"
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker-compose --version)"