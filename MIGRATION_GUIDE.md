# Data Migration Guide

This guide explains how to use the data migration script to transfer data between your local and remote MySQL databases.

## Quick Start

### 1. Migrate from Local to Remote (Most Common)
```bash
# Dry run first (recommended)
npm run migrate:dry-run

# Actual migration
npm run migrate:local-to-remote
```

### 2. Migrate from Remote to Local
```bash
# Dry run first
npm run migrate-data -- remote-to-local --dry-run --verbose

# Actual migration
npm run migrate:remote-to-local
```

## Advanced Usage

### Custom Migration Options
```bash
# Migrate specific tables only
npm run migrate-data -- --source local --target remote --tables "users,departments,positions"

# Incremental migration (only new/changed records)
npm run migrate-data -- --source local --target remote --mode incremental

# Skip backup creation
npm run migrate-data -- --source local --target remote --no-backup

# Custom batch size for large datasets
npm run migrate-data -- --source local --target remote --batch-size 50

# Verbose logging
npm run migrate-data -- --source local --target remote --verbose
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run migrate:dry-run` | Test migration without making changes |
| `npm run migrate:local-to-remote` | Full migration from local to remote |
| `npm run migrate:remote-to-local` | Full migration from remote to local |
| `npm run migrate-data -- [options]` | Custom migration with options |

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source <type>` | Source database (local\|remote) | local |
| `--target <type>` | Target database (local\|remote) | remote |
| `--tables <tables>` | Comma-separated list of tables | all tables |
| `--mode <mode>` | Migration mode (full\|incremental) | full |
| `--dry-run` | Perform dry run without changes | false |
| `--no-backup` | Skip backup creation | false |
| `--batch-size <size>` | Records per batch | 100 |
| `--verbose` | Enable detailed logging | false |

## Migration Process

1. **Initialization**: Connects to both source and target databases
2. **Backup**: Creates backup of target database (unless `--no-backup`)
3. **Table Processing**: Migrates tables in dependency order:
   - Users, Departments, Positions, Grade Levels, Settings
   - Employees, Students, Subjects, Books
   - Courses, Subject Prerequisites, Course Sections
   - Enrollments, Schedules, Payments, Borrow Records
4. **Conflict Resolution**: Uses upsert for full migrations to handle duplicates
5. **Logging**: Creates detailed logs in `logs/migration-*.log`

## Database Configuration

### Local Database
- Host: localhost
- Username: root
- Password: letmein25
- Database: bc_mis

### Remote Database
- Configured via environment variables in `.env`:
  - `DB_HOST`: Remote database host
  - `DB_USERNAME`: Remote database username
  - `DB_PASSWORD`: Remote database password
  - `DB_DATABASE`: Remote database name

## Migration Modes

### Production Migration (`npm run migrate:prod`)
- Used in production environments (VPS/Docker)
- Executed automatically during deployment via `scripts/deploy.sh`
- Runs the compiled migration script located at `api/dist/scripts/run-migrations.js`

### Full Migration (`--mode full`)
- Transfers all records from source to target
- Uses upsert to handle existing records
- Recommended for initial setup or complete sync

### Incremental Migration (`--mode incremental`)
- Only transfers new/changed records since last sync
- Requires `createdAt` or `updatedAt` columns
- Faster for regular synchronization
- Tracks last sync time in `.last-sync` file

## Backup and Recovery

### Automatic Backups
- Created before each migration (unless `--no-backup`)
- Stored in `backups/backup-{target}-{timestamp}.json`
- Contains all existing data from target database

### Manual Backup
```bash
# Create backup before migration
npm run migrate-data -- --source remote --target local --dry-run
```

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify database credentials in `.env`
   - Check network connectivity to remote database
   - Ensure local MySQL is running

2. **SSL Certificate Issues**
   - Script uses `rejectUnauthorized: false` for remote connections
   - This is configured automatically

3. **Large Dataset Performance**
   - Reduce batch size: `--batch-size 50`
   - Use incremental mode for regular syncs
   - Monitor logs for progress

### Log Files
- All operations are logged to `logs/migration-*.log`
- Use `--verbose` for detailed output
- Check logs for error details and performance metrics

## Examples

### Initial Setup (Local to Remote)
```bash
# 1. Test first
npm run migrate:dry-run

# 2. Migrate all data
npm run migrate:local-to-remote
```

### Regular Sync (Incremental)
```bash
# Daily incremental sync
npm run migrate-data -- --mode incremental --verbose
```

### Specific Tables Only
```bash
# Migrate only user-related tables
npm run migrate-data -- --tables "users,employees,students"
```

### Development Workflow
```bash
# Pull latest data from remote to local
npm run migrate:remote-to-local

# Work on local development...

# Push changes back to remote
npm run migrate:local-to-remote
```

## Security Notes

- Local database uses default development password (`letmein25`)
- Remote database credentials are stored in `.env` (not committed to git)
- SSL connections are used for remote databases
- Backups contain sensitive data - handle appropriately