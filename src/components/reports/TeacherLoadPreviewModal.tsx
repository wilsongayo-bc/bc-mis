import React from 'react';
import { X, Printer } from 'lucide-react';

interface TeacherLoadSchedule {
  subjectCode: string;
  subjectDescription: string;
  time: string;
  days: string;
  courseAndYear: string;
  block: string;
  units: number;
  room: string;
  noOfStudents: number;
}

interface TeacherLoadData {
  teacherName: string;
  designation: string;
  schedules: TeacherLoadSchedule[];
  totalUnits: number;
  academicYear: string;
  semester: string;
}

interface TeacherLoadPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: TeacherLoadData[];
  preparedBy: string;
  approvedBy: string;
  courseName: string;
  academicYear: string;
  semester: string;
  logoUrl?: string;
}

const TeacherLoadPreviewModal: React.FC<TeacherLoadPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  preparedBy,
  approvedBy,
  courseName,
  academicYear,
  semester,
  logoUrl
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 print:bg-white print:static print:h-auto print:w-auto"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-5xl m-4 rounded-lg shadow-xl flex flex-col max-h-[90vh] print:shadow-none print:m-0 print:w-full print:max-w-none print:max-h-none print:block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header - Hidden in Print */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 print:hidden flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">Print Preview</h2>
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Modal Content / Print Area */}
        <div className="p-8 overflow-y-auto print:p-0 print:overflow-visible">
          {data.map((teacherData, index) => (
            <div key={index} className="mb-8 print:break-after-page last:mb-0 print:mb-0 print:h-screen flex flex-col">
              {/* Header */}
              <div className="relative mb-6 text-center">
                {logoUrl && (
                  <img 
                    src={logoUrl} 
                    alt="School Logo" 
                    className="absolute left-4 top-0 h-24 w-24 object-contain"
                  />
                )}
                <h1 className="text-xl font-bold uppercase">COLEGIO DE ALICIA</h1>
                {courseName && (
                  <h2 className="text-lg font-bold uppercase">{courseName}</h2>
                )}
                <h2 className="text-lg font-bold">Teacher's Subject Load</h2>
                <h3 className="text-md font-semibold">{semester}</h3>
                <h4 className="text-md font-semibold">A.Y. {academicYear}</h4>
              </div>

              {/* Instructor Info */}
              <div className="mb-4">
                <div className="font-bold">Instructor's Name: <span className="uppercase">{teacherData.teacherName}</span></div>
                <div className="font-bold">Designation: <span className="uppercase">{teacherData.designation}</span></div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto mb-8">
                <table className="min-w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Subject Code</th>
                      <th className="border border-gray-400 px-4 py-2 text-center text-sm font-bold">Subject Description</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Time</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Days</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Course & Year</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Block</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Units</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">Room</th>
                      <th className="border border-gray-400 px-2 py-2 text-center text-sm font-bold">No of Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherData.schedules.map((schedule, sIndex) => (
                      <tr key={sIndex} className="text-sm">
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.subjectCode}</td>
                        <td className="border border-gray-400 px-4 py-1">{schedule.subjectDescription}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center whitespace-nowrap">{schedule.time}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.days}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.courseAndYear}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.block}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.units}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.room}</td>
                        <td className="border border-gray-400 px-2 py-1 text-center">{schedule.noOfStudents}</td>
                      </tr>
                    ))}
                    {/* Empty rows to fill space if needed, or just footer */}
                    <tr>
                      <td colSpan={6} className="border border-gray-400 px-2 py-2 text-right font-bold border-r-0"></td>
                      <td className="border border-gray-400 px-2 py-2 text-center font-bold">Total Units: {teacherData.totalUnits}</td>
                      <td colSpan={2} className="border border-gray-400 border-l-0"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="mt-auto pt-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="mb-8">Prepared by:</p>
                    <div className="font-bold uppercase border-b border-black inline-block min-w-[200px] mb-1">
                      {preparedBy || '_________________'}
                    </div>
                    <div className="text-sm">Program Head</div>
                  </div>
                  <div className="text-right">
                    <p className="mb-8 text-left pl-[50%]">Approved by:</p>
                    <div className="text-center inline-block">
                        <div className="font-bold uppercase border-b border-black inline-block min-w-[200px] mb-1">
                        {approvedBy}
                        </div>
                        <div className="text-sm">College President</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TeacherLoadPreviewModal;
