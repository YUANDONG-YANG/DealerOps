import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/Card';
import { accountsService } from '../../services/api';
import { InputNumber } from 'antd';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Define interfaces for API responses
interface MonthlyApiResponse {
  year: number;
  message: string | null;
  profitMessage: string | null;
  lossMessage: string | null;
  netMessage: string | null;
  monthly: {
    January: number;
    February: number;
    March: number;
    April: number;
    May: number;
    June: number;
    July: number;
    August: number;
    September: number;
    October: number;
    November: number;
    December: number;
  };
  details: {
    carMakeModel: string;
    vin: string;
    purchasePrice: number;
    maintenancePrice: number;
    maintenanceDetails: string | null;
    salePrice: number;
    profit: number;
    loss: number;
  }[];
}

interface AccountQuarterData {
  quarter: string;
  totalProfit: number;
  totalLoss: number;
}

const AccountsChart: React.FC = () => {
  const { theme } = useTheme();
  const [selectedYear, setSelectedYear] = useState<number>(2025); // Default to current year
  const [barChartData, setBarChartData] = useState<any>(null);
  const [doughnutChartData, setDoughnutChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate array of years for the input range (e.g., 2010 to 2025)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2010 + 1 }, (_, i) => 2010 + i);

  // Fetch data for both charts based on selected year
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch monthly data for bar chart
        const monthlyResponse = await accountsService.getYearlyProfitLossSummary(selectedYear);
        const monthlyData: MonthlyApiResponse = monthlyResponse;

        if (!monthlyData || !monthlyData.monthly) {
          throw new Error('Invalid or empty monthly data');
        }

        // Prepare bar chart data
        const barData = {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          datasets: [
            {
              label: `Profit by Year ${selectedYear}`,
              data: [
                monthlyData.monthly.January || 0,
                monthlyData.monthly.February || 0,
                monthlyData.monthly.March || 0,
                monthlyData.monthly.April || 0,
                monthlyData.monthly.May || 0,
                monthlyData.monthly.June || 0,
                monthlyData.monthly.July || 0,
                monthlyData.monthly.August || 0,
                monthlyData.monthly.September || 0,
                monthlyData.monthly.October || 0,
                monthlyData.monthly.November || 0,
                monthlyData.monthly.December || 0,
              ],
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: '#3B82F6',
              borderWidth: 2,
            },
          ],
        };
        setBarChartData(barData);

        // Fetch quarterly data for doughnut chart
        const quarterlyData: AccountQuarterData[] = await accountsService.getQuarterlyProfitLoss(selectedYear);

        if (!quarterlyData || !Array.isArray(quarterlyData) || quarterlyData.length === 0) {
          throw new Error('Invalid or empty quarterly data');
        }

        // Prepare doughnut chart data
        const doughnutData = {
          labels: ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'],
          datasets: [
            {
              label: 'Profit',
              data: quarterlyData.map(item => item.totalProfit),
              backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'],
              borderColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderWidth: 2,
            },
          ],
        };
        setDoughnutChartData(doughnutData);

        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to fetch data');
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYear, theme]);

  // Bar chart options
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: theme === 'dark' ? '#E5E7EB' : '#374151',
          font: {
            family: 'Inter, system-ui, sans-serif',
          },
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        titleColor: theme === 'dark' ? '#F9FAFB' : '#111827',
        bodyColor: theme === 'dark' ? '#E5E7EB' : '#374151',
        borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        boxWidth: 8,
        boxHeight: 8,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: {
          color: theme === 'dark' ? '#374151' : '#E5E7EB',
          drawBorder: false,
        },
        ticks: {
          color: theme === 'dark' ? '#E5E7EB' : '#374151',
        },
      },
      y: {
        grid: {
          color: theme === 'dark' ? '#374151' : '#E5E7EB',
          drawBorder: false,
        },
        ticks: {
          color: theme === 'dark' ? '#E5E7EB' : '#374151',
          callback: function (tickValue: string | number) {
            if (typeof tickValue === 'number') {
              return `₹${tickValue.toLocaleString('en-IN')}`;
            }
            return `₹${tickValue}`;
          },
        },
      },
    },
  };

  // Doughnut chart options
  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: theme === 'dark' ? '#E5E7EB' : '#374151',
          font: {
            family: 'Inter, system-ui, sans-serif',
            size: 12,
          },
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        titleColor: theme === 'dark' ? '#F9FAFB' : '#111827',
        bodyColor: theme === 'dark' ? '#E5E7EB' : '#374151',
        borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        boxWidth: 8,
        boxHeight: 8,
        cornerRadius: 8,
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw || 0;
            return `${label}: ₹${value.toLocaleString('en-IN')}`;
          },
        },
      },
    },
    cutout: '70%',
    borderRadius: 8,
  };

  // Handle year input change
  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const yearValue = parseInt(e.target.value);
    if (!isNaN(yearValue) && yearValue >= 2010 && yearValue <= currentYear) {
      setSelectedYear(yearValue);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  }

  if (!barChartData || !doughnutChartData) {
    return <div className="text-center p-4">No data available</div>;
  }

  return (
      <div className="mb-6">
        <label
          htmlFor="yearInput"
          className={`block text-sm font-medium mb-2 ${
            theme === 'dark' ? 'text-gray-200' : 'text-gray-700'
          }`}
        >
          Select Year
        </label>
        <InputNumber
          id="yearInput"
          value={selectedYear}
          onChange={(value) => {
            if (typeof value === 'number') setSelectedYear(value);
          }}
          min={2010}
          max={currentYear}
          placeholder="Enter year"
          className={`!rounded-md !border px-2 py-1 text-sm ${
            theme === 'dark'
              ? '!bg-gray-700 !text-white !border-gray-600'
              : '!bg-white !text-black !border-gray-300'
          }`}
          style={{ width: '8rem' }}
        />
        <div className='mt-4 text-center text-sm text-gray-500 dark:text-gray-400'>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title={`Monthly Profit for ${selectedYear}`}>
          <div className="h-80">
            <Bar options={barChartOptions} data={barChartData} />
          </div>
        </Card>
        <Card title="Quarterly Profit">
          <div className="h-80">
            <Doughnut options={doughnutChartOptions} data={doughnutChartData} />
          </div>
        </Card>
      </div>
    </div>
    </div>
  );
};

export default AccountsChart;