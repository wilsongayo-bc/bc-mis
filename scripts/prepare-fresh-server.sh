#!/bin/bash

# Benedict College MIS Fresh Server Quick Preparation Script
# This script quickly prepares a fresh Vultr VPS for Benedict College MIS deployment

set -e

echo "🚀 Benedict College MIS Fresh Server Quick Preparation"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   print_info "Please run as a regular user with sudo privileges"
   exit 1
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

print_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y
print_status "System updated successfully"

print_step "Installing essential packages..."
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
    fail2ban \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

print_status "Essential packages installed"

print_step "Installing Docker..."
if ! command_exists docker; then
    # Install Docker using the official script
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    # Enable Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    
    print_status "Docker installed successfully"
    print_warning "Please log out and log back in for Docker group changes to take effect"
else
    print_status "Docker already installed ($(docker --version))"
fi

print_step "Installing Docker Compose..."
if ! command_exists docker-compose; then
    # Install Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    # Create symlink
    sudo ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
    
    print_status "Docker Compose installed successfully ($(docker-compose --version))"
else
    print_status "Docker Compose already installed ($(docker-compose --version))"
fi

print_step "Configuring firewall..."
# Reset UFW to default
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow essential ports
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
print_status "Firewall configured successfully"

print_step "Configuring fail2ban..."
# Create basic fail2ban configuration
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

# Start and enable fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
print_status "Fail2ban configured successfully"

print_step "Optimizing system settings..."
# Add kernel optimizations
sudo tee -a /etc/sysctl.conf << EOF

# Network optimizations for Benedict College MIS
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

# Apply sysctl settings
sudo sysctl -p
print_status "System optimizations applied"

print_step "Setting up file limits..."
# Increase file limits for Docker
sudo tee -a /etc/security/limits.conf << EOF

# Benedict College MIS Docker limits
* soft nofile 65536
* hard nofile 65536
* soft nproc 32768
* hard nproc 32768
root soft nofile 65536
root hard nofile 65536
EOF
print_status "File limits configured"

print_step "Creating deployment directory..."
sudo mkdir -p /opt/bc-mis
sudo chown $USER:$USER /opt/bc-mis
print_status "Deployment directory created at /opt/bc-mis"

print_step "Testing Docker installation..."
if sudo docker run hello-world >/dev/null 2>&1; then
    print_status "Docker test successful"
else
    print_error "Docker test failed"
fi

print_step "System verification..."
# Quick system check
echo ""
echo "System Information:"
echo "=================="
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"
echo "CPU Cores: $(nproc)"
echo "Total RAM: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Available Disk: $(df -h / | awk 'NR==2 {print $4}')"
echo "Docker Version: $(docker --version)"
echo "Docker Compose Version: $(docker-compose --version)"
echo "Public IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
echo ""

print_step "Creating useful aliases..."
cat >> ~/.bashrc << 'EOF'

# Benedict College MIS Aliases
alias dps='docker ps'
alias dlogs='docker logs -f'
alias dstats='docker stats'
alias dcompose='docker-compose -f /opt/bc-mis/docker-compose.prod.yml'
alias bc-status='cd /opt/bc-mis && docker-compose -f docker-compose.prod.yml ps'
alias bc-logs='cd /opt/bc-mis && docker-compose -f docker-compose.prod.yml logs -f'
alias bc-restart='cd /opt/bc-mis && docker-compose -f docker-compose.prod.yml restart'
EOF

print_status "Aliases added to ~/.bashrc"

print_step "Creating deployment helper scripts..."
# Create a quick status check script
cat > ~/bc-status.sh << 'EOF'
#!/bin/bash
echo "Benedict College MIS System Status"
echo "========================"
echo "Docker Status: $(sudo systemctl is-active docker)"
echo "UFW Status: $(sudo ufw status | head -1)"
echo "Fail2ban Status: $(sudo systemctl is-active fail2ban)"
echo ""
echo "System Resources:"
echo "CPU Load: $(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}')"
echo "Memory Usage: $(free | awk '/Mem:/ {printf "%.1f%%", $3/$2 * 100}')"
echo "Disk Usage: $(df / | awk 'NR==2 {printf "%.1f%%", $3/$2 * 100}')"
echo ""
echo "Network:"
echo "Public IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
echo "SSH Port: $(sudo ufw status | grep ssh | awk '{print $1}')"
EOF

chmod +x ~/bc-status.sh
print_status "Status check script created: ~/bc-status.sh"

# Create a quick deployment preparation script
cat > ~/prepare-deployment.sh << 'EOF'
#!/bin/bash
echo "Preparing for Benedict College MIS deployment..."

# Check if Docker is running
if ! sudo systemctl is-active --quiet docker; then
    echo "Starting Docker..."
    sudo systemctl start docker
fi

# Check if user is in docker group
if ! groups | grep -q docker; then
    echo "Adding user to docker group..."
    sudo usermod -aG docker $USER
    echo "Please log out and log back in for Docker group changes to take effect"
    exit 1
fi

# Test Docker
if sudo docker run hello-world >/dev/null 2>&1; then
    echo "Docker is working correctly"
else
    echo "Docker test failed. Please check Docker installation."
    exit 1
fi

echo "✅ System is ready for Benedict College MIS deployment!"
echo "Next steps:"
echo "1. Clone the repository: git clone https://github.com/your-repo/bc-mis.git /opt/bc-mis"
echo "2. Configure environment: cp docker/.env.vps-example .env.production"
echo "3. Deploy: docker-compose -f docker-compose.prod.yml up -d"
echo "4. Initialize: ./scripts/init-production.sh"
EOF

chmod +x ~/prepare-deployment.sh
print_status "Deployment preparation script created: ~/prepare-deployment.sh"

echo ""
echo "🎉 Fresh server preparation completed!"
echo "======================================"
echo ""
echo "✅ System is ready for Benedict College MIS deployment"
echo ""
echo "📋 Summary of what was configured:"
echo "  • System packages updated"
echo "  • Docker and Docker Compose installed"
echo "  • Firewall configured (ports 22, 80, 443)"
echo "  • Fail2ban security configured"
echo "  • System optimizations applied"
echo "  • Deployment directory created (/opt/bc-mis)"
echo "  • Helper scripts created"
echo ""
echo "⚠️  IMPORTANT: If this is your first time setting up Docker,"
echo "    please log out and log back in for Docker group changes to take effect"
echo ""
echo "🚀 Next steps:"
echo "  1. Run: ~/prepare-deployment.sh (to verify everything is ready)"
echo "  2. Download Benedict College MIS: git clone https://github.com/your-repo/bc-mis.git /opt/bc-mis"
echo "  3. Configure: cd /opt/bc-mis && cp docker/.env.vps-example .env.production"
echo "  4. Deploy: docker-compose -f docker-compose.prod.yml up -d"
echo "  5. Initialize: ./scripts/init-production.sh"
echo ""
echo "📖 For detailed instructions, see: docker/QUICK_PREP_GUIDE.md"
echo "🔍 For system verification, run: ~/bc-status.sh"
echo ""
print_status "Server preparation completed successfully!"