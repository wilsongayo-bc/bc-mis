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
  TooltipItem,
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

interface RevenueData {
  month: string;
  revenue: number;
  target?: number;
}

interface PaymentStatusData {
  status: string;
  count: number;
  amount: number;
}

interface MonthlyComparisonData {
  month: string;
  thisYear: number;
  lastYear: number;
}

interface FinancialChartProps {
  type: 'revenue-trend' | 'payment-status' | 'monthly-comparison';
  data: RevenueData[] | PaymentStatusData[] | MonthlyComparisonData[];
  title?: string;
}

export const FinancialChart: React.FC<FinancialChartProps> = ({
  type,
  data,
  title
}) => {
  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(numValue);
  };

  if (type === 'revenue-trend') {
    const revenueData = data as RevenueData[];
    const chartData = {
      labels: revenueData.map(item => item.month),
      datasets: [
        {
          label: 'Revenue',
          data: revenueData.map(item => item.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        ...(revenueData[0]?.target !== undefined ? [{
          label: 'Target',
          data: revenueData.map(item => item.target || 0),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderDash: [5, 5],
          tension: 0.4,
        }] : [])
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
          text: title || 'Revenue Trend',
        },
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<'line'>) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: string | number) {
              return formatCurrency(value);
            }
          }
        }
      },
    };

    return (
      <div className="w-full h-full">
        <Line data={chartData} options={options} />
      </div>
    );
  }

  if (type === 'payment-status') {
    const statusData = data as PaymentStatusData[];
    const chartData = {
      labels: statusData.map(item => item.status),
      datasets: [
        {
          data: statusData.map(item => item.amount),
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 191, 36, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(156, 163, 175, 0.8)',
          ],
          borderColor: [
            'rgba(34, 197, 94, 1)',
            'rgba(251, 191, 36, 1)',
            'rgba(239, 68, 68, 1)',
            'rgba(156, 163, 175, 1)',
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
          text: title || 'Payment Status Distribution',
        },
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<'doughnut'>) {
              const dataIndex = context.dataIndex;
              const status = statusData[dataIndex];
              return [
                `Amount: ${formatCurrency(status.amount)}`,
                `Count: ${status.count} payments`
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

  if (type === 'monthly-comparison') {
    const comparisonData = data as MonthlyComparisonData[];
    const chartData = {
      labels: comparisonData.map(item => item.month),
      datasets: [
        {
          label: 'This Year',
          data: comparisonData.map(item => item.thisYear),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1,
        },
        {
          label: 'Last Year',
          data: comparisonData.map(item => item.lastYear),
          backgroundColor: 'rgba(156, 163, 175, 0.8)',
          borderColor: 'rgba(156, 163, 175, 1)',
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
          display: !!title,
          text: title || 'Monthly Revenue Comparison',
        },
        tooltip: {
          callbacks: {
            label: function(context: TooltipItem<'bar'>) {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value: string | number) {
              return formatCurrency(value);
            }
          }
        }
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