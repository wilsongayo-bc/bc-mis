-- Add externalLink column to books table
-- This script adds the externalLink column to the books table in the remote database

-- Check if column exists first (MySQL doesn't have IF NOT EXISTS for ALTER TABLE ADD COLUMN)
-- We'll use a procedure to handle this

DELIMITER $$

DROP PROCEDURE IF EXISTS AddExternalLinkColumn$$

CREATE PROCEDURE AddExternalLinkColumn()
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    -- Check if the column already exists
    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'books'
    AND COLUMN_NAME = 'externalLink';
    
    -- If column doesn't exist, add it
    IF column_exists = 0 THEN
        ALTER TABLE books 
        ADD COLUMN externalLink VARCHAR(500) NULL 
        AFTER thumbnailUrl;
        
        SELECT 'externalLink column added successfully' AS result;
    ELSE
        SELECT 'externalLink column already exists' AS result;
    END IF;
END$$

DELIMITER ;

-- Execute the procedure
CALL AddExternalLinkColumn();

-- Clean up
DROP PROCEDURE AddExternalLinkColumn;

-- Verify the column was added
DESCRIBE books;