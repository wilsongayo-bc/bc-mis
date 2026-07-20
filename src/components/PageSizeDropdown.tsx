import React from 'react';

// CENTRALIZED DEFAULT PAGE SIZE - Change this value to affect ALL tables
export const DEFAULT_PAGE_SIZE = 20;

type Props = {
  value: number;
  onChange: (n: number) => void;
  className?: string;
};

const PageSizeDropdown: React.FC<Props> = ({ value, onChange, className }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`ml-2 px-2 py-1 border rounded text-sm border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white ${className || ''}`}
      aria-label="Items per page"
    >
      <option value={20}>20/page</option>
      <option value={25}>25/page</option>
      <option value={50}>50/page</option>
      <option value={100}>100/page</option>
      <option value={200}>200/page</option>
    </select>
  );
};

export default PageSizeDropdown;

