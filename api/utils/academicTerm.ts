import { AppDataSource } from '../config/database';
import { AcademicYear } from '../entities/AcademicYear';
import { Settings } from '../entities/Settings';

const DEFAULT_ACADEMIC_YEAR = '2024-2025';
const DEFAULT_SEMESTER = 'First Semester';

type SemesterLabel = 'First Semester' | 'Second Semester' | 'Summer';

const normalizeSemester = (semester: string): SemesterLabel | null => {
  const trimmed = semester.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (lower === '1' || lower === 'first' || lower === 'first semester') return 'First Semester';
  if (lower === '2' || lower === 'second' || lower === 'second semester') return 'Second Semester';
  if (lower === '3' || lower === 'summer') return 'Summer';

  if (trimmed === 'First Semester' || trimmed === 'Second Semester' || trimmed === 'Summer') return trimmed;

  return null;
};

export const getCurrentAcademicYear = async (): Promise<string> => {
  const repo = AppDataSource.getRepository(AcademicYear);
  const current = await repo.findOne({ where: { isActive: true } });
  return current?.year ?? DEFAULT_ACADEMIC_YEAR;
};

export const getCurrentSemester = async (): Promise<SemesterLabel> => {
  const repo = AppDataSource.getRepository(Settings);
  const current = await repo.findOne({ where: { key: 'semester' } });

  if (!current?.value) return DEFAULT_SEMESTER;

  const normalized = normalizeSemester(current.value);
  return normalized ?? DEFAULT_SEMESTER;
};

export const getEffectiveAcademicTerm = async (params: {
  academicYear?: unknown;
  semester?: unknown;
}): Promise<{ academicYear: string; semester: SemesterLabel }> => {
  const requestedAcademicYear =
    typeof params.academicYear === 'string' && params.academicYear.trim()
      ? params.academicYear.trim()
      : null;

  const requestedSemester =
    typeof params.semester === 'string' && params.semester.trim() ? normalizeSemester(params.semester) : null;

  const [academicYear, semester] = await Promise.all([
    requestedAcademicYear ? Promise.resolve(requestedAcademicYear) : getCurrentAcademicYear(),
    requestedSemester ? Promise.resolve(requestedSemester) : getCurrentSemester()
  ]);

  return { academicYear, semester };
};

