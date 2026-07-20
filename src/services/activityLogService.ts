import api from '../lib/api';

export interface ActivityLog {
  id: string;
  userId: string;
  role: string;
  action: string;
  method: string;
  endpoint: string;
  params?: string;
  statusCode: number;
  ip?: string;
  userAgent?: string;
  createdAt: string;
  username?: string;
  email?: string;
}

export interface FetchActivityLogsResponse {
  success: boolean;
  data: ActivityLog[];
  total: number;
  page: number;
  limit: number;
}

export const fetchActivityLogs = async (params: {
  page?: number;
  limit?: number;
  method?: string;
  username?: string;
  role?: string;
  endpoint?: string;
  statusCode?: number;
  from?: string;
  to?: string;
} = {}): Promise<FetchActivityLogsResponse> => {
  const response = await api.get('/activity-logs', { params });
  return response.data as FetchActivityLogsResponse;
};
