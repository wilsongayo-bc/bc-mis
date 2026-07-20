import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ComplianceData {
  studentId: string;
  studentName: string;
  submittedDocuments: number;
  totalDocuments: number;
  compliancePercentage: number;
}

interface ComplianceChartProps {
  data: ComplianceData[];
  type?: 'bar' | 'doughnut';
}

export const ComplianceChart: React.FC<ComplianceChartProps> = ({
  data,
  type = 'bar'
}) => {
  const chartData = {
    labels: data.map(item => item.studentName),
    datasets: [
      {
        label: 'Compliance Percentage',
        data: data.map(item => item.compliancePercentage),
        backgroundColor: data.map(item => 
          item.compliancePercentage >= 80 
            ? 'rgba(34, 197, 94, 0.8)' 
            : item.compliancePercentage >= 60 
            ? 'rgba(251, 191, 36, 0.8)' 
            : 'rgba(239, 68, 68, 0.8)'
        ),
        borderColor: data.map(item => 
          item.compliancePercentage >= 80 
            ? 'rgba(34, 197, 94, 1)' 
            : item.compliancePercentage >= 60 
            ? 'rgba(251, 191, 36, 1)' 
            : 'rgba(239, 68, 68, 1)'
        ),
        borderWidth: 1,
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
        display: true,
        text: 'Student Document Compliance',
      },
      tooltip: {
        callbacks: {
          label: function(context: { dataIndex: number }) {
            const dataIndex = context.dataIndex;
            const student = data[dataIndex];
            return [
              `Compliance: ${student.compliancePercentage}%`,
              `Submitted: ${student.submittedDocuments}/${student.totalDocuments}`
            ];
          }
        }
      }
    },
    scales: type === 'bar' ? {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: string | number) {
            return value + '%';
          }
        }
      }
    } : undefined,
  };

  if (type === 'doughnut') {
    const complianceStats = {
      compliant: data.filter(item => item.compliancePercentage >= 80).length,
      partial: data.filter(item => item.compliancePercentage >= 60 && item.compliancePercentage < 80).length,
      nonCompliant: data.filter(item => item.compliancePercentage < 60).length,
    };

    const doughnutData = {
      labels: ['Compliant (≥80%)', 'Partial (60-79%)', 'Non-Compliant (<60%)'],
      datasets: [
        {
          data: [complianceStats.compliant, complianceStats.partial, complianceStats.nonCompliant],
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(239, 68, 68, 1)',
          ],
          borderWidth: 1,
        },
      ],
    };

    return (
      <div className="w-full h-full">
        <Doughnut data={doughnutData} options={options} />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};