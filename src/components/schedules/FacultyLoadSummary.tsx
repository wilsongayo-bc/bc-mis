import React, { useMemo } from 'react';
import { BookOpen, AlertTriangle } from 'lucide-react';

interface FacultyLoadSummaryProps {
  schedules: any[]; // Using any to be flexible with Schedule interface
  maxUnits?: number;
  theme?: 'light' | 'dark';
}

const FacultyLoadSummary: React.FC<FacultyLoadSummaryProps> = ({ 
  schedules, 
  maxUnits = 24, // Default max units per semester
  theme = 'light' 
}) => {
  const isDark = theme === 'dark';

  const stats = useMemo(() => {
    let totalUnits = 0;
    let totalSubjects = 0;
    const subjects = new Set<string>();

    schedules.forEach(schedule => {
      // Avoid counting duplicate schedules (same subject, same section, different day/time)
      // This is a simplified check. Ideally, we should group by subjectId and courseSectionId
      const uniqueKey = `${schedule.subjectId}-${schedule.courseSectionId}`;
      if (!subjects.has(uniqueKey)) {
        subjects.add(uniqueKey);
        totalSubjects++;
        totalUnits += Number(schedule.subject?.units || 0);
      }
    });

    return { totalUnits, totalSubjects };
  }, [schedules]);

  const loadPercentage = Math.min((stats.totalUnits / maxUnits) * 100, 100);
  
  // Determine status color
  let statusColor = 'bg-green-500';
  let textColor = 'text-green-700 dark:text-green-400';
  
  if (stats.totalUnits > maxUnits) {
    statusColor = 'bg-red-500';
    textColor = 'text-red-700 dark:text-red-400';
  } else if (stats.totalUnits >= maxUnits * 0.8) {
    statusColor = 'bg-yellow-500';
    textColor = 'text-yellow-700 dark:text-yellow-400';
  }

  return (
    <div className={`rounded-lg p-4 mb-6 border ${
      isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold flex items-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
          <BookOpen className="w-4 h-4 mr-2" />
          Faculty Load Summary
        </h3>
        <span className={`text-sm font-medium ${textColor}`}>
          {stats.totalUnits} / {maxUnits} Units
        </span>
      </div>

      {/* Progress Bar */}
      <div className={`w-full h-2.5 rounded-full mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
        <div 
          className={`h-2.5 rounded-full transition-all duration-500 ${statusColor}`}
          style={{ width: `${loadPercentage}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{stats.totalSubjects} Distinct Subjects/Sections</span>
        {stats.totalUnits > maxUnits && (
          <span className="flex items-center text-red-600 dark:text-red-400">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Overloaded
          </span>
        )}
      </div>
    </div>
  );
};

export default FacultyLoadSummary;
