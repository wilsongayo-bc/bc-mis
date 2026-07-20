import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Course } from '../../types/course.types';
import { CourseSection } from '../../types/courseSection.types';
import { DollarSign, FileText, AlertTriangle } from 'lucide-react';

interface StepAssessmentProps {
  course: Course;
  section: CourseSection;
  subjects: any[];
  studentId: string; // From auth context
  onNext: (assessmentData: any) => void;
  onBack: () => void;
}

const StepAssessment: React.FC<StepAssessmentProps> = ({ 
  course, 
  section, 
  subjects, 
  studentId, 
  onNext, 
  onBack 
}) => {
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssessment = async () => {
      setLoading(true);
      setError(null);
      try {
        const yearLevelMap: Record<string, number> = {
          'First Year': 1, 'Second Year': 2, 'Third Year': 3, 'Fourth Year': 4
        };
        const yearLevel = yearLevelMap[section.yearLevel] || 1;

        const response = await api.post('/enrollments/assess', {
          studentId,
          courseId: course.id,
          yearLevel,
          subjectIds: subjects.map(s => s.id)
        });

        if (response.data.success) {
          setAssessment(response.data.data);
        } else {
          setError(response.data.message || 'Failed to calculate fees.');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    };

    fetchAssessment();
  }, [course.id, section.yearLevel, subjects, studentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Calculating fees...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-lg font-medium text-red-800">Assessment Failed</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={onBack} className="px-4 py-2 bg-white border border-red-300 text-red-700 rounded hover:bg-red-50">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:px-6 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Assessment Summary
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Breakdown of fees for {section.semester} {section.academicYear}
          </p>
        </div>
        
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <dt className="text-sm font-medium text-blue-500 dark:text-blue-400 truncate">Total Units</dt>
                <dd className="mt-1 text-2xl font-semibold text-blue-900 dark:text-white">
                  {assessment.summary.totalUnits}
                </dd>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <dt className="text-sm font-medium text-green-500 dark:text-green-400 truncate">Total Assessment</dt>
                <dd className="mt-1 text-2xl font-semibold text-green-900 dark:text-white">
                  ₱{assessment.summary.total.toLocaleString()}
                </dd>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                <dt className="text-sm font-medium text-yellow-500 dark:text-yellow-400 truncate">Downpayment Required</dt>
                <dd className="mt-1 text-2xl font-semibold text-yellow-900 dark:text-white">
                  ₱{(assessment.summary.total * 0.2).toLocaleString()} {/* Example: 20% downpayment */}
                </dd>
              </div>
            </div>

            {/* Detailed Table */}
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fee Description
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {assessment.fees.map((fee: any, idx: number) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {fee.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {fee.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white font-mono">
                      ₱{fee.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
                {/* Totals Row */}
                <tr className="bg-gray-50 dark:bg-gray-700 font-bold">
                  <td colSpan={2} className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white">
                    TOTAL
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white font-mono">
                    ₱{assessment.summary.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={() => onNext(assessment)}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Proceed to Confirmation
        </button>
      </div>
    </div>
  );
};

export default StepAssessment;
