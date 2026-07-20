import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface GradeDistributionData {
  grade: string;
  count: number;
  percentage: number;
}

interface AttendanceData {
  month: string;
  attendanceRate: number;
  totalStudents: number;
}

interface PerformanceData {
  subject: string;
  averageGrade: number;
  passRate: number;
}

interface AcademicChartProps {
  type: 'grade-distribution' | 'attendance-trend' | 'subject-performance';
  data: GradeDistributionData[] | AttendanceData[] | PerformanceData[];
  title?: string;
}

export const AcademicChart: React.FC<AcademicChartProps> = ({
  type,
  data,
  title
}) => {
  if (type === 'grade-distribution') {
    const gradeData = data as GradeDistributionData[];
    const chartData = {
      labels: gradeData.map(item => item.grade),
      datasets: [
        {
          data: gradeData.map(item => item.count),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',   // A - Green
            'rgba(59, 130, 246, 0.8)',  // B - Blue
            'rgba(251, 191, 36, 0.8)',  // C - Yellow
            'rgba(249, 115, 22, 0.8)',  // D - Orange
            'rgba(239, 68, 68, 0.8)',   // F - Red
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(59, 130, 246, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(249, 115, 22, 1)',
            'rgba(239, 68, 68, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right' as const,
        },
        title: {
          display: !!title,
          text: title || 'Grade Distribution',
        },
        tooltip: {
          callbacks: {
            label: function(context: { dataIndex: number }) {
              const dataIndex = context.dataIndex;
              const grade = gradeData[dataIndex];
              return [
                `Count: ${grade.count} students`,
                `Percentage: ${grade.percentage.toFixed(1)}%`
              ];
            }
          }
        }
      },
    };

    return (
      <div className="w-full h-full">
        <Doughnut data={chartData} options={options} />
      </div>
    );
  }

  if (type === 'attendance-trend') {
    const attendanceData = data as AttendanceData[];
    const chartData = {
      labels: attendanceData.map(item => item.month),
      datasets: [
        {
          label: 'Attendance Rate (%)',
          data: attendanceData.map(item => item.attendanceRate),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Total Students',
          data: attendanceData.map(item => item.totalStudents),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index' as const,
        intersect: false,
      },
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: !!title,
          text: title || 'Attendance Trend',
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Month'
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Attendance Rate (%)'
          },
          min: 0,
          max: 100,
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Total Students'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };

    return (
      <div className="w-full h-full">
        <Line data={chartData} options={options} />
      </div>
    );
  }

  if (type === 'subject-performance') {
    const performanceData = data as PerformanceData[];
    const chartData = {
      labels: performanceData.map(item => item.subject),
      datasets: [
        {
          label: 'Average Grade',
          data: performanceData.map(item => item.averageGrade),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
          yAxisID: 'y',
        },
        {
          label: 'Pass Rate (%)',
          data: performanceData.map(item => item.passRate),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1,
          yAxisID: 'y1',
        },
      ],
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
        },
        title: {
          display: !!title,
          text: title || 'Subject Performance',
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Subject'
          }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: {
            display: true,
            text: 'Average Grade'
          },
          min: 0,
          max: 100,
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Pass Rate (%)'
          },
          min: 0,
          max: 100,
          grid: {
            drawOnChartArea: false,
          },
        },
      },
    };

    return (
      <div className="w-full h-full">
        <Bar data={chartData} options={options} />
      </div>
    );
  }

  return null;
};