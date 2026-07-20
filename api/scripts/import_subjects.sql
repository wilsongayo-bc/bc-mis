-- Generated SQL Import Script
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data
DELETE FROM enrollments;
DELETE FROM schedules;
DELETE FROM course_sections;
DELETE FROM subject_prerequisites;
DELETE FROM subjects;

-- Ensure Departments Exist
INSERT INTO departments (id, code, name, description, isActive) VALUES (UUID(), 'BSIS', 'Bachelor of Science in Information Systems', 'Department of BSIS', 1) ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO departments (id, code, name, description, isActive) VALUES (UUID(), 'BTVTED', 'Bachelor of Technical-Vocational Teacher Education', 'Department of BTVTED', 1) ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Insert Subjects from subjects-data-template-BSIS.json
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CC 100', 'INTRODUCTION TO COMPUTING', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CC 101', 'COMPUTER PROGRAMMING 1', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 101', 'PURPOSIVE COMMUNICATION', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 102', 'UNDERSTANDING THE SELF', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 103', 'READINGS IN THE PHILIPPINE HISTORY', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GEELECT 101', 'LIVING IN THE IT ERA', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 104', 'SCIENCE, TECHNOLOGY & SOCIETY', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GEELECT 102', 'THE ENTREPRENEURIAL MIND', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PATHFit 1', 'PHYSICAL FITNESS AND HEALTH', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'NSTP 1', 'NATIONAL SERVICE TRAINING PROGRAM 1', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 101', 'FUNDAMENTALS OF INFORMATION SYSTEMS', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CC 102', 'COMPUTER PROGRAMMING II', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'HCI 1', 'HUMAN COMPUTER INTERACTION', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 105', 'MATHEMATICS IN THE MODERN WORLD', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GEELECT 103', 'PHILIPPINE POPULAR CULTURE', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 106', 'THE CONTEMPORARY WORLD', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PATHFit 2', 'DANCE & RHYTHMIC ACVITVITIES', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'NSTP 2', 'NATIONAL SERVICE TRAINING PROGRAM 2', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CC 103', 'DATA STRUCTURES AND ALGORITHMS', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 102', 'PROFESSIONAL ISSUES IN INFORMATION SYSTEMS', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 103', 'IT INFRASTRUCTURES AND NETWORK TECHNOLOGIES', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'BED 101', 'ORGANIZATION AND MANAGEMENT CONCEPTS', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'BED 102', 'FINANCIAL MANAGEMENT', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'DM 101', 'DISCRETE MATHEMATICS', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 107', 'ART APPRECIATION', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PATHFit 3', 'INDIVIDUAL AND DUAL SPORTS', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CC 104', 'INFORMATION MANAGEMENT', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 104', 'SYSTEM ANALYSIS & DESIGN', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IPT 101', 'INTEGRATIVE PROGRAMMING AND TECHNOLOGIES', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'BED 103', 'BUSINESS PROCESS MANAGEMENT', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'BED 104', 'EVALUATION OF BUSINESS PERFORMANCE', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ISEL # 1', 'IS PROFESSIONAL ELECTIVE # 1', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GECC 108', 'ETHICS', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PATHFit 4', 'TEAM SPORTS', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'RIZAL', 'LIFE AND WORKS OF RIZAL', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 105', 'ENTERPRISE ARCHITECTURE', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 106', 'IT SECURITY AND MANAGEMENT', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ISEL # 2', 'IS PROFESSIONAL ELECTIVE # 2', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'DM 102', 'QUANTITATIVE METHODS', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'RESEARCH', 'METHODS OF RESEARCH IN COMPUTING', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CC 105', 'APPLICATION DEVELOPMENT AND EMERGING TECHNOLOGIES', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CAP 101', 'CAPSTONE PROJECT I', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 107', 'IS PROJECT MANAGEMENT', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 108', 'SOFTWARE ENGINEERING', 3, 2, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ISEL # 3', 'IS PROFESSIONAL ELECTIVE # 3', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'CAP 102', 'CAPSTONE PROJECT II', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'IS 109', 'IS STRATEGY, MANAGEMENT AND ACQUISITION', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ISEL # 4', 'IS PROFESSIONAL ELECTIVE # 4', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PRACTICUM', 'PRACTICUM FOR INFORMATION SYSTEMS (486 HOURS)', 6, 0, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BSIS' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);

-- Insert Subjects from subjects-data-template-BTVTED.json
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 101', 'Understanding Self', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 102', 'Reading in Philippine History', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 103', 'Purposive Communication', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE Elective 1', 'The Entrepreneurial Mind', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE - FC 101', 'The Child and Adolescent Learner and Learning Principles', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 108', 'Science Technology and Society', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GC Elective 3', 'Living in the IT Era', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PathFit 1', 'Physical Fitness', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'NSTP 1', 'National Service Training Program 1', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 104', 'Mathematics in Modern World', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE Elective 2', 'Philippine Popular Culture', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 105', 'The Contemporary World', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-PC 201', 'Facilitating Learner-Centered Teaching: The Learner Centered Approaches with Emphasis on Trainers Methodology 1', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-FC 103', 'The Teacher and the Community, School Culture and Organizational leadership with Focus in the Philippine TVET', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-FC 104', 'Foundation of Special and Inclusive Education', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-PC 205', 'Technology for Teaching and learning 1', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PathFit 2', 'Rhythmic Activities', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'NSTP 2', 'National Service Training Program 2', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC-IAFA', 'Introduction to AFA', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC-ICT EC', 'Teaching ICT as an Exploratory Course', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-PC 207', 'Building and enhancing New Literacies Across the Curriculum', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-PC 203', 'Assessment in Learning 1', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-PC 202', 'The Andragogy of Learning Including Principles of Trainer''s Methodology', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC-IIA', 'Introduction to Industrial Arts', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC-Entrep', 'Entrepreneurship', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT-CP 1', 'Computer Programming 1', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC- TCC IA', 'Teaching Common Competencies in IA', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PathFit 3', 'Individual and Dual Sports', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC - HEL', 'Home Economics Literacy', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT-CP 2', 'Computer Programming 2', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 107', 'Art Appreciation', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TTL 2', 'Technology for Teaching and Learning 2', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE -PC 206', 'Curriculum Development and Evaluation with Emphasis on Trainers Methodology 2', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE CC 106', 'Ethics', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-PC 204', 'Assessment in Learning 2 with Focus on Trainers Methodology 1&2', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 3', 'Data Structure and Algorithms', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'PathFit 4', 'Team Sports', 2, 2, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 4', 'Object Oriented Programming', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 5', 'Information Management', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC- TCC HE', 'Teaching Common Competencies in HE', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 6', 'System Analysis and Design', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TV-AC RES.1', 'Technology Research 1(Methods of Research)', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'GE-LWR', 'Life and Works of Rizal', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TV-AC WLE', 'Work-based Learning with Emphasis on Trainers'' Methodology', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 7', 'Human Computer Interaction', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 8', 'Integrative Programming and Technologies 1', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TV-AC RES. 2', 'Technology Research 2(Undergrad Thesis/Research Paper)', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 9', 'Software Engineering', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC -TCC ICT', 'Teaching Competencies in ICT', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-FC 102', 'The Teaching Profession', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 10', 'Integrative Programming and Technologies 2', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TLE IC- TCC AFA', 'Teaching Common Competence in AFA', 3, 3, 0, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 11', 'Web System and Technologies', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'ICT -CP 12', 'Application Development and Emerging Technologies', 3, 2, 1, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'FS 01', 'Field Study 1', 3, 0, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'FS 02', 'Field Study 2', 3, 0, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'SIT', 'Supervised Industrial Training', 3, 0, 3, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);
INSERT INTO subjects (id, code, name, units, lectureHours, labHours, description, isActive, departmentId)
              VALUES (UUID(), 'TE-ELC TI', 'Teaching Internship', 6, 0, 6, NULL, 1, (SELECT id FROM departments WHERE code = 'BTVTED' LIMIT 1))
              ON DUPLICATE KEY UPDATE
                name = VALUES(name),
                units = VALUES(units),
                lectureHours = VALUES(lectureHours),
                labHours = VALUES(labHours),
                description = VALUES(description),
                departmentId = VALUES(departmentId),
                isActive = VALUES(isActive);

-- Insert Prerequisites
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'CC 101' 
                    WHERE s1.code = 'CC 102';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'CC 100' 
                    WHERE s1.code = 'HCI 1';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'GECC 104' 
                    WHERE s1.code = 'GECC 105';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'GEELECT 101' 
                    WHERE s1.code = 'GEELECT 103';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'GEELECT 102' 
                    WHERE s1.code = 'GEELECT 103';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'GECC 103' 
                    WHERE s1.code = 'GECC 106';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'PATHFit 1' 
                    WHERE s1.code = 'PATHFit 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'NSTP 1' 
                    WHERE s1.code = 'NSTP 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'CC 102' 
                    WHERE s1.code = 'CC 103';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '2nd year Standing' 
                    WHERE s1.code = 'IS 102';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'IS 101' 
                    WHERE s1.code = 'IS 103';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '2nd year Standing' 
                    WHERE s1.code = 'BED 101';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'corequisite' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'BED 101' 
                    WHERE s1.code = 'BED 102';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'GECC 105' 
                    WHERE s1.code = 'DM 101';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'GECC 106' 
                    WHERE s1.code = 'GECC 107';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'PathFit 2' 
                    WHERE s1.code = 'PATHFit 3';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'CC 103' 
                    WHERE s1.code = 'CC 104';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'IS 103' 
                    WHERE s1.code = 'IS 104';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'HCI' 
                    WHERE s1.code = 'IPT 101';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'BED 102' 
                    WHERE s1.code = 'BED 103';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'corequisite' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'BED 103' 
                    WHERE s1.code = 'BED 104';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '2nd year Standing' 
                    WHERE s1.code = 'ISEL # 1';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'PathFit 3' 
                    WHERE s1.code = 'PATHFit 4';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'IS 104' 
                    WHERE s1.code = 'IS 105';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '3rd year Standing' 
                    WHERE s1.code = 'IS 106';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ISEL # 1' 
                    WHERE s1.code = 'ISEL # 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'DM 101' 
                    WHERE s1.code = 'DM 102';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '3rd year Standing' 
                    WHERE s1.code = 'RESEARCH';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'IPT 101' 
                    WHERE s1.code = 'CC 105';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'CC104' 
                    WHERE s1.code = 'CC 105';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'RESEARCH' 
                    WHERE s1.code = 'CAP 101';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'DM 102' 
                    WHERE s1.code = 'IS 107';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'IS 105' 
                    WHERE s1.code = 'IS 108';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ISEL # 2' 
                    WHERE s1.code = 'ISEL # 3';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'CAP 101' 
                    WHERE s1.code = 'CAP 102';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'IS 106' 
                    WHERE s1.code = 'IS 109';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ISEL # 3' 
                    WHERE s1.code = 'ISEL # 4';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '4th year standing' 
                    WHERE s1.code = 'PRACTICUM';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'PE 1' 
                    WHERE s1.code = 'PathFit 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'NSTP 1' 
                    WHERE s1.code = 'NSTP 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'PE 2' 
                    WHERE s1.code = 'PathFit 3';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT-CP 1' 
                    WHERE s1.code = 'ICT-CP 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'TTL1' 
                    WHERE s1.code = 'TTL 2';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ASL 1' 
                    WHERE s1.code = 'TE-PC 204';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT-CP 2' 
                    WHERE s1.code = 'ICT -CP 3';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'PE 3' 
                    WHERE s1.code = 'PathFit 4';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 3' 
                    WHERE s1.code = 'ICT -CP 4';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 4' 
                    WHERE s1.code = 'ICT -CP 5';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 5' 
                    WHERE s1.code = 'ICT -CP 6';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 6' 
                    WHERE s1.code = 'ICT -CP 7';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 7' 
                    WHERE s1.code = 'ICT -CP 8';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 8' 
                    WHERE s1.code = 'ICT -CP 9';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 9' 
                    WHERE s1.code = 'ICT -CP 10';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 10' 
                    WHERE s1.code = 'ICT -CP 11';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = 'ICT -CP 11' 
                    WHERE s1.code = 'ICT -CP 12';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '4th yr. Standing' 
                    WHERE s1.code = 'FS 01';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '4th yr. Standing' 
                    WHERE s1.code = 'FS 02';
INSERT IGNORE INTO subject_prerequisites (id, subjectId, prerequisiteId, category) 
                    SELECT UUID(), s1.id, s2.id, 'required' 
                    FROM subjects s1 
                    JOIN subjects s2 ON s2.code = '4th yr. Standing' 
                    WHERE s1.code = 'TE-ELC TI';

SET FOREIGN_KEY_CHECKS = 1;
