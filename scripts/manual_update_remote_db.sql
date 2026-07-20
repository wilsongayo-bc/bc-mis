-- SQL Script to manually update remote database
-- Generated based on pending migrations for 'develop' branch updates

-- =================================================================
-- Migration: 1770200000000-AddInitialRequirements.ts
-- Description: Add missing initial requirements for pre-registration
-- =================================================================

INSERT IGNORE INTO document_requirements (id, name, description, is_required, is_initial, created_at, updated_at) VALUES 
('bc0b899c-0180-4835-9c13-1f638f2c1b8d', 'Photocopy of First Semester Report Card (S.Y. 2025–2026)', 'First semester report card for currently enrolled Grade 12 students', 1, 1, NOW(), NOW()),
('bff481dd-7ddd-41ad-b4f3-c34033e72cb7', 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)', 'Certificate of Enrollment for second semester', 1, 1, NOW(), NOW()),
('a997fc62-17c8-43aa-b788-d2e0f1575117', 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)', 'Complete Grade 12 report card for both semesters', 1, 1, NOW(), NOW()),
('d0c09f95-40fb-66dd-e0bb-959383808440', 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test', 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test', 1, 1, NOW(), NOW()),
('e1d1a906-51ac-77ee-f1cc-a6a494919551', 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades', 'Transcript of Records (TOR) or Informative Copy of Grades from previous school', 1, 1, NOW(), NOW()),
('f2e2a917-62ad-88ff-f2dd-a7a595020662', 'Certificate of Transfer Credential / Honorable Dismissal', 'Certificate of Transfer Credential or Honorable Dismissal from previous school', 0, 1, NOW(), NOW());

-- =================================================================
-- Migration: 1770200000001-RemoveTeacherFromCourseSection.ts
-- Description: Drop teacherId column from course_sections
-- IMPORTANT: The foreign key name may vary on your server.
-- =================================================================

-- 1. Run this query to find the correct foreign key name:
-- SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_NAME = 'course_sections' AND COLUMN_NAME = 'teacherId' AND REFERENCED_TABLE_NAME = 'employees';

-- 2. Drop the Foreign Key using the name found above (replace FK_NAME_HERE):
-- ALTER TABLE course_sections DROP FOREIGN KEY FK_NAME_HERE;

-- 3. Drop the column (only after dropping the foreign key):
-- ALTER TABLE course_sections DROP COLUMN teacherId;

-- Note: If you receive Error 1091 (check that column/key exists), it likely means the Foreign Key or Column is already gone or named differently.
-- If the column exists but has no foreign key, you can just run:
-- ALTER TABLE course_sections DROP COLUMN teacherId;


-- =================================================================
-- Migration: 1770550000000-AddDatesToAcademicYear.ts
-- Description: Add startDate and endDate to academic_years
-- =================================================================

ALTER TABLE academic_years 
ADD COLUMN startDate date NULL COMMENT 'Start date of the academic year',
ADD COLUMN endDate date NULL COMMENT 'End date of the academic year';

-- =================================================================
-- Migration: 1770560500000-FixScheduleSemesterValues.ts
-- Description: Update semester values in schedules table
-- =================================================================

UPDATE schedules 
SET semester = 'First Semester' 
WHERE semester = 'FIRST';

UPDATE schedules 
SET semester = 'Second Semester' 
WHERE semester = 'SECOND';
