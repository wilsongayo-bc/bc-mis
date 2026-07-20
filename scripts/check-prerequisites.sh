#!/bin/bash

# Benedict College MIS Pre-Deployment System Verification Script
# This script checks if your server meets all requirements before deployment

set -e

echo "🔍 Benedict College MIS Pre-Deployment System Check"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
CHECKS_PASSED=0
CHECKS_FAILED=0
CHECKS_WARNING=0

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
    ((CHECKS_PASSED++))
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
    ((CHECKS_WARNING++))
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
    ((CHECKS_FAILED++))
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}=== $1 ===${NC}"
    echo ""
}

# Function to check system requirements
check_system_requirements() {
    print_header "SYSTEM REQUIREMENTS"
    
    # Check OS
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        if [[ "$ID" == "ubuntu" ]] || [[ "$ID" == "debian" ]] || [[ "$ID" == "centos" ]] || [[ "$ID" == "rocky" ]]; then
            print_status "Operating System: $PRETTY_NAME"
        else
            print_warning "Unsupported OS: $PRETTY_NAME. Recommended: Ubuntu 20.04+ or Debian 11+"
        fi
    else
        print_error "Cannot detect operating system"
    fi
    
    # Check architecture
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]] || [[ "$ARCH" == "amd64" ]]; then
        print_status "Architecture: $ARCH (64-bit)"
    else
        print_warning "Architecture: $ARCH. Recommended: x86_64 for best compatibility"
    fi
    
    # Check CPU cores
    CPU_CORES=$(nproc)
    if [ "$CPU_CORES" -ge 4 ]; then
        print_status "CPU Cores: $CPU_CORES (Recommended: 4+)"
    else
        print_error "CPU Cores: $CPU_CORES (Minimum: 4 required)"
    fi
    
    # Check RAM
    TOTAL_RAM=$(free -g | awk '/^Mem:/ {print $2}')
    if [ "$TOTAL_RAM" -ge 8 ]; then
        print_status "Total RAM: ${TOTAL_RAM}GB (Recommended: 8GB+)"
    else
        print_error "Total RAM: ${TOTAL_RAM}GB (Minimum: 8GB required)"
    fi
    
    # Check disk space
    DISK_SPACE=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$DISK_SPACE" -ge 50 ]; then
        print_status "Available Disk Space: ${DISK_SPACE}GB (Recommended: 50GB+)"
    else
        print_error "Available Disk Space: ${DISK_SPACE}GB (Minimum: 50GB required)"
    fi
}

# Function to check network connectivity
check_network_connectivity() {
    print_header "NETWORK CONNECTIVITY"
    
    # Check internet connectivity
    if ping -c 1 google.com &> /dev/null; then
        print_status "Internet connectivity: OK"
    else
        print_error "Internet connectivity: FAILED"
    fi
    
    # Check DNS resolution
    if nslookup google.com &> /dev/null; then
        print_status "DNS resolution: OK"
    else
        print_error "DNS resolution: FAILED"
    fi
    
    # Get public IP
    PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to detect")
    print_info "Public IP: $PUBLIC_IP"
    
    # Check if common ports are available
    for port in 80 443 3000 3306; do
        if ! netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_status "Port $port: Available"
        else
            print_warning "Port $port: In use"
        fi
    done
}

# Function to check system dependencies
check_dependencies() {
    print_header "SYSTEM DEPENDENCIES"
    
    # Check essential packages
    ESSENTIAL_PACKAGES=("curl" "wget" "git" "unzip" "tar")
    for package in "${ESSENTIAL_PACKAGES[@]}"; do
        if command -v "$package" &> /dev/null; then
            print_status "$package: Installed ($(command -v $package))"
        else
            print_error "$package: Not installed"
        fi
    done
    
    # Check if Docker is installed
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | cut -d',' -f1)
        print_status "Docker: Installed (v$DOCKER_VERSION)"
        
        # Check if Docker service is running
        if systemctl is-active --quiet docker 2>/dev/null; then
            print_status "Docker service: Running"
        else
            print_error "Docker service: Not running"
        fi
        
        # Check if user is in docker group
        if groups | grep -q docker; then
            print_status "Docker group membership: OK"
        else
            print_warning "User not in docker group. Run: sudo usermod -aG docker \$USER"
        fi
    else
        print_error "Docker: Not installed"
        print_info "Install with: curl -fsSL https://get.docker.com | sh"
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_VERSION=$(docker-compose --version | cut -d' ' -f3)
        print_status "Docker Compose: Installed (v$COMPOSE_VERSION)"
    else
        print_error "Docker Compose: Not installed"
        print_info "Install with: sudo curl -L https://github.com/docker/compose/releases/latest/download/docker-compose-\$(uname -s)-\$(uname -m) -o /usr/local/bin/docker-compose && sudo chmod +x /usr/local/bin/docker-compose"
    fi
}

# Function to check security settings
check_security() {
    print_header "SECURITY SETTINGS"
    
    # Check if UFW is installed and active
    if command -v ufw &> /dev/null; then
        if ufw status | grep -q "Status: active"; then
            print_status "UFW Firewall: Active"
        else
            print_warning "UFW Firewall: Installed but not active"
        fi
    else
        print_warning "UFW Firewall: Not installed"
    fi
    
    # Check if fail2ban is installed and active
    if command -v fail2ban-client &> /dev/null; then
        if systemctl is-active --quiet fail2ban 2>/dev/null; then
            print_status "Fail2ban: Active"
        else
            print_warning "Fail2ban: Installed but not active"
        fi
    else
        print_warning "Fail2ban: Not installed"
    fi
    
    # Check SSH configuration
    if grep -q "^PermitRootLogin no" /etc/ssh/sshd_config 2>/dev/null; then
        print_status "SSH root login: Disabled"
    else
        print_warning "SSH root login: Enabled (consider disabling)"
    fi
    
    if grep -q "^PasswordAuthentication no" /etc/ssh/sshd_config 2>/dev/null; then
        print_status "SSH password authentication: Disabled"
    else
        print_warning "SSH password authentication: Enabled (consider using key-based auth)"
    fi
}

# Function to check system performance
check_performance() {
    print_header "SYSTEM PERFORMANCE"
    
    # Check load average
    LOAD_AVG=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    CPU_CORES=$(nproc)
    LOAD_THRESHOLD=$(echo "$CPU_CORES * 0.7" | bc -l 2>/dev/null || echo "2.8")
    
    if (( $(echo "$LOAD_AVG < $LOAD_THRESHOLD" | bc -l 2>/dev/null || echo "1") )); then
        print_status "System load: $LOAD_AVG (Normal)"
    else
        print_warning "System load: $LOAD_AVG (High)"
    fi
    
    # Check memory usage
    MEMORY_USAGE=$(free | awk '/Mem:/ {printf "%.1f", $3/$2 * 100}')
    if (( $(echo "$MEMORY_USAGE < 80" | bc -l 2>/dev/null || echo "1") )); then
        print_status "Memory usage: ${MEMORY_USAGE}% (Normal)"
    else
        print_warning "Memory usage: ${MEMORY_USAGE}% (High)"
    fi
    
    # Check disk I/O performance (simple test)
    print_info "Testing disk I/O performance..."
    IO_TEST=$(dd if=/dev/zero of=/tmp/io_test bs=1M count=100 2>&1 | awk '/copied/ {print $8}')
    rm -f /tmp/io_test
    print_info "Disk write speed: $IO_TEST MB/s"
}

# Function to check domain and DNS (if domain provided)
check_domain_dns() {
    if [ -n "$DOMAIN" ]; then
        print_header "DOMAIN AND DNS CHECK"
        
        # Check if domain resolves to this server
        DOMAIN_IP=$(dig +short $DOMAIN 2>/dev/null || nslookup $DOMAIN 2>/dev/null | awk -F': ' 'NR==6 {print $2}' | head -1)
        CURRENT_IP=$(curl -s ifconfig.me 2>/dev/null || echo "Unable to detect")
        
        if [ "$DOMAIN_IP" = "$CURRENT_IP" ]; then
            print_status "Domain $DOMAIN resolves to this server ($DOMAIN_IP)"
        else
            print_warning "Domain $DOMAIN resolves to $DOMAIN_IP, but server IP is $CURRENT_IP"
            print_info "Please update your DNS A record to point to $CURRENT_IP"
        fi
        
        # Check if www subdomain exists
        WWW_IP=$(dig +short www.$DOMAIN 2>/dev/null || echo "Not found")
        if [ "$WWW_IP" != "Not found" ]; then
            print_status "WWW subdomain: $WWW_IP"
        else
            print_warning "WWW subdomain not configured"
        fi
    fi
}

# Function to generate recommendations
generate_recommendations() {
    print_header "RECOMMENDATIONS AND NEXT STEPS"
    
    echo "Based on the system check, here are the recommended actions:"
    echo ""
    
    if [ $CHECKS_FAILED -gt 0 ]; then
        echo -e "${RED}❌ CRITICAL ISSUES (Must fix before deployment):${NC}"
        echo "   - Address all failed checks above"
        echo "   - Ensure minimum system requirements are met"
        echo ""
    fi
    
    if [ $CHECKS_WARNING -gt 0 ]; then
        echo -e "${YELLOW}⚠️  WARNINGS (Recommended to fix):${NC}"
        echo "   - Consider addressing warning items for better performance/security"
        echo ""
    fi
    
    echo -e "${GREEN}✅ READY FOR DEPLOYMENT:${NC}"
    echo "   1. Install missing dependencies (Docker, Docker Compose)"
    echo "   2. Configure firewall (UFW) and security (Fail2ban)"
    echo "   3. Set up domain DNS if not done already"
    echo "   4. Run the deployment script: ./scripts/deploy-vps.sh"
    echo "   5. Initialize production data: ./scripts/init-production.sh"
    echo ""
    
    echo -e "${BLUE}📋 DEPLOYMENT CHECKLIST:${NC}"
    echo "   ☐ System meets minimum requirements (4 CPU, 8GB RAM, 50GB disk)"
    echo "   ☐ Docker and Docker Compose installed and running"
    echo "   ☐ Domain DNS configured (if using custom domain)"
    echo "   ☐ Firewall configured (ports 80, 443, 22)"
    echo "   ☐ SSL certificates ready (Let's Encrypt recommended)"
    echo ""
}

# Function to save report
save_report() {
    REPORT_FILE="system-check-report-$(date +%Y%m%d-%H%M%S).txt"
    {
        echo "Benedict College MIS Pre-Deployment System Check Report"
        echo "=============================================="
        echo "Date: $(date)"
        echo "Server: $(hostname)"
        echo "IP: $(curl -s ifconfig.me 2>/dev/null || echo 'Unable to detect')"
        echo ""
        echo "Summary:"
        echo "- Checks Passed: $CHECKS_PASSED"
        echo "- Checks Failed: $CHECKS_FAILED"
        echo "- Warnings: $CHECKS_WARNING"
        echo ""
        echo "Recommendations:"
        if [ $CHECKS_FAILED -gt 0 ]; then
            echo "- Fix all critical issues before deployment"
        fi
        if [ $CHECKS_WARNING -gt 0 ]; then
            echo "- Address warnings for optimal performance"
        fi
        echo "- Proceed with deployment if no critical issues"
    } > "$REPORT_FILE"
    
    print_info "Report saved to: $REPORT_FILE"
}

# Main execution
main() {
    # Parse command line arguments
    DOMAIN=""
    while [[ $# -gt 0 ]]; do
        case $1 in
            --domain)
                DOMAIN="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [--domain your-domain.com]"
                echo "Check system requirements before Benedict College MIS deployment"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run all checks
    check_system_requirements
    check_network_connectivity
    check_dependencies
    check_security
    check_performance
    check_domain_dns
    generate_recommendations
    
    # Summary
    print_header "SUMMARY"
    echo -e "${GREEN}Checks Passed: $CHECKS_PASSED${NC}"
    echo -e "${RED}Checks Failed: $CHECKS_FAILED${NC}"
    echo -e "${YELLOW}Warnings: $CHECKS_WARNING${NC}"
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}✅ System is ready for deployment!${NC}"
        exit_code=0
    else
        echo -e "${RED}❌ System has critical issues that must be fixed before deployment.${NC}"
        exit_code=1
    fi
    
    # Save report
    save_report
    
    exit $exit_code
}

# Run main function
main "$@"