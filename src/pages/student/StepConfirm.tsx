import React, { useState } from 'react';
import { Course } from '../../types/course.types';
import { CourseSection } from '../../types/courseSection.types';
import { CheckCircle, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface StepConfirmProps {
  course: Course;
  section: CourseSection;
  assessment: any;
  studentId: string;
  onBack: () => void;
}

const StepConfirm: React.FC<StepConfirmProps> = ({ 
  course, 
  section, 
  assessment, 
  studentId, 
  onBack 
}) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);

    try {
      // 1. Create Enrollment Intent
      const intentResponse = await api.post('/enrollments/start-intent', {
        studentId,
        courseId: course.id,
        courseSectionId: section.id,
        academicYear: section.academicYear,
        semester: section.semester
      });

      if (!intentResponse.data.success) {
        throw new Error(intentResponse.data.message || 'Failed to create enrollment.');
      }

      const enrollmentId = intentResponse.data.data.id;

      // 2. Save Assessment Details
      // The intent endpoint might not save the full assessment JSON, so we can update it or
      // rely on the backend to re-calculate and save it if implemented that way.
      // But based on our plan "Enrollment : Save that JSON + Totals to Enrollment entity",
      // let's assume we call the assess endpoint again to persist it or update the enrollment directly.
      // Actually, the previous step just did a "Dry Run".
      // Let's call the assess endpoint on the REAL enrollment ID to save it.
      
      await api.post(`/enrollments/${enrollmentId}/assess`, {});

      toast.success('Enrollment submitted successfully!');
      navigate('/dashboard'); // Or to the enrollment details page
    } catch (err: any) {
      console.error('Enrollment failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to submit enrollment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-medium text-green-900 dark:text-white mb-2">
          Ready to Enroll?
        </h3>
        <p className="text-green-700 dark:text-green-300 max-w-lg mx-auto">
          You are about to enroll in <strong>{course.courseCode}</strong>, section <strong>{section.sectionName}</strong>.
          <br />
          Total fees: <strong>₱{assessment.summary.total.toLocaleString()}</strong>
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center text-red-700">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow sm:rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">Terms and Conditions</h4>
          <div className="prose prose-sm text-gray-500 dark:text-gray-400 max-w-none h-32 overflow-y-auto border p-3 rounded">
            <p>
              By clicking "Confirm Enrollment", I hereby certify that the information provided is true and correct. 
              I understand that my enrollment is conditional upon the validation of my submitted documents and payment of the required fees.
            </p>
            <p>
              I agree to abide by the rules and regulations of the institution. I understand that any misrepresentation 
              may be grounds for the cancellation of my enrollment.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          disabled={submitting}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={submitting}
          className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
        >
          {submitting ? 'Processing...' : 'Confirm Enrollment'}
        </button>
      </div>
    </div>
  );
};

export default StepConfirm;
