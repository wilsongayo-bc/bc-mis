-- Dweezil's Code - Create course section for BTVTED-CP
-- This fixes the course display issue by creating an active course section

-- Generate a UUID for the section (you may need to replace this with an actual UUID)
-- Use an online UUID generator or run: SELECT UUID() in MySQL

SET @section_id = UUID();
SET @course_id = '8885e361-014d-11f1-969e-507b9d85c6a3';

-- Insert the course section
INSERT INTO course_sections (
    id,
    courseId,
    yearLevel,
    sectionName,
    credits,
    maxStudents,
    semester,
    academicYear,
    isActive,
    createdAt,
    updatedAt
) VALUES (
    @section_id,
    @course_id,
    'Fourth Year',
    'A',
    3,
    40,
    'First Semester',
    '2025-2026',
    1,
    NOW(),
    NOW()
);

-- Verify the section was created
SELECT 
    id,
    sectionName,
    courseId,
    yearLevel,
    isActive,
    academicYear,
    semester
FROM course_sections 
WHERE courseId = @course_id;

-- Show success message
SELECT '✅ Course section created successfully for BTVTED-CP!' AS Status;
