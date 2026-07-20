import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../../hooks/redux';
import { selectUser } from '../../store/slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';
import StepReviewProfile from './StepReviewProfile';
import StepSelectCourse from './StepSelectCourse';
import StepAssessment from './StepAssessment';
import StepConfirm from './StepConfirm';
import { Course } from '../../types/course.types';
import { CourseSection } from '../../types/courseSection.types';
import api from '../../lib/api';

const EnrollmentWizard: React.FC = () => {
  const user = useAppSelector(selectUser);
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [student, setStudent] = useState<any>(null);
  
  // Wizard State
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSection, setSelectedSection] = useState<CourseSection | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<any[]>([]);
  const [assessmentData, setAssessmentData] = useState<any>(null);

  // Check student eligibility on mount
  useEffect(() => {
    const checkEligibility = async () => {
      if (user?.role !== 'STUDENT') return;
      
      try {
        setLoadingEligibility(true);
        // Assuming we have an endpoint or we check student status
        // For now, let's fetch the student profile to check status
        const response = await api.get('/students/profile');
        if (response.data.success) {
          const studentData = response.data.data;
          setStudent(studentData);
          
          // Check Registration Status
          if (studentData.registrationStatus === 'REGISTERED') {
             // OK to proceed
          } else if (studentData.registrationStatus === 'PRE_REGISTERED') {
             setEligibilityError('You must complete your full registration before enrolling.');
          } else if (studentData.registrationStatus === 'WITHDRAWN') {
             setEligibilityError('Your registration is marked as withdrawn. Please contact the registrar before enrolling.');
          }
          
          // Check Balance (Optional logic)
          if (Number(studentData.balance) > 0) {
             // Maybe allow enrollment but warn? Or block?
             // setEligibilityError('You have an outstanding balance. Please settle it before enrolling.');
          }
        }
      } catch (error) {
        console.error('Failed to check eligibility:', error);
        // Don't block on error for now, or maybe show generic error
      } finally {
        setLoadingEligibility(false);
      }
    };

    checkEligibility();
  }, [user]);

  // If not a student, redirect (although protected route handles this, good safety)
  if (user?.role !== 'STUDENT') {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">This page is for students only.</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (loadingEligibility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (eligibilityError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Enrollment Unavailable</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{eligibilityError}</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleProfileConfirmed = () => {
    setCurrentStep(2);
  };

  const handleCourseSelected = (course: Course, section: CourseSection, subjects: any[]) => {
    setSelectedCourse(course);
    setSelectedSection(section);
    setSelectedSubjects(subjects);
    setCurrentStep(3);
  };

  const handleAssessmentReviewed = (assessment: any) => {
    setAssessmentData(assessment);
    setCurrentStep(4);
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Wizard Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Student Enrollment</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">Complete the steps below to enroll for the upcoming semester.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-700 -z-10"></div>
            
            {[
              { step: 1, label: 'Profile' },
              { step: 2, label: 'Selection' },
              { step: 3, label: 'Assessment' },
              { step: 4, label: 'Confirm' }
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 px-2">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${
                    currentStep >= item.step 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500'
                  }`}
                >
                  {item.step}
                </div>
                <span className={`mt-2 text-xs font-medium ${
                  currentStep >= item.step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 sm:p-8">
          {currentStep === 1 && (
            <StepReviewProfile onNext={handleProfileConfirmed} />
          )}

          {currentStep === 2 && (
            <StepSelectCourse 
              onNext={handleCourseSelected} 
              onBack={handleBack} 
            />
          )}

          {currentStep === 3 && selectedCourse && selectedSection && (
            <StepAssessment 
              course={selectedCourse}
              section={selectedSection}
              subjects={selectedSubjects}
              studentId={student?.id || (user as any).studentId} 
              onNext={handleAssessmentReviewed}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && selectedCourse && selectedSection && assessmentData && (
            <StepConfirm 
              course={selectedCourse}
              section={selectedSection}
              assessment={assessmentData}
              studentId={student?.id || (user as any).studentId}
              onBack={handleBack}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default EnrollmentWizard;
