-- Dweezil's Code - Issue #4: Seed initial document requirements
-- This fixes the 404 error when uploading Initial Requirements documents

-- Insert the Grade 12 Report Card requirement (Initial Requirement)
INSERT INTO `document_requirements` (
  `id`,
  `name`,
  `description`,
  `is_required`,
  `is_initial`,
  `category_id`,
  `validation_rules`,
  `created_at`,
  `updated_at`
) VALUES (
  'a997fc62-17c8-43aa-b788-d2e0f1575117',
  'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
  'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
  1,
  1,
  'grade12',
  '{"maxFileSize":10485760,"allowedFileTypes":["image/jpeg","image/png","application/pdf"]}',
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `updated_at` = NOW();
