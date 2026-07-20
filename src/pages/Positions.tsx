import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  fetchPositions,
  createPosition,
  updatePosition,
  Position,
  CreatePositionRequest,
  UpdatePositionRequest
} from '../services/positionService';
import { handleApiError, handleSuccess } from '../utils/errorHandling';
import {
  Search,
  Plus,
  Edit,
  Filter,
  ChevronDown,
  XCircle,
  X,
  ToggleLeft,
  ToggleRight,
  Briefcase,
} from 'lucide-react';

/**
 * Position row component for displaying individual position data
 */
interface PositionRowProps {
  position: Position;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (position: Position) => void;
  onToggleStatus: (position: Position) => void;
}

const PositionRow = React.memo(({ position, isSelected, onSelect, onEdit, onToggleStatus }: PositionRowProps) => {
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(position.id)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
        />
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
        {position.name}
      </td>
      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
        {position.description || '-'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${position.isActive
          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
          : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
          }`}>
          {position.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onEdit(position)}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
          title="Edit position"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={() => onToggleStatus(position)}
          className={`rounded transition-colors ${position.isActive
            ? 'text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20'
            : 'text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20'
            }`}
          title={position.isActive ? 'Disable position' : 'Enable position'}
        >
          {position.isActive ? (
            <ToggleLeft className="h-4 w-4" />
          ) : (
            <ToggleRight className="h-4 w-4" />
          )}
        </button>
      </td>
    </tr>
  );
});

/**
 * Position form component for creating/editing positions
 */
interface PositionFormProps {
  position?: Position;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePositionRequest | UpdatePositionRequest) => void;
  isLoading: boolean;
}

const PositionForm = ({ position, isOpen, onClose, onSubmit, isLoading }: PositionFormProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (position) {
      setFormData({
        name: position.name,
        description: position.description || '',
        isActive: position.isActive
      });
    } else {
      setFormData({
        name: '',
        description: '',
        isActive: true
      });
    }
    setErrors({});
  }, [position, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Position name is required';
    } else if (formData.name.trim().length < 2 || formData.name.trim().length > 100) {
      newErrors.name = 'Position name must be between 2 and 100 characters';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 10 || formData.description.trim().length > 500) {
      newErrors.description = 'Description must be between 10 and 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        isActive: formData.isActive
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-70 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border border-gray-200 dark:border-gray-700 w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {position ? 'Edit Position' : 'Create New Position'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Position Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.name ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="Enter position name"
            />
            {errors.name && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${errors.description ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'
                }`}
              placeholder="Enter position description (optional)"
            />
            {errors.description && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.description}</p>}
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-white">
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 border border-transparent rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : (position ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/**
 * Main Positions management page component
 */
const Positions: React.FC = () => {
  const { token } = useSelector((state: RootState) => state.auth);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPositions, setSelectedPositions] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | undefined>();


  /**
   * Load positions from the API
   */
  const loadPositions = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      const response = await fetchPositions(token);
      setPositions(response.positions);
    } catch (error) {
      console.error('Failed to load positions:', error);
      handleApiError(error, 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  /**
   * Filter positions based on search term and status
   */
  const filteredPositions = useMemo(() => {
    let filtered = positions;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(position =>
        position.name.toLowerCase().includes(term) ||
        position.description?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter) {
      const isActive = statusFilter === 'true';
      filtered = filtered.filter(position => position.isActive === isActive);
    }

    return filtered;
  }, [positions, searchTerm, statusFilter]);

  /**
   * Handle position selection
   */
  const handleSelectPosition = (id: string) => {
    const newSelected = new Set(selectedPositions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPositions(newSelected);
  };

  /**
   * Handle select all positions
   */
  const handleSelectAll = () => {
    if (selectedPositions.size === filteredPositions.length) {
      setSelectedPositions(new Set());
    } else {
      setSelectedPositions(new Set(filteredPositions.map(p => p.id)));
    }
  };

  /**
   * Handle creating a new position
   */
  const handleCreatePosition = () => {
    setEditingPosition(undefined);
    setShowForm(true);
  };

  /**
   * Handle editing a position
   */
  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setShowForm(true);
  };

  /**
   * Handle form submission
   */
  const handleFormSubmit = async (data: CreatePositionRequest | UpdatePositionRequest) => {
    if (!token) return;

    try {
      setFormLoading(true);

      if (editingPosition) {
        await updatePosition(token, editingPosition.id, data);
        handleSuccess('Position updated successfully');
      } else {
        await createPosition(token, data as CreatePositionRequest);
        handleSuccess('Position created successfully');
      }

      setShowForm(false);
      setEditingPosition(undefined);
      await loadPositions();
    } catch (error) {
      handleApiError(error, 'Failed to save position');
    } finally {
      setFormLoading(false);
    }
  };

  /**
   * Handle position status toggle
   */
  const handleToggleStatus = async (position: Position) => {
    if (!token) return;

    try {
      await updatePosition(token, position.id, {
        ...position,
        isActive: !position.isActive
      });
      handleSuccess(`Position ${!position.isActive ? 'enabled' : 'disabled'} successfully`);
      await loadPositions();
    } catch (error) {
      handleApiError(error, 'Failed to update position status');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Position Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage organizational positions and roles</p>
        </div>
        <button
          onClick={handleCreatePosition}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create Position
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search positions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              <ChevronDown className={`h-4 w-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            {(statusFilter || searchTerm) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setSearchTerm('');
                }}
                className="inline-flex items-center px-3 py-2 border border-red-300 dark:border-red-800 rounded-md text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                >
                  <option value="">All Statuses</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        Showing {filteredPositions.length} of {positions.length} positions
        {selectedPositions.size > 0 && (
          <span className="ml-4 text-blue-600 dark:text-blue-400">
            {selectedPositions.size} selected
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading positions...</p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {searchTerm || statusFilter !== 'all' ? 'No positions match your filters' : 'No positions found'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPositions.size === filteredPositions.length && filteredPositions.length > 0}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPositions.map((position) => (
                  <PositionRow
                    key={position.id}
                    position={position}
                    isSelected={selectedPositions.has(position.id)}
                    onSelect={handleSelectPosition}
                    onEdit={handleEditPosition}
                    onToggleStatus={handleToggleStatus}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Position Form Modal */}
      <PositionForm
        position={editingPosition}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPosition(undefined);
        }}
        onSubmit={handleFormSubmit}
        isLoading={formLoading}
      />


    </div>
  );
};

export default Positions;