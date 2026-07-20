// Fee Types
export enum FeeType {
  TUITION = 'TUITION',
  MISCELLANEOUS = 'MISC',
  LABORATORY = 'LAB',
  OTHER = 'OTHER'
}

export interface Fee {
  id: string;
  name: string;
  description?: string;
  amount: number;
  type: FeeType;
  isPerUnit: boolean;
  courseId?: string;
  yearLevel?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  course?: {
    id: string;
    courseCode: string;
    name: string;
  };
}

export interface CreateFeeData {
  name: string;
  description?: string;
  amount: number;
  type: FeeType;
  isPerUnit: boolean;
  courseId?: string;
  yearLevel?: number;
  isActive?: boolean;
}

export interface UpdateFeeData {
  name?: string;
  description?: string;
  amount?: number;
  type?: FeeType;
  isPerUnit?: boolean;
  courseId?: string;
  yearLevel?: number;
  isActive?: boolean;
}

export interface FeeFilters {
  courseId?: string;
  yearLevel?: number;
  type?: FeeType;
  isActive?: boolean;
}

export interface FeeState {
  fees: Fee[];
  currentFee: Fee | null;
  isLoading: boolean;
  error: string | null;
  filters: FeeFilters;
}
