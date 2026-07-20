#!/bin/bash

# Benedict College MIS Production Initialization Script
# This script initializes the database and creates default data for production

set -e

echo "🔧 Initializing Benedict College MIS Production Environment..."

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

# Check if containers are running
if ! docker-compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    print_error "Docker containers are not running. Please start them first:"
    echo "docker-compose -f docker-compose.prod.yml up -d"
    exit 1
fi

# Wait for MySQL to be ready
print_step "Waiting for MySQL to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker exec bc-mysql mysqladmin ping -h localhost --silent; then
        print_status "MySQL is ready!"
        break
    fi
    
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting for MySQL... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 10
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    print_error "MySQL failed to start after $MAX_ATTEMPTS attempts"
    exit 1
fi

# Create database if it doesn't exist
print_step "Creating database..."
docker exec bc-mysql mysql -u root -pletmein25 -e "CREATE DATABASE IF NOT EXISTS bc_mis;"

# Run migrations
print_step "Running database migrations..."
docker exec bc-api npm run migrate:prod

# Initialize default data
print_step "Initializing default data..."
API_URL="http://localhost:3000/api"

# Check if initialization is needed
INIT_STATUS=$(curl -s "${API_URL}/init-data/status" | jq -r '.initialized' 2>/dev/null || echo "false")

if [ "$INIT_STATUS" = "false" ]; then
    print_status "Initializing default data..."
    INIT_RESPONSE=$(curl -s -X POST "${API_URL}/init-data")
    
    if echo "$INIT_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
        print_status "✅ Default data initialized successfully!"
        echo ""
        echo "Default Admin Credentials:"
        echo "Email: admin@benedictcollege.edu"
        echo "Password: admin123"
        echo ""
        echo "⚠️  IMPORTANT: Change the default password immediately after first login!"
    else
        print_error "Failed to initialize default data"
        echo "Response: $INIT_RESPONSE"
        exit 1
    fi
else
    print_status "Default data already initialized"
fi

# Create additional indexes for performance
print_step "Optimizing database performance..."
docker exec bc-mysql mysql -u root -pletmein25 bc_mis << 'EOF'
-- Add indexes for common queries
ALTER TABLE users ADD INDEX idx_users_email (email);
ALTER TABLE students ADD INDEX idx_students_student_id (student_id);
ALTER TABLE books ADD INDEX idx_books_title (title);
ALTER TABLE borrow_records ADD INDEX idx_borrow_records_status (status);
ALTER TABLE enrollments ADD INDEX idx_enrollments_student_id (student_id);
ALTER TABLE payments ADD INDEX idx_payments_student_id (student_id);
ALTER TABLE schedules ADD INDEX idx_schedules_course_section_id (course_section_id);
EOF

# Set up backup cron job
print_step "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/bc-mis/backup.sh") | crontab -

# Test API endpoints
print_step "Testing API endpoints..."
ENDPOINTS=(
    "health"
    "init-data/status"
    "users"
    "students"
    "books"
)

for endpoint in "${ENDPOINTS[@]}"; do
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/${endpoint}")
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "401" ]; then
        print_status "✅ ${endpoint} - OK (${RESPONSE})"
    else
        print_warning "⚠️  ${endpoint} - Status: ${RESPONSE}"
    fi
done

# Display final status
print_step "Deployment Status:"
echo "==================="
echo "MySQL: $(docker exec bc-mysql mysqladmin ping -h localhost --silent && echo '✅ Running' || echo '❌ Stopped')"
echo "API: $(curl -s -o /dev/null -w "%{http_code}" "${API_URL}/health" | grep -q "200" && echo '✅ Running' || echo '❌ Stopped')"
echo "Nginx: $(docker exec bc-nginx nginx -t 2>/dev/null && echo '✅ Running' || echo '❌ Stopped')"

echo ""
echo "Service URLs:"
echo "============="
echo "API Base URL: https://your-domain.com/api"
echo "Health Check: https://your-domain.com/api/health"
echo "Init Status: https://your-domain.com/api/init-data/status"

echo ""
echo "Next Steps:"
echo "==========="
echo "1. Configure your domain DNS to point to this server"
echo "2. Set up SSL certificates with Let's Encrypt"
echo "3. Update Vercel frontend API URL to: https://your-domain.com/api"
echo "4. Test the application thoroughly"
echo "5. Set up monitoring and alerts"

print_status "✅ Production initialization completed!"

# Save configuration summary
cat > deployment-summary.txt << EOF
Benedict College MIS Production Deployment Summary
========================================

Deployment Date: $(date)
Server IP: $(curl -s ifconfig.me)
API URL: https://your-domain.com/api
Database: MySQL 8.0 (Docker)
API Server: Node.js 20 (Docker)
Reverse Proxy: Nginx (Docker)

Default Admin Credentials:
- Email: admin@benedictcollege.edu
- Password: admin123
⚠️  CHANGE IMMEDIATELY AFTER FIRST LOGIN!

Backup Schedule: Daily at 2 AM
Monitoring: Docker health checks enabled
SSL: Self-signed (replace with Let's Encrypt)

Next Actions:
1. Configure domain and SSL
2. Test all functionality
3. Set up monitoring alerts
4. Create additional user accounts
5. Configure email settings
EOF

print_status "Deployment summary saved to: deployment-summary.txt"