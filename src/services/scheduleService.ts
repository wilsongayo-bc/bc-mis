import api from '../lib/api';

export interface Schedule {
  id: string;
  subjectId: string;
  courseSectionId: string;
  teacherId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  semester: string;
  academicYear: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  subject?: {
    id: string;
    code: string;
    name: string;
    units: number;
  };
  courseSection?: {
    id: string;
    sectionName: string;
    yearLevel: string;
    course?: {
      id: string;
      code: string;
      name: string;
    };
  };
  teacher?: {
    id: string;
    user?: {
      firstName: string;
      lastName: string;
    };
  };
}

export interface ScheduleFilters {
  page?: number;
  limit?: number;
  subjectId?: string;
  teacherId?: string;
  room?: string;
  sectionName?: string;
  dayOfWeek?: string;
  semester?: string;
  academicYear?: string;
  isActive?: boolean;
  courseId?: string;
  yearLevel?: string;
}

export interface ScheduleResponse {
  success: boolean;
  data: Schedule[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export const scheduleService = {
  /**
   * Get all schedules with filtering
   */
  getSchedules: async (filters: ScheduleFilters = {}): Promise<ScheduleResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    const response = await api.get<ScheduleResponse>(`/schedules?${params.toString()}`);
    return response.data;
  },

  /**
   * Get today's schedules for the current user (teacher)
   */
  getTodaySchedules: async (): Promise<Schedule[]> => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const response = await scheduleService.getSchedules({
      dayOfWeek: today,
      isActive: true,
      limit: 100 // Get all for today
    });
    return response.data;
  }
};
