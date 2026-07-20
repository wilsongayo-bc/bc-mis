/**
 * Utility functions for generating student IDs and temporary IDs
 */

import { DocumentRequirement } from '../entities/Student';

/**
 * Generate a temporary ID in format TEMP-YYYY-XXXXX
 * @returns string - Temporary ID
 */
export function generateTemporaryId(): string {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `TEMP-${year}-${randomNumber}`;
}

/**
 * Generate a real student ID in format YYYY-XXXXX
 * @returns string - Student ID
 */
export function generateStudentId(): string {
  const year = new Date().getFullYear();
  const randomNumber = Math.floor(Math.random() * 99999).toString().padStart(5, '0');
  return `${year}-${randomNumber}`;
}

/**
 * Default required documents for student registration
 */
export const DEFAULT_REQUIRED_DOCUMENTS: DocumentRequirement[] = [
  {
    type: 'birth_certificate',
    name: 'Birth Certificate',
    required: true,
    submitted: false
  },
  {
    type: 'id_copy',
    name: 'ID Copy (Student or Guardian)',
    required: true,
    submitted: false
  },
  {
    type: 'medical_records',
    name: 'Medical Records/Health Certificate',
    required: true,
    submitted: false
  },
  {
    type: 'previous_school_records',
    name: 'Previous School Records/Transcript',
    required: false,
    submitted: false
  },
  {
    type: 'passport_photo',
    name: 'Passport-sized Photos',
    required: true,
    submitted: false
  },
  {
    type: 'proof_of_address',
    name: 'Proof of Address',
    required: true,
    submitted: false
  }
];