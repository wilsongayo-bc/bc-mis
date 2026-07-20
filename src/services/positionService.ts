import api from '../lib/api';

export interface Position {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PositionsResponse {
  positions: Position[];
  total: number;
  success?: boolean;
}

/**
 * Fetch all active positions (requires authentication)
 */
export const fetchPositions = async (_token: string): Promise<PositionsResponse> => {
  try {
    // Request a large limit to ensure we get all positions since the UI does client-side pagination/filtering
    const response = await api.get('/positions?limit=1000');
    
    return {
      positions: response.data.data || [],
      total: response.data.total || 0,
      success: response.data.success
    };
  } catch (error) {
    console.error('❌ Error fetching positions:', error);
    throw error;
  }
};

/**
 * Fetch active positions only
 */
export const fetchActivePositions = async (): Promise<Position[]> => {
  try {
    // Use the dedicated active positions endpoint which returns all active positions without pagination
    const response = await api.get('/positions/active');
    return response.data.data || [];
  } catch (error) {
    console.error('❌ Error fetching active positions:', error);
    throw error;
  }
};

/**
 * Create a new position
 */
export const createPosition = async (token: string, positionData: { name: string; description?: string; isActive?: boolean }): Promise<Position> => {
  try {
    const response = await api.post('/positions', positionData);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error creating position:', error);
    throw error;
  }
};

/**
 * Update an existing position
 */
export const updatePosition = async (token: string, id: string, positionData: { name?: string; description?: string; isActive?: boolean }): Promise<Position> => {
  try {
    const response = await api.put(`/positions/${id}`, positionData);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error updating position:', error);
    throw error;
  }
};

/**
 * Delete a position
 */
export const deletePosition = async (token: string, id: string): Promise<void> => {
  try {
    await api.delete(`/positions/${id}`);
  } catch (error) {
    console.error('❌ Error deleting position:', error);
    throw error;
  }
};

/**
 * Get a specific position by ID
 */
export const getPosition = async (token: string, id: string): Promise<Position> => {
  try {
    const response = await api.get(`/positions/${id}`);
    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching position:', error);
    throw error;
  }
};

export interface CreatePositionRequest {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdatePositionRequest {
  name?: string;
  description?: string;
  isActive?: boolean;
}