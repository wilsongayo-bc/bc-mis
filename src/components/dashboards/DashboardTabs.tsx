import React from 'react';

export type DashboardTab = {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type DashboardTabsProps = {
  tabs: DashboardTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export function DashboardTabs({ tabs, activeTab, onChange }: DashboardTabsProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-300 dark:border-gray-600'
                }`}
              >
                {Icon && <Icon className="h-4 w-4 mr-2" />}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

