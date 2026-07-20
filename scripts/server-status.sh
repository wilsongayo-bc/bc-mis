#!/bin/bash

# Benedict College MIS Server Status Check Script
# Quick verification that your server is ready for deployment

echo "🔍 Benedict College MIS Server Status Check"
echo "================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo ""
echo "System Information:"
echo "=================="

# Basic system info
print_info "OS: $(lsb_release -d 2>/dev/null | cut -f2 || echo 'Unknown')"
print_info "Kernel: $(uname -r)"
print_info "Hostname: $(hostname)"
print_info "Public IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"

echo ""
echo "Resource Check:"
echo "==============="

# CPU cores
CPU_CORES=$(nproc)
if [ "$CPU_CORES" -ge 4 ]; then
    print_status "CPU Cores: $CPU_CORES (✓ Requirements met)"
else
    print_error "CPU Cores: $CPU_CORES (✗ Minimum 4 required)"
fi

# RAM
TOTAL_RAM=$(free -g | awk '/^Mem:/ {print $2}')
if [ "$TOTAL_RAM" -ge 8 ]; then
    print_status "Total RAM: ${TOTAL_RAM}GB (✓ Requirements met)"
else
    print_error "Total RAM: ${TOTAL_RAM}GB (✗ Minimum 8GB required)"
fi

# Disk space
DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
if [ "$DISK_SPACE" -ge 50 ]; then
    print_status "Available Disk: ${DISK_SPACE}GB (✓ Requirements met)"
else
    print_error "Available Disk: ${DISK_SPACE}GB (✗ Minimum 50GB required)"
fi

echo ""
echo "Docker Check:"
echo "============="

# Docker status
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
    print_status "Docker: v$DOCKER_VERSION (✓ Installed)"
    
    if systemctl is-active --quiet docker 2>/dev/null; then
        print_status "Docker Service: Running (✓)"
    else
        print_error "Docker Service: Not running (✗)"
    fi
    
    # Test Docker
    if sudo docker run hello-world >/dev/null 2>&1; then
        print_status "Docker Test: PASSED (✓)"
    else
        print_error "Docker Test: FAILED (✗)"
    fi
else
    print_error "Docker: Not installed (✗)"
fi

# Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3)
    print_status "Docker Compose: v$COMPOSE_VERSION (✓ Installed)"
else
    print_error "Docker Compose: Not installed (✗)"
fi

echo ""
echo "Security Check:"
echo "==============="

# Firewall
if command -v ufw &> /dev/null; then
    if ufw status | grep -q "Status: active"; then
        print_status "UFW Firewall: Active (✓)"
    else
        print_warning "UFW Firewall: Installed but not active"
    fi
else
    print_warning "UFW Firewall: Not installed"
fi

# Fail2ban
if command -v fail2ban-client &> /dev/null; then
    if systemctl is-active --quiet fail2ban 2>/dev/null; then
        print_status "Fail2ban: Active (✓)"
    else
        print_warning "Fail2ban: Installed but not active"
    fi
else
    print_warning "Fail2ban: Not installed"
fi

echo ""
echo "Network Check:"
echo "=============="

# Check if ports are available
for port in 80 443 3000 3306; do
    if ! netstat -tuln 2>/dev/null | grep -q ":$port "; then
        print_status "Port $port: Available (✓)"
    else
        print_warning "Port $port: In use"
    fi
done

# Internet connectivity
if ping -c 1 google.com &> /dev/null; then
    print_status "Internet: Connected (✓)"
else
    print_error "Internet: Not connected (✗)"
fi

echo ""
echo "User Permissions:"
echo "================="

# Docker group membership
if groups | grep -q docker; then
    print_status "Docker Group: Member (✓)"
else
    print_warning "Docker Group: Not a member"
    print_info "Run: sudo usermod -aG docker \$USER and log out/in"
fi

echo ""
echo "System Load:"
echo "============"

# Load average
LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
CPU_CORES=$(nproc)
print_info "Load Average: $LOAD_AVG ($CPU_CORES cores available)"

# Memory usage
MEMORY_USAGE=$(free | awk '/Mem:/ {printf "%.1f%%", $3/$2 * 100}')
print_info "Memory Usage: $MEMORY_USAGE"

# Disk usage
DISK_USAGE=$(df / | awk 'NR==2 {printf "%.1f%%", $3/$2 * 100}')
print_info "Disk Usage: $DISK_USAGE"

echo ""
echo "================================="
echo "Ready for Benedict College MIS deployment?"
echo "================================="

# Overall readiness check
ISSUES=0

# Check critical requirements
[ "$CPU_CORES" -lt 4 ] && ((ISSUES++))
[ "$TOTAL_RAM" -lt 8 ] && ((ISSUES++))
[ "$DISK_SPACE" -lt 50 ] && ((ISSUES++))

if ! command -v docker &> /dev/null; then ((ISSUES++)); fi
if ! systemctl is-active --quiet docker 2>/dev/null; then ((ISSUES++)); fi
if ! groups | grep -q docker; then ((ISSUES++)); fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}🎉 SYSTEM READY FOR DEPLOYMENT!${NC}"
    echo ""
    echo "✅ All requirements met"
    echo "✅ Docker is working"
    echo "✅ System resources are sufficient"
    echo ""
    echo "🚀 Next steps:"
    echo "1. Clone Benedict College MIS repository"
    echo "2. Configure environment"
    echo "3. Deploy with docker-compose"
    echo "4. Initialize production data"
else
    echo -e "${YELLOW}⚠️  $ISSUES issues found that should be addressed${NC}"
    echo ""
    echo "Please fix the issues above before proceeding with deployment."
fi

echo ""
echo "📋 Quick Commands:"
echo "=================="
echo "Clone repo:  git clone https://github.com/your-repo/bc-mis.git /opt/bc-mis"
echo "Configure:   cd /opt/bc-mis && cp docker/.env.vps-example .env.production"
echo "Deploy:      docker-compose -f docker-compose.prod.yml up -d"
echo "Initialize:  ./scripts/init-production.sh"
echo ""
echo "📖 Full guide: docker/QUICK_PREP_GUIDE.md"