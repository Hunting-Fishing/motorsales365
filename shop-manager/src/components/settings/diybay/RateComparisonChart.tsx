
import React, { useMemo } from 'react';
import { Bay } from '@/services/diybay/diybayService';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface RateComparisonChartProps {
  bays: Bay[];
  showInactive?: boolean;
}

export const RateComparisonChart: React.FC<RateComparisonChartProps> = ({ 
  bays,
  showInactive = false
}) => {
  const filteredBays = useMemo(() => {
    return showInactive ? bays : bays.filter(bay => bay.is_active);
  }, [bays, showInactive]);
  
  const chartData = useMemo(() => {
    const labels = filteredBays.map(bay => bay.bay_name);
    
    return {
      labels,
      datasets: [
        {
          label: 'Hourly Rate',
          data: filteredBays.map(bay => bay.hourly_rate),
          backgroundColor: 'rgba(53, 162, 235, 0.8)',
          borderWidth: 1,
        },
        {
          label: 'Daily Rate',
          data: filteredBays.map(bay => bay.daily_rate || 0),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderWidth: 1,
        },
        {
          label: 'Weekly Rate',
          data: filteredBays.map(bay => bay.weekly_rate || 0),
          backgroundColor: 'rgba(153, 102, 255, 0.8)',
          borderWidth: 1,
        },
        {
          label: 'Monthly Rate',
          data: filteredBays.map(bay => bay.monthly_rate || 0),
          backgroundColor: 'rgba(255, 159, 64, 0.8)',
          borderWidth: 1,
        },
      ],
    };
  }, [filteredBays]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Bay Rates Comparison',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Rate ($)',
        }
      }
    }
  };

  if (filteredBays.length === 0) {
    return <div className="text-center p-8 text-gray-500">No active bays to display</div>;
  }

  return (
    <div className="h-80 mt-4 mb-8">
      <Bar data={chartData} options={options} />
    </div>
  );
};
