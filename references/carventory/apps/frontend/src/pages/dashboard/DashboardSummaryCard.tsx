import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { dashboardService } from '../../services/api';
import {
  CarIcon,
  UsersIcon,
  UserPlusIcon,
  HelpCircleIcon,
  CalendarCheckIcon,
  CarFrontIcon,
  ShoppingCartIcon,
  WrenchIcon,
} from 'lucide-react';

interface DashboardStats {
  totalCars: number;
  totalBuyers: number;
  totalSellers: number;
  pendingInquiries: number;
  bookings: number;
  totalAvailableCars: number;
  soldCars: number;
  carOnMaintenance: number;
}

const DashboardSummaryCard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsResponse] = await Promise.all([dashboardService.getStats()]);
        setStats(statsResponse.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Add `path` property to each item
  const items = [
    {
      title: 'Total Cars',
      value: stats?.totalCars || 0,
      icon: <CarIcon className="text-blue-500" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/45',
      textColor: 'text-blue-600 dark:text-blue-400',
      path: '/cars',
    },
    {
      title: 'Total Buyers',
      value: stats?.totalBuyers || 0,
      icon: <UsersIcon className="text-green-500" />,
      bgColor: 'bg-green-100 dark:bg-green-900/45',
      textColor: 'text-green-600 dark:text-green-400',
      path: '/buyers',
    },
    {
      title: 'Total Sellers',
      value: stats?.totalSellers || 0,
      icon: <UserPlusIcon className="text-orange-500" />,
      bgColor: 'bg-orange-100 dark:bg-orange-900/45',
      textColor: 'text-orange-600 dark:text-orange-400',
      path: '/sellers',
    },
    {
      title: 'Pending Inquiries',
      value: stats?.pendingInquiries || 0,
      icon: <HelpCircleIcon className="text-red-500" />,
      bgColor: 'bg-red-100 dark:bg-red-900/45',
      textColor: 'text-red-600 dark:text-red-400',
      path: '/inquiries',
    },
    {
      title: 'Bookings',
      value: stats?.bookings || 0,
      icon: <CalendarCheckIcon className="text-yellow-500" />,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/45',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      path: '/bookings',
    },
    {
      title: 'Available Cars',
      value: stats?.totalAvailableCars || 0,
      icon: <CarFrontIcon className="text-purple-500" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/45',
      textColor: 'text-purple-600 dark:text-purple-400',
      path: '/cars',
    },
    {
      title: 'Sold Cars',
      value: stats?.soldCars || 0,
      icon: <ShoppingCartIcon className="text-pink-500" />,
      bgColor: 'bg-pink-100 dark:bg-pink-900/45',
      textColor: 'text-pink-600 dark:text-pink-400',
      path: '/cars',
    },
    {
      title: 'Cars on Maintenance',
      value: stats?.carOnMaintenance || 0,
      icon: <WrenchIcon className="text-orange-500" />,
      bgColor: 'bg-amber-100 dark:bg-amber-900/45',
      textColor: 'text-amber-700 dark:text-amber-400',
      path: '/cars',
    },
  ];


  return (
    <Card className="mb-6" glassmorphism>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.title}
            onClick={() => navigate(item.path)}
            className={`${item.bgColor} rounded-lg p-4 flex items-center cursor-pointer shadow hover:shadow-lg transition-shadow duration-300`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="p-3 rounded-full bg-white dark:bg-gray-800 mr-4">
              {item.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {item.title}
              </p>
              <h3 className={`text-2xl font-bold ${item.textColor}`}>
                {item.value}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
};

export default DashboardSummaryCard;