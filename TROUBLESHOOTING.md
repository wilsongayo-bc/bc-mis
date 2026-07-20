# Troubleshooting Guide

## Common Issues and Solutions

### 1. Application Won't Start

#### Frontend Issues
```bash
# Error: Module not found
npm install
npm run dev

# Error: Port already in use
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

#### Backend Issues
```bash
# Error: Database connection failed
# Check MySQL service
brew services start mysql  # macOS
sudo systemctl start mysql # Linux

# Verify .env configuration
cat .env | grep DB_
```

### 2. Database Issues

#### Connection Problems
- **Symptom**: "Connection refused" or timeout errors
- **Solution**: 
  1. Ensure MySQL is running (local) or verify remote database connectivity
  2. Check credentials in .env file
  3. Verify database exists
  4. Test connection: 
     - Local: `mysql -u root -p`
     - Remote: `mysql -h 153.92.15.31 -u u875409848_bc_mis -p'$SbdBlX8y' u875409848_bc_mis`

#### Migration Failures
- **Symptom**: Migration errors or schema mismatches
- **Solution**:
  1. Check migration files in `api/migrations/`
  2. Verify migration tracking in `migrations` table
  3. Run migrations manually: `npm run migrate`
  4. For missing migration records, manually insert them:
     ```sql
     INSERT INTO migrations (timestamp, name) VALUES ('001', '001_initial_schema');
     ```
  5. Reset database if needed (development only)

#### Foreign Key Constraint Violations ⚠️ CRITICAL
- **Symptom**: 
  ```
  Cannot add or update a child row: a foreign key constraint fails
  ER_NO_REFERENCED_ROW_2, errno: 1452
  ```
- **Root Cause**: Invalid foreign key references in existing data
- **Solution**:
  1. Identify problematic records:
     ```sql
     SELECT * FROM table_name WHERE foreign_key_column NOT IN (SELECT id FROM referenced_table);
     ```
  2. Update invalid references to valid IDs:
     ```sql
     UPDATE table_name SET foreign_key_column = 'valid_id' WHERE foreign_key_column = 'invalid_value';
     ```
  3. Example fix for report_templates:
     ```sql
     UPDATE report_templates SET created_by = '4e981ff6-49d9-4df8-9e94-2167992c9e1f' WHERE created_by = 'system';
     ```

#### Data Integrity Issues
- **Symptom**: Orphaned records, missing relationships
- **Solution**:
  1. Identify orphaned users:
     ```sql
     SELECT u.id, u.email, u.role 
     FROM users u 
     LEFT JOIN students s ON u.id = s.userId 
     LEFT JOIN employees e ON u.id = e.userId 
     WHERE s.id IS NULL AND e.id IS NULL;
     ```
  2. Create missing employee records for teachers:
     ```sql
     INSERT INTO employees (id, employeeId, userId, department, position, hireDate) 
     VALUES (UUID(), 'EMP006', 'user_id', 'Academic', 'Teacher', CURDATE());
     ```
  3. Verify administrative users don't need student/employee records

#### Seed Data Issues
- **Symptom**: Empty database or missing initial data
- **Solution**:
  1. Run seed script: `npx ts-node api/scripts/seed-data.ts`
  2. Use seed API endpoint: POST `/api/seed/run`
  3. Check seed data logs for errors

### 3. Authentication Issues

#### Login Failures
- **Symptom**: Cannot log in with valid credentials
- **Solution**:
  1. Check user exists in database
  2. Verify password hashing
  3. Check JWT secret in .env
  4. Clear browser storage

#### Token Errors
- **Symptom**: "Invalid token" or "Token expired"
- **Solution**:
  1. Check JWT_SECRET in environment
  2. Verify token expiration settings
  3. Clear localStorage and login again

### 4. API Issues

#### 404 Errors
- **Symptom**: API endpoints returning 404
- **Solution**:
  1. Check route registration in `api/app.ts`
  2. Verify URL paths (avoid double `/api`)
  3. Check server is running on correct port

#### CORS Errors
- **Symptom**: Cross-origin request blocked
- **Solution**:
  1. Check CORS configuration in `api/app.ts`
  2. Verify frontend/backend URLs match
  3. Check environment variables

### 5. Build/Deployment Issues

#### TypeScript Errors
- **Symptom**: Build fails with type errors
- **Solution**:
  1. Run `npm run type-check`
  2. Fix type definitions
  3. Update dependencies if needed

#### Vercel Deployment Failures
- **Symptom**: Deployment fails or functions timeout
- **Solution**:
  1. Check Vercel logs
  2. Verify environment variables
  3. Check function size limits
  4. Review vercel.json configuration

### 6. Performance Issues

#### Slow Page Loading
- **Solution**:
  1. Check network tab in DevTools
  2. Optimize images and assets
  3. Review database query performance
  4. Enable caching where appropriate

#### Memory Issues
- **Solution**:
  1. Check for memory leaks
  2. Optimize React components
  3. Review database connection pooling

### 7. Development Environment

#### Node Version Issues
- **Symptom**: Compatibility errors or build failures
- **Solution**:
  1. Use Node.js 20.x: `nvm use 20`
  2. Clear node_modules: `rm -rf node_modules && npm install`
  3. Check package.json engines field

#### Package Installation Issues
- **Solution**:
  1. Clear npm cache: `npm cache clean --force`
  2. Delete package-lock.json and reinstall
  3. Use yarn if npm fails: `yarn install`

## Getting Help

### Debug Tools
- Browser DevTools (Network, Console, Application tabs)
- Redux DevTools Extension
- MySQL Workbench or CLI
- Vercel Dashboard
- Server logs in terminal

### Log Locations
- Frontend: Browser console
- Backend: Terminal/nodemon output
- Database: MySQL error logs
- Production: Vercel function logs

### Contact Information
- Check README.md for project maintainer contact
- Review GitHub issues for similar problems
- Consult DEPLOYMENT.md for production-specific issues

## Emergency Procedures

### Database Recovery
1. Stop application
2. Backup current database
3. Restore from backup or recreate
4. Run migrations and seed data
5. Restart application

### Production Rollback
1. Access Vercel dashboard
2. Revert to previous deployment
3. Check environment variables
4. Monitor application health
5. Investigate and fix issues