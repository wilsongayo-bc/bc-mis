SELECT JSON_OBJECT(
  'employees', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', e.id, 'email', LOWER(u.email))) FROM employees e JOIN users u ON e.userId = u.id),
  'subjects', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'code', s.code)) FROM subjects s),
  'courses', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', c.id, 'courseCode', c.courseCode)) FROM courses c),
  'sections', (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', cs.id, 'courseId', cs.courseId, 'yearLevel', cs.yearLevel, 'sectionName', cs.sectionName, 'semester', cs.semester, 'academicYear', cs.academicYear)) FROM course_sections cs)
) as result;
