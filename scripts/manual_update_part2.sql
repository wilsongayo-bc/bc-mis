-- SQL Script to manually update remote database (Part 2)
-- Covers tables: schedules, employees (users), course_sections

-- =================================================================
-- Table: schedules
-- Migrations: 
--  - 1770000000001-FixScheduleSubjectId.ts (Rename courseId -> subjectId)
--  - 1770008412415-ChangeDayOfWeekToString.ts (ENUM -> VARCHAR)
--  - 1770012951695-AddDateRangeToSchedules.ts (Add startDate, endDate)
-- =================================================================

-- 1. Rename courseId to subjectId and update FK
-- Note: Check if FK exists first using SHOW CREATE TABLE schedules
-- IMPORTANT: The foreign key name may vary on your server.

-- 1.1 Run this query to find the correct foreign key name:
-- SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'schedules' AND COLUMN_NAME = 'courseId' AND REFERENCED_TABLE_NAME = 'courses';

-- 1.2 Drop old FK (replace FK_NAME_HERE with the result from above):
-- NOTE: If the query above returned NO results, SKIP this step and proceed to 1.3.
-- ALTER TABLE schedules DROP FOREIGN KEY FK_NAME_HERE;

-- 1.3 Rename column
-- ERROR 1054 FIX: If you get "Unknown column 'courseId'", it means the column is already named 'subjectId' or missing.
-- Run this to check columns: DESCRIBE schedules;
-- If 'subjectId' exists, SKIP this command.
-- If 'courseId' exists, RUN this command.
-- ALTER TABLE schedules CHANGE COLUMN courseId subjectId varchar(36) NOT NULL;

-- 1.4 Add new FK to subjects table
-- Note: Check if FK 'FK_schedules_subject' already exists.
-- If not, run:
-- ALTER TABLE schedules ADD CONSTRAINT FK_schedules_subject FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE;

-- 2. Change dayOfWeek from ENUM to VARCHAR
ALTER TABLE schedules MODIFY COLUMN dayOfWeek VARCHAR(255) NOT NULL;

-- 3. Add date range columns
ALTER TABLE schedules 
ADD COLUMN startDate date NULL,
ADD COLUMN endDate date NULL;

-- =================================================================
-- Table: users (linked to employees)
-- Migration: 1758590900000-AddMissingUserColumns.ts
-- Description: Add middleInitial, username, position
-- =================================================================

ALTER TABLE users 
ADD COLUMN middleInitial varchar(5) NULL,
ADD COLUMN username varchar(50) NOT NULL,
ADD COLUMN position varchar(100) NOT NULL;

-- 4. Add unique index for username
-- WARNING: If you get "Duplicate index 'IDX_username'", it means it already exists. Safe to ignore.
-- ALTER TABLE users ADD UNIQUE INDEX IDX_username (username);


-- =================================================================
-- Table: course_sections (Sections)
-- Migration: 1770200000001-RemoveTeacherFromCourseSection.ts
-- (Already included in previous script, but repeated here for completeness if needed)
-- =================================================================

-- 1. Find FK: SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'course_sections' AND COLUMN_NAME = 'teacherId';
-- 2. Drop FK: ALTER TABLE course_sections DROP FOREIGN KEY FK_NAME_HERE;
-- 3. Drop Column: ALTER TABLE course_sections DROP COLUMN teacherId;
