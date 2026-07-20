-- Migration to rename courseId column to subjectId in schedules table
-- This fixes the schema mismatch causing 'Unknown column schedule.subjectId' error

ALTER TABLE schedules CHANGE COLUMN courseId subjectId VARCHAR(36) NOT NULL;

-- Update any foreign key constraints if they exist
-- Note: This assumes the column references the subjects table
ALTER TABLE schedules ADD CONSTRAINT FK_schedule_subject 
  FOREIGN KEY (subjectId) REFERENCES subjects(id) ON DELETE CASCADE;