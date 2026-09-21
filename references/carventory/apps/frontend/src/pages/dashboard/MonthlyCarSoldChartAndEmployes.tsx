import React, { useEffect, useState, useMemo } from 'react';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyUserResponse {
  userId: number;
  ownerName: string;
  carsSold: number;
}

interface MonthlyCarResponse {
  jan: number;
  feb: number;
  mar: number;
  apr: number;
  may: number;
  jun: number;
  jul: number;
  aug: number;
  sep: number;
  oct: number;
  nov: number;
  dec: number;
}

const DashboardChart: React.FC = () => {
  const { theme } = useTheme();
  const [barChartData, setBarChartData] = useState<any>(null);
  const [doughnutChartData, setDoughnutChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [monthlyResponse, yearlyResponse] = await Promise.all([
          accountsService.getUserSalesThisMonth(),
          accountsService.getMonthlySoldCarCount(),
        ]);

        const monthlyData: MonthlyUserResponse[] = monthlyResponse;

        const barData = {
          labels: monthlyData.map((user) => user.ownerName),
          datasets: [
            {
              label: 'Cars Sold This Month',
              data: monthlyData.map((user) => user.carsSold),
              backgroundColor: [
                'rgba(59, 130, 246, 0.5)',
                'rgba(16, 185, 129, 0.5)',
                'rgba(245, 158, 11, 0.5)',
                'rgba(139, 92, 246, 0.5)',
                'rgba(239, 68, 68, 0.5)',
              ].slice(0, monthlyData.length),
              borderColor: [
                '#3B82F6',
                '#10B981',
                '#F59E0B',
                '#8B5CF6',
                '#EF4444',
              ].slice(0, monthlyData.length),
              borderWidth: 2,
              barThickness: 30,
              maxBarThickness: 40,
            },
          ],
        };
        setBarChartData(barData);

        const carData: MonthlyCarResponse = {
          jan: Number(yearlyResponse.jan),
          feb: Number(yearlyResponse.feb),
          mar: Number(yearlyResponse.mar),
          apr: Number(yearlyResponse.apr),
          may: Number(yearlyResponse.may),
          jun: Number(yearlyResponse.jun),
          jul: Number(yearlyResponse.jul),
          aug: Number(yearlyResponse.aug),
          sep: Number(yearlyResponse.sep),
          oct: Number(yearlyResponse.oct),
          nov: Number(yearlyResponse.nov),
          dec: Number(yearlyResponse.dec),
        };

        const doughnutData = {
          labels: [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
          ],
          datasets: [
            {
              label: 'Monthly Sold Cars',
              data: Object.values(carData),
              backgroundColor: [
                '#FF5733', '#33FF57', '#3357FF', '#FF33A6', '#33FFF0',
                '#F39C12', '#8E44AD', '#2ECC71', '#E74C3C', '#3498DB',
                '#E67E22', '#1ABC9C'
              ],
              borderColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
              borderWidth: 2,
            },
          ],
        };

        setDoughnutChartData(doughnutData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [theme]);

  const barChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
        titleColor: theme === 'dark' ? '#F9FAFB' : '#111827',
        bodyColor: theme === 'dark' ? '#E5E7EB' : '#374151',
        borderColor: theme === 'dark' ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: theme === 'dark' ? '#374151' : '#E5E7EB', drawBorder: false },
        ticks: { color: theme === 'dark' ? '#E5E7EB' : '#374151' },
        title: { display: true, text: 'Employees', color: theme === 'dark' ? '#E5E7EB' : '#374151' },
      },
      y: {
        grid: { color: theme === 'dark' ? '#374151' : '#E5E7EB', drawBorder: false },
        ticks: {
          color: theme === 'dark' ? '#E5E7EB' : '#374151',
          callback: function (tickValue: string | number) {
            return `${tickValue}`;
          },
        },
        title: { display: true, text: 'Number of Cars Sold', color: theme === 'dark' ? '#E5E7EB' : '#374151' },
      },
    },
  }), [theme]);

  const doughnutChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'right' as const,
        labels: {
          color: theme === 'dark' ? '#E5E7EB' : '#374151',
          font: { family: 'Inter, system-ui, sans-serif', size: 12 },
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
        cornerRadius: 8,
        callbacks: {
          label: (context: any) => `${context.label}: ${context.raw} cars`,
        },
      },
    },
    cutout: '70%',
    borderRadius: 8,
  }), [theme]);

  if (loading) return <div className="text-center p-4">Loading...</div>;
  if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  if (!barChartData || !doughnutChartData) return <div className="text-center p-4">No data available</div>;

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Monthly Cars Sold by Employees">
          <div className="h-80">
            <Bar options={barChartOptions} data={barChartData} />
          </div>
        </Card>
        <Card title="Monthly Sold Cars">
          <div className="h-80">
            <Doughnut options={doughnutChartOptions} data={doughnutChartData} />
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DashboardChart;