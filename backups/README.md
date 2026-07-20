# Book Backup System

This directory contains the backup system for the Coldea MIS book database.

## Directory Structure

```
backups/
├── books/                    # Book backup files
│   ├── books_backup_YYYY-MM-DD_HH.json     # JSON format backup
│   ├── books_backup_YYYY-MM-DD_HH.csv      # CSV format backup
│   ├── books_backup_YYYY-MM-DD_HH.sql      # SQL format backup
│   └── books_backup_YYYY-MM-DD_HH_metadata.json  # Backup metadata
└── README.md                 # This file
```

## Available Scripts

### Backup Commands

```bash
# Create a full backup of all books
npm run backup-books

# This will create:
# - JSON backup (complete data structure)
# - CSV backup (tabular format)
# - SQL backup (INSERT statements)
# - Metadata file (backup information)
```

### Restore Commands

```bash
# List available backup files
npm run restore-books:list

# Restore from JSON backup (dry run)
npm run restore-books:dry-run -- --file books_backup_2025-10-12_05.json --format json

# Restore from CSV backup (dry run)
npm run restore-books:dry-run -- --file books_backup_2025-10-12_05.csv --format csv

# Actual restore from JSON backup
npm run restore-books -- --file books_backup_2025-10-12_05.json --format json

# Restore with options
npm run restore-books -- --file books_backup_2025-10-12_05.json --format json --clear --skip-duplicates
```

## Restore Options

- `--file <filename>`: Specify the backup file to restore from
- `--format <json|csv>`: Specify the backup format (json or csv)
- `--clear`: Clear existing books before restore (use with caution!)
- `--skip-duplicates`: Skip books with duplicate ISBNs
- `--dry-run`: Preview what would be restored without making changes
- `--list`: List all available backup files

## Backup File Formats

### JSON Format
- Complete data structure with all fields
- Includes metadata and timestamps
- Best for full data restoration
- Human-readable format

### CSV Format
- Tabular format suitable for spreadsheet applications
- All book fields in comma-separated format
- Good for data analysis and reporting
- Compatible with Excel and other tools

### SQL Format
- Raw SQL INSERT statements
- Can be executed directly in MySQL
- Useful for database administrators
- Includes proper escaping and formatting

### Metadata Format
- Contains backup information
- Timestamp, version, and database details
- Record count and format information
- Useful for backup verification

## Usage Examples

### Creating a Backup
```bash
cd api
npm run backup-books
```

### Listing Available Backups
```bash
cd api
npm run restore-books:list
```

### Testing a Restore (Dry Run)
```bash
cd api
npm run restore-books:dry-run -- --file books_backup_2025-10-12_05.json --format json
```

### Performing an Actual Restore
```bash
cd api
npm run restore-books -- --file books_backup_2025-10-12_05.json --format json --skip-duplicates
```

## Important Notes

1. **Backup Frequency**: Run backups regularly, especially before major operations
2. **Storage**: Backup files are stored locally in the `backups/books/` directory
3. **Security**: Backup files contain sensitive data - handle appropriately
4. **Testing**: Always test restore operations with `--dry-run` first
5. **Duplicates**: Use `--skip-duplicates` to avoid ISBN conflicts during restore
6. **Clear Option**: The `--clear` option will delete all existing books - use with extreme caution

## File Naming Convention

Backup files follow this naming pattern:
- `books_backup_YYYY-MM-DD_HH.{format}`
- `books_backup_YYYY-MM-DD_HH_metadata.json`

Where:
- `YYYY-MM-DD`: Date of backup
- `HH`: Hour of backup (24-hour format)
- `{format}`: File format (json, csv, sql)

## Troubleshooting

### Common Issues

1. **Database Connection Errors**: Ensure your `.env` file has correct database credentials
2. **File Not Found**: Check that the backup file exists in the `backups/books/` directory
3. **Permission Errors**: Ensure the backup directory has write permissions
4. **Duplicate ISBN Errors**: Use `--skip-duplicates` option during restore

### Getting Help

Run any script without arguments to see available options:
```bash
npm run restore-books -- --help
```