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

const SellerSummaryCard: React.FC = () => {
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

  const items = [
    {
      title: 'Total Sellers',
      value: stats?.totalSellers || 0,
      icon: <UserPlusIcon className="text-orange-500" />,
      bgColor: 'bg-orange-100 dark:bg-orange-900/40',
      textColor: 'text-orange-600 dark:text-orange-400',
    },
    {
      title: 'Total Buyers',
      value: stats?.totalBuyers || 0,
      icon: <UsersIcon className="text-green-500" />,
      bgColor: 'bg-green-100 dark:bg-green-900/40',
      textColor: 'text-green-600 dark:text-green-400',
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
      title: 'Bookings',
      value: stats?.bookings || 0,
      icon: <CalendarCheckIcon className="text-yellow-500" />,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/40',
      textColor: 'text-yellow-600 dark:text-yellow-400',
    },
  ];

  return (
    <Card className="mb-6" glassmorphism>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.title}
            className={`${item.bgColor} rounded-lg p-4 flex items-center`}
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

export default SellerSummaryCard;