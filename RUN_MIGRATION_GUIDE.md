# Quick Guide: Run 2FA Database Migration

## Prerequisites
- MySQL server running on localhost
- Database `bc_mis` exists
- Correct credentials in `.env` file

## Step-by-Step Instructions

### 1. Verify Database Credentials

Open `api/.env` and verify these values match your MySQL setup:

```env
DB_HOST=localhost
DB_USERNAME=root
DB_PASSWORD=root          # ← Make sure this matches your MySQL password!
DB_DATABASE=bc_mis
DB_PORT=3306
```

### 2. Run the Migration

Open a terminal and run:

```bash
cd api
npm run migrate
```

### 3. Expected Output

If successful, you should see:

```
Connecting to database for migrations...
Database connected.
Running migrations...
Executed 1 migrations.
- Add2FAFields1735689600000
Database connection closed.
```

### 4. Verify Migration

You can verify the migration worked by checking the users table:

```bash
mysql -u root -p bc_mis
```

Then in MySQL:

```sql
DESCRIBE users;
```

You should see two new columns:
- `twoFactorEnabled` (boolean)
- `twoFactorEmail` (varchar)

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Cause**: Wrong password in `.env` file

**Fix**: 
1. Check your MySQL root password
2. Update `DB_PASSWORD` in `api/.env`
3. Try again

### Error: "Unknown database 'bc_mis'"

**Cause**: Database doesn't exist

**Fix**:
```bash
mysql -u root -p
CREATE DATABASE bc_mis;
exit
```

Then run the migration again.

### Error: "Cannot find module"

**Cause**: Dependencies not installed

**Fix**:
```bash
cd api
npm install
npm run migrate
```

## After Migration Success

1. Start the backend: `cd api && npm run dev`
2. Start the frontend: `npm run dev`
3. Login as admin
4. Go to Settings > Authentication Configuration
5. Enable 2FA and test!

## Need Help?

If you continue to have issues:
1. Check that MySQL is running: `mysql -u root -p`
2. Verify the database exists: `SHOW DATABASES;`
3. Check the `.env` file is in the `api` folder (not root)
4. Make sure you're running the command from the `api` directory
