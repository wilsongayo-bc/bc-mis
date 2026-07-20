/**
 * Validation middleware for student data
 */
export const validateStudentData = (req, res, next) => {
  const { firstName, lastName, email, gradeLevel, dateOfBirth } = req.body;
  const errors = [];

  // Required fields validation
  if (!firstName || !firstName.trim()) {
    errors.push('First name is required');
  }

  if (!lastName || !lastName.trim()) {
    errors.push('Last name is required');
  }

  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  if (!gradeLevel) {
    errors.push('Grade level is required');
  } else {
    // Grade level validation
    const validGradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    if (!validGradeLevels.includes(gradeLevel)) {
      errors.push('Invalid grade level');
    }
  }

  if (!dateOfBirth) {
    errors.push('Date of birth is required');
  } else {
    // Date validation
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    if (isNaN(birthDate.getTime()) || birthDate >= today) {
      errors.push('Invalid date of birth');
    }
  }

  // String length validations
  if (firstName && firstName.length > 50) {
    errors.push('First name must be less than 50 characters');
  }

  if (lastName && lastName.length > 50) {
    errors.push('Last name must be less than 50 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validation middleware for course data
 */
export const validateCourseData = (req, res, next) => {
  const { name, courseCode, department, gradeLevel, credits, description } = req.body;
  const errors = [];

  // Required fields validation
  if (!name || !name.trim()) {
    errors.push('Course name is required');
  }

  if (!courseCode || !courseCode.trim()) {
    errors.push('Course code is required');
  } else {
    // Course code format validation (e.g., MATH101, ENG1001)
    const codeRegex = /^[A-Z]{2,4}\d{3,4}$/;
    if (!codeRegex.test(courseCode.trim())) {
      errors.push('Course code must be in format like MATH101 or ENG1001');
    }
  }

  if (!department || !department.trim()) {
    errors.push('Department is required');
  }

  if (!gradeLevel) {
    errors.push('Grade level is required');
  } else {
    // Grade level validation
    const validGradeLevels = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
    if (!validGradeLevels.includes(gradeLevel)) {
      errors.push('Invalid grade level');
    }
  }

  if (credits !== undefined && credits !== null) {
    if (typeof credits !== 'number' || credits < 0 || credits > 10) {
      errors.push('Credits must be a number between 0 and 10');
    }
  }

  // String length validations
  if (name && name.length > 100) {
    errors.push('Course name must be less than 100 characters');
  }

  if (courseCode && courseCode.length > 20) {
    errors.push('Course code must be less than 20 characters');
  }

  if (department && department.length > 50) {
    errors.push('Department must be less than 50 characters');
  }

  if (description && description.length > 1000) {
    errors.push('Description must be less than 1000 characters');
  }

  // Validate department against allowed departments
  if (department) {
    const validDepartments = [
      'Mathematics',
      'English',
      'Science',
      'Social Studies',
      'Physical Education',
      'Art',
      'Music',
      'Technology',
      'Foreign Language',
      'Health',
      'Career Education'
    ];
    if (!validDepartments.includes(department)) {
      errors.push('Invalid department');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validation middleware for enrollment data
 */
export const validateEnrollmentData = (req, res, next) => {
  const { studentId, courseId, semester, year } = req.body;
  const errors = [];

  // Required fields validation
  if (!studentId) {
    errors.push('Student ID is required');
  } else if (typeof studentId !== 'number' || studentId <= 0) {
    errors.push('Student ID must be a positive number');
  }

  if (!courseId) {
    errors.push('Course ID is required');
  } else if (typeof courseId !== 'number' || courseId <= 0) {
    errors.push('Course ID must be a positive number');
  }

  if (!semester || !semester.trim()) {
    errors.push('Semester is required');
  } else {
    const validSemesters = ['Fall', 'Spring', 'Summer'];
    if (!validSemesters.includes(semester)) {
      errors.push('Invalid semester. Must be Fall, Spring, or Summer');
    }
  }

  if (!year) {
    errors.push('Year is required');
  } else {
    const currentYear = new Date().getFullYear();
    if (typeof year !== 'number' || year < currentYear - 1 || year > currentYear + 5) {
      errors.push(`Year must be between ${currentYear - 1} and ${currentYear + 5}`);
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

/**
 * Validation middleware for user data
 */
export const validateUserData = (req, res, next) => {
  const { email, firstName, lastName, role } = req.body;
  const errors = [];

  // Required fields validation
  if (!firstName || !firstName.trim()) {
    errors.push('First name is required');
  }

  if (!lastName || !lastName.trim()) {
    errors.push('Last name is required');
  }

  if (!email || !email.trim()) {
    errors.push('Email is required');
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email format');
    }
  }

  if (!role || !role.trim()) {
    errors.push('Role is required');
  } else {
    const validRoles = ['ADMIN', 'REGISTRAR', 'TEACHER', 'STUDENT', 'PARENT'];
    if (!validRoles.includes(role)) {
      errors.push('Invalid role');
    }
  }

  // String length validations
  if (firstName && firstName.length > 50) {
    errors.push('First name must be less than 50 characters');
  }

  if (lastName && lastName.length > 50) {
    errors.push('Last name must be less than 50 characters');
  }

  if (email && email.length > 100) {
    errors.push('Email must be less than 100 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};