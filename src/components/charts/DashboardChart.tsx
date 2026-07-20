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
  PointElement,
  LineElement,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface DashboardChartProps {
  type: 'bar' | 'doughnut' | 'line';
  data: ChartData<'bar' | 'doughnut' | 'line'>;
  options?: ChartOptions<'bar' | 'doughnut' | 'line'>;
  title?: string;
}

export const DashboardChart: React.FC<DashboardChartProps> = ({
  type,
  data,
  options = {},
  title
}) => {
  const defaultOptions: ChartOptions<'bar' | 'doughnut' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: !!title,
        text: title,
      },
    },
    ...options,
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={data as ChartData<'bar'>} options={defaultOptions as ChartOptions<'bar'>} />;
      case 'doughnut':
        return <Doughnut data={data as ChartData<'doughnut'>} options={defaultOptions as ChartOptions<'doughnut'>} />;
      case 'line':
        return <Line data={data as ChartData<'line'>} options={defaultOptions as ChartOptions<'line'>} />;
      default:
        return <Bar data={data as ChartData<'bar'>} options={defaultOptions as ChartOptions<'bar'>} />;
    }
  };

  return (
    <div className="w-full h-full">
      {renderChart()}
    </div>
  );
};