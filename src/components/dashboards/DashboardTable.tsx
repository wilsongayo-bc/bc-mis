import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export type DashboardTableColumn<T> = {
  header: string;
  className?: string;
  headerClassName?: string;
  render: (row: T) => React.ReactNode;
  searchText?: (row: T) => string;
};

type DashboardTableProps<T> = {
  title?: string;
  subtitle?: string;
  rows: T[];
  columns: DashboardTableColumn<T>[];
  emptyLabel?: string;
  maxHeightClassName?: string;
  getRowHref?: (row: T) => string | null | undefined;
  initialQuery?: string;
};

export function DashboardTable<T>({
  title,
  subtitle,
  rows,
  columns,
  emptyLabel = 'No records found.',
  maxHeightClassName = 'max-h-72',
  getRowHref,
  initialQuery = '',
}: DashboardTableProps<T>) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);

  const searchableColumns = useMemo(
    () => columns.filter((c) => c.searchText),
    [columns]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    if (searchableColumns.length === 0) return rows;
    return rows.filter((r) =>
      searchableColumns.some((c) => (c.searchText?.(r) || '').toLowerCase().includes(q))
    );
  }, [query, rows, searchableColumns]);

  const hasHeader = Boolean(title || subtitle);

  return (
    <div className="w-full">
      {hasHeader && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title && <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>}
            {subtitle && <div className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</div>}
          </div>
          {searchableColumns.length > 0 && (
            <div className="sm:w-64">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 w-full rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-xs text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      )}

      <div className={`mt-3 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 ${maxHeightClassName}`}>
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
            <tr>
              {columns.map((c, idx) => (
                <th
                  key={idx}
                  className={`border-b border-gray-200 dark:border-gray-700 px-3 py-2 text-left font-semibold text-gray-700 dark:text-gray-200 ${c.headerClassName || ''}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              filtered.map((row, rowIdx) => {
                const href = getRowHref?.(row) || null;
                return (
                  <tr
                    key={rowIdx}
                    className={href ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40' : ''}
                    onClick={() => {
                      if (href) navigate(href);
                    }}
                  >
                    {columns.map((c, colIdx) => (
                      <td
                        key={colIdx}
                        className={`border-b border-gray-100 dark:border-gray-800 px-3 py-2 align-top text-gray-900 dark:text-gray-100 ${c.className || ''}`}
                      >
                        {c.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

