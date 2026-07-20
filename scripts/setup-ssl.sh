#!/bin/bash

# SSL Certificate Setup Script for Benedict College MIS VPS
# This script helps set up SSL certificates with Let's Encrypt

set -e

echo "🔒 Setting up SSL certificates for Benedict College MIS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check if domain is provided
if [ -z "$1" ]; then
    print_error "Please provide your domain name as an argument"
    echo "Usage: $0 your-domain.com"
    exit 1
fi

DOMAIN=$1
print_status "Setting up SSL for domain: $DOMAIN"

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    print_step "Installing certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Stop nginx temporarily to allow certbot to bind to port 80
print_step "Stopping nginx container temporarily..."
docker-compose -f docker-compose.prod.yml stop nginx

# Generate SSL certificate
print_step "Generating SSL certificate with Let's Encrypt..."
sudo certbot certonly --standalone \
    --non-interactive \
    --agree-tos \
    --email admin@$DOMAIN \
    -d $DOMAIN \
    --keep-until-expiring

# Check if certificate was generated successfully
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_error "Failed to generate SSL certificate"
    print_warning "Please check:"
    echo "1. Domain DNS is pointing to this server"
    echo "2. Port 80 is accessible"
    echo "3. Domain is reachable"
    exit 1
fi

# Copy certificates to Docker directory
print_step "Copying certificates to Docker directory..."
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/nginx/ssl/key.pem
sudo chmod 644 docker/nginx/ssl/*.pem

# Update nginx configuration with domain
print_step "Updating nginx configuration..."
sed -i "s/server_name .*/server_name $DOMAIN;/" docker/nginx/nginx.conf

# Start nginx again
print_step "Starting nginx container..."
docker-compose -f docker-compose.prod.yml up -d nginx

# Set up automatic renewal
print_step "Setting up automatic certificate renewal..."
# Create renewal script
cat > renew-ssl.sh << EOF
#!/bin/bash
# SSL Certificate Renewal Script for $DOMAIN

echo "Renewing SSL certificate for $DOMAIN..."

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Renew certificate
sudo certbot renew --non-interactive --quiet

# Copy new certificates
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem docker/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem docker/nginx/ssl/key.pem
sudo chmod 644 docker/nginx/ssl/*.pem

# Start nginx again
docker-compose -f docker-compose.prod.yml up -d nginx

echo "SSL certificate renewal completed for $DOMAIN"
EOF

chmod +x renew-ssl.sh

# Add to crontab for automatic renewal (runs twice a month)
(crontab -l 2>/dev/null; echo "0 2 1,15 * * /opt/bc-mis/renew-ssl.sh >> /var/log/ssl-renewal.log 2>&1") | crontab -

# Test SSL configuration
print_step "Testing SSL configuration..."
sleep 5  # Wait for nginx to start

if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health | grep -q "200"; then
    print_status "✅ SSL certificate is working correctly!"
else
    print_warning "⚠️  SSL certificate may not be configured correctly"
    print_warning "Please check nginx logs: docker-compose -f docker-compose.prod.yml logs nginx"
fi

# Display certificate information
print_step "SSL Certificate Information:"
echo "================================"
echo "Domain: $DOMAIN"
echo "Certificate: /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "Private Key: /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Certificate Expiry:"
sudo openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -dates

echo ""
echo "Renewal Schedule:"
echo "Automatic renewal is set up to run on the 1st and 15th of each month at 2 AM"
echo "Manual renewal: ./renew-ssl.sh"

print_status "✅ SSL setup completed successfully!"
print_status "Your Benedict College MIS is now accessible at: https://$DOMAIN"

# Create SSL status check script
cat > check-ssl.sh << EOF
#!/bin/bash
# SSL Status Check Script

echo "SSL Certificate Status for $DOMAIN:"
echo "====================================="

# Check certificate expiry
EXPIRY_DATE=$(sudo openssl x509 -in /etc/letsencrypt/live/$DOMAIN/fullchain.pem -noout -enddate | cut -d= -f2)
EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_TIMESTAMP=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))

echo "Certificate expires: $EXPIRY_DATE"
echo "Days until expiry: $DAYS_UNTIL_EXPIRY"

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "⚠️  Certificate expires in less than 30 days!"
    echo "Consider renewing soon."
else
    echo "✅ Certificate is valid for more than 30 days."
fi

# Test HTTPS endpoint
echo ""
echo "Testing HTTPS endpoint..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/health | grep -q "200"; then
    echo "✅ HTTPS endpoint is working correctly"
else
    echo "❌ HTTPS endpoint is not responding correctly"
fi
EOF

chmod +x check-ssl.sh

print_status "SSL status check script created: ./check-ssl.sh"