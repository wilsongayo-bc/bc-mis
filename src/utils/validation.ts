/**
 * Validation utilities for user management forms
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Email validation regex pattern
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Password validation regex - at least 8 characters, one uppercase, one lowercase, one number
 * Allows letters, numbers, and common special characters including periods
 * NOTE: This is a fallback. Use validatePasswordWithRequirements for dynamic validation.
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&.#^()_+=\-[\]{}|;:,<>~`]{8,}$/;

/**
 * Password requirements interface
 */
export interface PasswordRequirements {
  minLength: number;
  requireSpecialChars: boolean;
  message: string;
}

/**
 * Validate password with dynamic requirements
 */
export const validatePasswordWithRequirements = (
  password: string,
  requirements: PasswordRequirements
): ValidationError | null => {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }

  if (password.length < requirements.minLength) {
    return {
      field: 'password',
      message: `Password must be at least ${requirements.minLength} characters long`
    };
  }

  if (requirements.requireSpecialChars) {
    const specialCharsRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (!specialCharsRegex.test(password)) {
      return {
        field: 'password',
        message: 'Password must contain at least one special character (!@#$%^&*)'
      };
    }
  }

  return null;
};

/**
 * Name validation regex - only letters, spaces, hyphens, and apostrophes
 */
const NAME_REGEX = /^[a-zA-Z\s'-]+$/;

/**
 * Validate email format
 */
export const validateEmail = (email: string): ValidationError | null => {
  if (!email.trim()) {
    return { field: 'email', message: 'Email is required' };
  }
  if (!EMAIL_REGEX.test(email)) {
    return { field: 'email', message: 'Please enter a valid email address' };
  }
  return null;
};

/**
 * Validate password strength
 */
export const validatePassword = (password: string): ValidationError | null => {
  if (!password) {
    return { field: 'password', message: 'Password is required' };
  }
  if (password.length < 8) {
    return { field: 'password', message: 'Password must be at least 8 characters long' };
  }
  if (!PASSWORD_REGEX.test(password)) {
    return {
      field: 'password',
      message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    };
  }
  return null;
};

/**
 * Validate name fields (first name, last name)
 */
export const validateName = (name: string, fieldName: string): ValidationError | null => {
  if (!name.trim()) {
    return { field: fieldName, message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required` };
  }
  if (name.trim().length < 2) {
    return { field: fieldName, message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least 2 characters long` };
  }
  if (!NAME_REGEX.test(name.trim())) {
    return { field: fieldName, message: `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} can only contain letters, spaces, hyphens, and apostrophes` };
  }
  return null;
};

/**
 * Validate role selection
 */
export const validateRole = (role: string, allowedRoles: string[]): ValidationError | null => {
  if (!role) {
    return { field: 'role', message: 'Role is required' };
  }
  if (!allowedRoles.includes(role)) {
    return { field: 'role', message: 'Invalid role selected' };
  }
  return null;
};

/**
 * Validate username field
 */
export const validateUsername = (username: string): ValidationError | null => {
  if (!username.trim()) {
    return { field: 'username', message: 'Username is required' };
  }
  if (username.trim().length < 3) {
    return { field: 'username', message: 'Username must be at least 3 characters long' };
  }
  if (username.trim().length > 50) {
    return { field: 'username', message: 'Username must not exceed 50 characters' };
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(username.trim())) {
    return { field: 'username', message: 'Username can only contain letters, numbers, dots, underscores, and hyphens' };
  }
  return null;
};

/**
 * Validate middle initial field
 */
export const validateMiddleInitial = (middleInitial: string): ValidationError | null => {
  if (middleInitial && middleInitial.trim().length > 5) {
    return { field: 'middleInitial', message: 'Middle initial must not exceed 5 characters' };
  }
  if (middleInitial && !/^[a-zA-Z.\s]*$/.test(middleInitial.trim())) {
    return { field: 'middleInitial', message: 'Middle initial can only contain letters, dots, and spaces' };
  }
  return null;
};

/**
 * Validate position field
 */
export const validatePosition = (position: string): ValidationError | null => {
  if (position && position.trim().length > 100) {
    return { field: 'position', message: 'Position must not exceed 100 characters' };
  }
  return null;
};

/**
 * Validate user creation form
 */
export const validateCreateUserForm = (data: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
  username?: string;
  middleInitial?: string;
  position?: string;
}, allowedRoles: string[], passwordRequirements?: PasswordRequirements): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate email
  const emailError = validateEmail(data.email);
  if (emailError) errors.push(emailError);

  // Validate first name
  const firstNameError = validateName(data.firstName, 'firstName');
  if (firstNameError) errors.push(firstNameError);

  // Validate last name
  const lastNameError = validateName(data.lastName, 'lastName');
  if (lastNameError) errors.push(lastNameError);

  // Validate password with dynamic requirements if provided
  const passwordError = passwordRequirements
    ? validatePasswordWithRequirements(data.password, passwordRequirements)
    : validatePassword(data.password);
  if (passwordError) errors.push(passwordError);

  // Validate role
  const roleError = validateRole(data.role, allowedRoles);
  if (roleError) errors.push(roleError);

  // Validate username (required)
  if (data.username !== undefined) {
    const usernameError = validateUsername(data.username);
    if (usernameError) errors.push(usernameError);
  }

  // Validate middle initial (optional)
  if (data.middleInitial !== undefined) {
    const middleInitialError = validateMiddleInitial(data.middleInitial);
    if (middleInitialError) errors.push(middleInitialError);
  }

  // Validate position (optional)
  if (data.position !== undefined) {
    const positionError = validatePosition(data.position);
    if (positionError) errors.push(positionError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate user update form
 */
export const validateUpdateUserForm = (data: {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  username?: string;
  middleInitial?: string;
  position?: string;
}, allowedRoles: string[]): ValidationResult => {
  const errors: ValidationError[] = [];

  // Validate email if provided
  if (data.email !== undefined) {
    const emailError = validateEmail(data.email);
    if (emailError) errors.push(emailError);
  }

  // Validate first name if provided
  if (data.firstName !== undefined) {
    const firstNameError = validateName(data.firstName, 'firstName');
    if (firstNameError) errors.push(firstNameError);
  }

  // Validate last name if provided
  if (data.lastName !== undefined) {
    const lastNameError = validateName(data.lastName, 'lastName');
    if (lastNameError) errors.push(lastNameError);
  }

  // Validate role if provided
  if (data.role !== undefined) {
    const roleError = validateRole(data.role, allowedRoles);
    if (roleError) errors.push(roleError);
  }

  // Validate username if provided
  if (data.username !== undefined) {
    const usernameError = validateUsername(data.username);
    if (usernameError) errors.push(usernameError);
  }

  // Validate middle initial if provided
  if (data.middleInitial !== undefined) {
    const middleInitialError = validateMiddleInitial(data.middleInitial);
    if (middleInitialError) errors.push(middleInitialError);
  }

  // Validate position if provided
  if (data.position !== undefined) {
    const positionError = validatePosition(data.position);
    if (positionError) errors.push(positionError);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate password reset form
 */
export const validatePasswordReset = (password: string): ValidationResult => {
  const errors: ValidationError[] = [];

  const passwordError = validatePassword(password);
  if (passwordError) errors.push(passwordError);

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validate CSV import data
 */
export const validateImportData = (data: Record<string, unknown>[]): ValidationResult => {
  const errors: ValidationError[] = [];
  const requiredFields = ['email', 'firstName', 'lastName', 'role'];

  data.forEach((row, index) => {
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field] || !row[field].toString().trim()) {
        errors.push({
          field: `row${index + 1}.${field}`,
          message: `Row ${index + 1}: ${field} is required`
        });
      }
    });

    // Validate email format
    if (row.email && typeof row.email === 'string') {
      const emailError = validateEmail(row.email);
      if (emailError) {
        errors.push({
          field: `row${index + 1}.email`,
          message: `Row ${index + 1}: ${emailError.message}`
        });
      }
    }

    // Validate names
    if (row.firstName && typeof row.firstName === 'string') {
      const firstNameError = validateName(row.firstName, 'firstName');
      if (firstNameError) {
        errors.push({
          field: `row${index + 1}.firstName`,
          message: `Row ${index + 1}: ${firstNameError.message}`
        });
      }
    }

    if (row.lastName && typeof row.lastName === 'string') {
      const lastNameError = validateName(row.lastName, 'lastName');
      if (lastNameError) {
        errors.push({
          field: `row${index + 1}.lastName`,
          message: `Row ${index + 1}: ${lastNameError.message}`
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get field-specific error message
 */
export const getFieldError = (errors: ValidationError[], fieldName: string): string | null => {
  const error = errors.find(err => err.field === fieldName);
  return error ? error.message : null;
};

/**
 * Check if field has error
 */
export const hasFieldError = (errors: ValidationError[], fieldName: string): boolean => {
  return errors.some(err => err.field === fieldName);
};