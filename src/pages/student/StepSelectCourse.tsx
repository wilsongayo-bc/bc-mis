import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchCourses, selectCourses } from '../../store/slices/courseSlice';
import { fetchCourseSectionsByCourse } from '../../store/slices/courseSectionSlice';
import { Course } from '../../types/course.types';
import { CourseSection } from '../../types/courseSection.types';
import { BookOpen, Users, Calendar, Clock, MapPin, CheckCircle } from 'lucide-react';
import api from '../../lib/api';

interface StepSelectCourseProps {
  onNext: (course: Course, section: CourseSection, subjects: any[]) => void;
  onBack: () => void;
}

const StepSelectCourse: React.FC<StepSelectCourseProps> = ({ onNext, onBack }) => {
  const dispatch = useAppDispatch();
  const courses = useAppSelector(selectCourses);
  
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  useEffect(() => {
    dispatch(fetchCourses({ isActive: true }));
  }, [dispatch]);

  // Fetch sections when course changes
  useEffect(() => {
    if (selectedCourseId) {
      setLoadingSections(true);
      dispatch(fetchCourseSectionsByCourse(selectedCourseId))
        .unwrap()
        .then((data) => {
          setSections(data || []);
          setLoadingSections(false);
        })
        .catch(() => {
          setSections([]);
          setLoadingSections(false);
        });
    } else {
      setSections([]);
    }
    setSelectedSectionId('');
    setSubjects([]);
  }, [selectedCourseId, dispatch]);

  // Fetch subjects when section changes
  useEffect(() => {
    if (selectedSectionId && selectedCourseId) {
      const section = sections.find(s => s.id === selectedSectionId);
      if (section) {
        setLoadingSubjects(true);
        // Fetch subjects filtered by course and year level
        // Assuming we have an endpoint or filter for this
        // Mapping year level string to number: 'First Year' -> 1
        const yearLevelMap: Record<string, number> = {
          'First Year': 1,
          'Second Year': 2,
          'Third Year': 3,
          'Fourth Year': 4
        };
        const yearLevel = yearLevelMap[section.yearLevel] || 1;

        api.get(`/subjects`, {
          params: {
            courseId: selectedCourseId,
            yearLevel: yearLevel,
            isActive: true
          }
        })
        .then(response => {
          setSubjects(response.data.data || []);
        })
        .finally(() => setLoadingSubjects(false));
      }
    }
  }, [selectedSectionId, selectedCourseId, sections]);

  const handleNext = () => {
    const course = courses.find(c => c.id === selectedCourseId);
    const section = sections.find(s => s.id === selectedSectionId);
    
    if (course && section) {
      onNext(course, section, subjects);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Course Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Program / Course
          </label>
          <div className="space-y-2">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => setSelectedCourseId(course.id)}
                className={`cursor-pointer rounded-lg border p-4 transition-all ${
                  selectedCourseId === course.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className={`h-5 w-5 mr-3 ${
                      selectedCourseId === course.id ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {course.courseCode}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {course.name}
                      </p>
                    </div>
                  </div>
                  {selectedCourseId === course.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Block Section
          </label>
          {loadingSections ? (
            <div className="text-center py-4 text-gray-500">Loading sections...</div>
          ) : !selectedCourseId ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-500">
              Please select a course first
            </div>
          ) : sections.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg text-gray-500">
              No sections available for this course.
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sections.map((section) => (
                <div
                  key={section.id}
                  onClick={() => setSelectedSectionId(section.id)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${
                    selectedSectionId === section.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-400" />
                      {section.sectionName}
                    </h4>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {section.yearLevel}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {section.semester} • {section.academicYear}
                    </div>
                    {section.schedule && (
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {section.schedule}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject Preview */}
      {selectedSectionId && (
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Subjects in this Block
          </h3>
          {loadingSubjects ? (
            <div className="text-center py-4">Loading subjects...</div>
          ) : subjects.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {subjects.map((subject) => (
                  <li key={subject.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {subject.code}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {subject.units} Units
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {subject.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500 italic">No subjects found for this block.</p>
          )}
        </div>
      )}

      <div className="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedCourseId || !selectedSectionId || subjects.length === 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Assessment
        </button>
      </div>
    </div>
  );
};

export default StepSelectCourse;
