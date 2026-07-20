import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, Filter } from 'lucide-react';
import { fetchActivityLogs, ActivityLog } from '../services/activityLogService';
import PageSizeDropdown from '../components/PageSizeDropdown';

const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [method, setMethod] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('');
  const [statusCode, setStatusCode] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  // Dweezil's Code - Separate modal states for full text view and detailed view
  const [selectedLogForFullText, setSelectedLogForFullText] = useState<ActivityLog | null>(null);
  const [selectedLogForDetails, setSelectedLogForDetails] = useState<ActivityLog | null>(null);

  const totalPages = useMemo(() => Math.max(Math.ceil(total / limit), 1), [total, limit]);

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchActivityLogs({
        page,
        limit,
        method: method || undefined,
        username: username || undefined,
        role: role || undefined,
        endpoint: endpoint || undefined,
        statusCode: statusCode ? Number(statusCode) : undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setLogs(response.data);
      setTotal(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  };

  const resetFilters = () => {
    setMethod('');
    setUsername('');
    setRole('');
    setEndpoint('');
    setStatusCode('');
    setFrom('');
    setTo('');
  };

  // Dweezil's Code
  const truncateText = (text: string, maxLength: number = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Dweezil's Code - Updated to show full text modal when clicking on truncated content
  const renderParamsInline = (params?: string) => {
    if (!params) return '-';
    try {
      const obj = JSON.parse(params);
      const inline = JSON.stringify(obj);
      const truncated = truncateText(inline, 80);
      return (
        <button
          onClick={() => setSelectedLogForFullText({ params, ...({} as ActivityLog) })}
          className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline text-left"
          title="Click to view full content"
        >
          {truncated}
        </button>
      );
    } catch {
      const truncated = truncateText(params, 80);
      return (
        <button
          onClick={() => setSelectedLogForFullText({ params, ...({} as ActivityLog) })}
          className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline text-left"
          title="Click to view full content"
        >
          {truncated}
        </button>
      );
    }
  };

  const renderParamsFull = (params?: string) => {
    if (!params) return '-';
    try {
      const obj = JSON.parse(params);
      return <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(obj, null, 2)}</pre>;
    } catch {
      return <span className="text-xs break-all">{params}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadLogs}
              disabled={loading}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Method (GET/POST/...)" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Role" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="Endpoint" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input value={statusCode} onChange={(e) => setStatusCode(e.target.value)} placeholder="Status Code" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="From" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} placeholder="To" className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white" />
            <div className="flex items-center gap-2">
              <button onClick={loadLogs} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded">Apply</button>
              <button onClick={resetFilters} className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded">Reset</button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {error && (
            <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200">{error}</div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">User</th>
                  <th className="px-3 py-2 text-left">Role</th>
                  <th className="px-3 py-2 text-left">Method</th>
                  <th className="px-3 py-2 text-left">Endpoint</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Action</th>
                  <th className="px-3 py-2 text-left">IP</th>
                  <th className="px-3 py-2 text-left">Params</th>
                  <th className="px-3 py-2 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="text-gray-900 dark:text-gray-100">
                {loading ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-600 dark:text-gray-400" colSpan={10}>Loading...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-600 dark:text-gray-400" colSpan={10}>No logs found</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 text-sm">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-2 text-sm">
                        <button
                          onClick={() => setSelectedLogForFullText(log)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                          title="Click to view full content"
                        >
                          {truncateText(log.username || (log.userId === 'anonymous' ? 'anonymous' : log.userId), 30)}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm">{log.role}</td>
                      <td className="px-3 py-2 text-sm">{log.method}</td>
                      <td className="px-3 py-2 text-sm">
                        <button
                          onClick={() => setSelectedLogForFullText(log)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                          title="Click to view full content"
                        >
                          {truncateText(log.endpoint, 40)}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm">{log.statusCode}</td>
                      <td className="px-3 py-2 text-sm">
                        <button
                          onClick={() => setSelectedLogForFullText(log)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-left"
                          title="Click to view full content"
                        >
                          {truncateText(log.action, 30)}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-sm">{log.ip || '-'}</td>
                      <td className="px-3 py-2 text-sm">{renderParamsInline(log.params)}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => setSelectedLogForDetails(log)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600 dark:text-gray-300">Total: {total}</div>
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50">Prev</button>
              <span className="text-sm">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50">Next</button>
              <PageSizeDropdown value={limit} onChange={handleLimitChange} />
            </div>
          </div>
          {/* Dweezil's Code - Full text modal for clicking on truncated content */}
          {selectedLogForFullText && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Full Text View</h3>
                  <button onClick={() => setSelectedLogForFullText(null)} className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Close</button>
                </div>
                <div className="p-4 max-h-96 overflow-auto">
                  <div className="text-sm text-gray-900 dark:text-gray-100 break-all whitespace-pre-wrap font-mono">
                    {selectedLogForFullText.username && <div><strong>Username:</strong> {selectedLogForFullText.username}</div>}
                    {selectedLogForFullText.endpoint && <div><strong>Endpoint:</strong> {selectedLogForFullText.endpoint}</div>}
                    {selectedLogForFullText.action && <div><strong>Action:</strong> {selectedLogForFullText.action}</div>}
                    {selectedLogForFullText.params && (
                      <div className="mt-4">
                        <strong>Parameters:</strong>
                        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                          {renderParamsFull(selectedLogForFullText.params)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Dweezil's Code - Detailed view modal for View button */}
          {selectedLogForDetails && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Details</h3>
                  <button onClick={() => setSelectedLogForDetails(null)} className="px-2 py-1 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Close</button>
                </div>
                <div className="p-4 space-y-2 text-sm text-gray-900 dark:text-gray-100">
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Time:</span> {new Date(selectedLogForDetails.createdAt).toLocaleString()}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">User:</span> {selectedLogForDetails.username || (selectedLogForDetails.userId === 'anonymous' ? 'anonymous' : selectedLogForDetails.userId)}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Role:</span> {selectedLogForDetails.role}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Method:</span> {selectedLogForDetails.method}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Endpoint:</span> {selectedLogForDetails.endpoint}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Status:</span> {selectedLogForDetails.statusCode}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">Action:</span> {selectedLogForDetails.action}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">IP:</span> {selectedLogForDetails.ip || '-'}</div>
                  <div><span className="font-medium text-gray-700 dark:text-gray-300">User Agent:</span> {selectedLogForDetails.userAgent || '-'}</div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Params:</span>
                    <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 overflow-auto max-h-64 text-gray-900 dark:text-gray-100">
                      {renderParamsFull(selectedLogForDetails.params)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;
