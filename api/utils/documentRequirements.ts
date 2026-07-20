/**
 * Interface for document requirement data used in student creation
 */
export interface StudentDocumentRequirement {
  id: string;
  type: string;
  name: string;
  description?: string;
  required: boolean;
  submitted: boolean;
  categoryId?: string;
  validationRules?: {
    maxFileSize?: number;
    allowedFileTypes?: string[];
    requiresVerification?: boolean;
  };
  applicableGradeLevels?: string[];
  expirationDays?: number;
  // Additional properties for document management
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  submittedDate?: Date;
  notes?: string;
  studentDocumentId?: string;
  group?: string;
}

const DEFAULT_DOCUMENT_MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Fetches document requirements for student registration from the database
 * @param gradeLevel - The grade level to filter requirements for
 * @returns Promise<StudentDocumentRequirement[]>
 */
export async function fetchDocumentRequirementsForRegistration(gradeLevel?: string): Promise<StudentDocumentRequirement[]> {
  try {
    const AppDataSource = (await import('../config/database')).AppDataSource;
    const DocumentRequirement = (await import('../entities/DocumentRequirement')).DocumentRequirement;
    
    const repository = AppDataSource.getRepository(DocumentRequirement);
    
    let query = repository.createQueryBuilder('doc');
    
    // Filter by grade level if provided
    if (gradeLevel) {
      query = query.where('JSON_CONTAINS(doc.applicableGradeLevels, :gradeLevel)', {
        gradeLevel: JSON.stringify(gradeLevel)
      });
    }
    
    const requirements = await query.getMany();
    
    console.log(`📋 Fetched ${requirements.length} document requirements for grade level: ${gradeLevel || 'all'}`);
    
    // Convert DocumentRequirement entities to StudentDocumentRequirement format
    return requirements.map(req => ({
      id: req.id,
      type: req.name, // Using name as type for compatibility
      name: req.name,
      description: req.description,
      required: req.isRequired,
      submitted: false, // Default to false for new registrations
      categoryId: req.categoryId,
      validationRules: req.validationRules,
      applicableGradeLevels: req.applicableGradeLevels,
      expirationDays: req.expirationDays
    }));
  } catch (error) {
    console.error('❌ Error fetching document requirements:', error);
    return [];
  }
}

/**
 * Dweezil's Code
 * Get default document requirements as fallback
 * This is used as a backup when the dynamic fetch fails
 * Updated to match new document requirements specifications
 */
export function getDefaultDocumentRequirements(): StudentDocumentRequirement[] {
  return [
    {
      id: 'default-form9-report-card',
      type: 'original_form_9_report_card',
      name: 'Original form 9/Report Card',
      description: 'Original Form 9 or Report Card from previous school',
      required: true,
      submitted: false,
      validationRules: {
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
        requiresVerification: true
      }
    },
    {
      id: 'default-good-moral',
      type: 'original_good_moral_certificate',
      name: 'Original Good Moral Certificate',
      description: 'Original Good Moral Certificate from previous school',
      required: true,
      submitted: false,
      validationRules: {
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
        requiresVerification: true
      }
    },
    {
      id: 'default-diploma',
      type: 'certificate_of_graduation_diploma_photocopy',
      name: 'Certificate of graduation/Diploma (photocopy)',
      description: 'Photocopy of Certificate of Graduation or Diploma',
      required: true,
      submitted: false,
      validationRules: {
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
        requiresVerification: true
      }
    },
    {
      id: 'default-psa-cert',
      type: 'original_psa_certificate',
      name: 'Original PSA Certificate',
      description: 'Original PSA Birth Certificate',
      required: true,
      submitted: false,
      validationRules: {
        allowedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
        requiresVerification: true
      }
    },
    {
      id: 'default-passport-photos',
      type: '3_copies_2x2_passport_picture_recent',
      name: '3 copies of 2x2/passport picture (recent)',
      description: '3 copies of recent 2x2 or passport-sized pictures',
      required: true,
      submitted: false,
      validationRules: {
        allowedFileTypes: ['jpg', 'jpeg', 'png'],
        maxFileSize: DEFAULT_DOCUMENT_MAX_FILE_SIZE, // 10MB
        requiresVerification: true
      }
    }
  ];
}

export function getPublicPreListingRequirements(): StudentDocumentRequirement[] {
  return [
    // PSA Birth Certificate temporarily removed from initial requirements but kept in codebase
    // {
    //   id: 'prelist-psa',
    //   type: 'psa_birth_certificate',
    //   name: 'Photocopy of PSA Birth Certificate',
    //   description: 'Provide a photocopy of PSA-issued birth certificate',
    //   required: true,
    //   submitted: false
    // },
    {
      id: 'bc0b899c-0180-4835-9c13-1f638f2c1b8d',
      type: 'first_sem_grade_fresh_2025_2026',
      name: 'Photocopy of First Semester Report Card (S.Y. 2025–2026)',
      description: 'First Semester Report Card for S.Y. 2025–2026',
      required: true,
      submitted: false,
      group: 'freshmen'
    },
    {
      id: 'bff481dd-7ddd-41ad-b4f3-c34033e72cb7',
      type: 'coe_second_sem_fresh_2025_2026',
      name: 'Certificate of Enrollment (CoE) for Second Semester (S.Y. 2025–2026)',
      description: 'Certificate of Enrollment (CoE) for the Second Semester of S.Y. 2025–2026',
      required: true,
      submitted: false,
      group: 'freshmen'
    },
    {
      id: 'a997fc62-17c8-43aa-b788-d2e0f1575117',
      type: 'grade12_report_card',
      name: 'Photocopy of Complete Grade 12 Report Card (First & Second Semesters)',
      description: 'Complete Grade 12 (SHS) Report Card for both the First and Second Semesters',
      required: true,
      submitted: false,
      group: 'grade12'
    },
    {
      id: '14b86acd-9cc7-4783-beed-08519f257db1',
      type: 'als_certificate',
      name: 'Photocopy of Certificate of Rating (COR) - SHS Level A&E Test',
      description: 'Certificate of Rating (COR) for the Senior High School (SHS) level of the Accreditation and Equivalency (A&E) Test',
      required: true,
      submitted: false,
      group: 'als'
    },
    {
      id: '8e40983c-d926-41cc-b818-7a191e7ddd96',
      type: 'transferee_tor',
      name: 'Photocopy of Transcript of Records (TOR) or Informative Copy of Grades',
      description: 'Transcript of Records (TOR) or Informative Copy of Grades from previous school',
      required: true,
      submitted: false,
      group: 'transferee'
    },
    {
      id: 'cb294b8f-3b4d-4c7e-9af9-40f7628f10c4',
      type: 'transferee_hd',
      name: 'Certificate of Transfer Credential / Honorable Dismissal',
      description: 'Certificate of Transfer Credential or Honorable Dismissal from previous school',
      required: false,
      submitted: false,
      group: 'transferee'
    }
  ];
}
