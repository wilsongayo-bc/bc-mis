import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

interface AcademicYear {
  id: number;
  year: string;
  isActive: boolean;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface UseAcademicYearReturn {
  academicYear: string;
  currentAcademicYear: AcademicYear | null;
  academicYears: AcademicYear[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  fetchAllAcademicYears: () => Promise<void>;
  updateAcademicYear: (newYear: string) => Promise<boolean>;
  createAcademicYear: (year: string, description?: string, startDate?: string, endDate?: string) => Promise<boolean>;
  updateAcademicYearDetails: (id: number, year: string, description?: string, startDate?: string, endDate?: string) => Promise<boolean>;
  deleteAcademicYear: (id: number) => Promise<boolean>;
  setCurrentAcademicYear: (id: number) => Promise<boolean>;
}

/**
 * Hook to manage the current academic year setting
 * Provides global access to the academic year across the application
 */
export const useAcademicYear = (): UseAcademicYearReturn => {
  const [academicYear, setAcademicYear] = useState<string>('2024-2025');
  const [currentAcademicYear, setCurrentAcademicYearState] = useState<AcademicYear | null>(null);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAcademicYear = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/settings/academic-year');
      
      if (response.data.year) {
        setAcademicYear(response.data.year);
        // If the response contains the full object (has id), set it
        if (response.data.id) {
          setCurrentAcademicYearState(response.data);
        }
      }
    } catch (err) {
      console.error('Error fetching academic year:', err);
      setError('Failed to fetch academic year');
      // Keep default value on error
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllAcademicYears = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const response = await api.get('/academic-years');
      
      if (response.data && Array.isArray(response.data)) {
        setAcademicYears(response.data);
      }
    } catch (err) {
      console.error('Error fetching all academic years:', err);
      setError('Failed to fetch academic years');
    }
  }, []);

  const updateAcademicYear = useCallback(async (newYear: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await api.put('/settings/academic-year', {
        year: newYear
      });
      
      if (response.data.success) {
        setAcademicYear(newYear);
        // Refresh the academic years list to update active status
        await fetchAllAcademicYears();
        return true;
      } else {
        setError(response.data.error || 'Failed to update academic year');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error updating academic year:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update academic year';
      setError(errorMessage);
      return false;
    }
  }, [fetchAllAcademicYears]);

  const createAcademicYear = useCallback(async (year: string, description?: string, startDate?: string, endDate?: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await api.post('/academic-years', {
        year,
        description,
        startDate,
        endDate
      });
      
      if (response.data && response.data.id) {
        // Refresh the academic years list
        await fetchAllAcademicYears();
        return true;
      } else {
        setError('Failed to create academic year');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error creating academic year:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create academic year';
      setError(errorMessage);
      return false;
    }
  }, [fetchAllAcademicYears]);

  const updateAcademicYearDetails = useCallback(async (id: number, year: string, description?: string, startDate?: string, endDate?: string): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await api.put(`/academic-years/${id}`, {
        year,
        description,
        startDate,
        endDate
      });
      
      if (response.data && response.data.id) {
        // Refresh the academic years list
        await fetchAllAcademicYears();
        // If we updated the current active year, refresh that too
        if (response.data.isActive) {
          await fetchAcademicYear();
        }
        return true;
      } else {
        setError('Failed to update academic year');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error updating academic year:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update academic year';
      setError(errorMessage);
      return false;
    }
  }, [fetchAcademicYear, fetchAllAcademicYears]);

  const deleteAcademicYear = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await api.delete(`/academic-years/${id}`);
      
      if (response.data && response.data.message) {
        // Refresh the academic years list
        await fetchAllAcademicYears();
        return true;
      } else {
        setError('Failed to delete academic year');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error deleting academic year:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete academic year';
      setError(errorMessage);
      return false;
    }
  }, [fetchAllAcademicYears]);

  const setCurrentAcademicYear = useCallback(async (id: number): Promise<boolean> => {
    try {
      setError(null);
      
      const response = await api.put(`/academic-years/${id}/set-current`);
      
      if (response.data && response.data.year) {
        setAcademicYear(response.data.year);
        // Refresh the academic years list to update active status
        await fetchAllAcademicYears();
        return true;
      } else {
        setError('Failed to set current academic year');
        return false;
      }
    } catch (err: unknown) {
      console.error('Error setting current academic year:', err);
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to set current academic year';
      setError(errorMessage);
      return false;
    }
  }, [fetchAllAcademicYears]);

  useEffect(() => {
    void fetchAcademicYear();
    void fetchAllAcademicYears();
  }, [fetchAcademicYear, fetchAllAcademicYears]);

  return {
    academicYear,
    currentAcademicYear,
    academicYears,
    loading,
    error,
    refetch: fetchAcademicYear,
    fetchAllAcademicYears,
    updateAcademicYear,
    createAcademicYear,
    updateAcademicYearDetails,
    deleteAcademicYear,
    setCurrentAcademicYear
  };
};

/**
 * Simple hook to get just the current academic year value
 * Useful when you only need the value without update functionality
 */
export const useCurrentAcademicYear = (): { academicYear: string; loading: boolean } => {
  const { academicYear, loading } = useAcademicYear();
  return { academicYear, loading };
};
