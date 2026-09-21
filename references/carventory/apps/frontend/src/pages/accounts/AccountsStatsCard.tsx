import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../../components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { accountsService, dashboardService } from '../../services/api';
import {
  PercentIcon,
  TrendingUpIcon,
  BarChartIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  CarFrontIcon,
  WarehouseIcon,
  PackageXIcon,
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

interface ROIResponse {
  totalInvestment: number;
  totalProfit: number;
  roiPercentage: number;
}

interface UnsoldCarsResponse {
  totalStuckCapital: number;
  totalUnsoldCars: number;
}

const AccountsSummaryCard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [roiTotal, setRoiTotal] = useState<ROIResponse | null>(null);
  const [roiYearly, setRoiYearly] = useState<ROIResponse | null>(null);
  const [roiMonthly, setRoiMonthly] = useState<ROIResponse | null>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [unsoldCars, setUnsoldCars] = useState<UnsoldCarsResponse | null>(null);
  const [totalPurchasePrice, setTotalPurchasePrice] = useState<number>(0);
  const [totalSalePrice, setTotalSalePrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Function to format large numbers with commas
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1; // Months are 0-indexed, so add 1
        const currentYear = currentDate.getFullYear();
        const [
          statsResponse,
          roiTotalResponse,
          roiYearlyResponse,
          profitResponse,
          roiMonthlyResponse,
          unsoldCarsResponse,
          purchasePriceResponse,
          salePriceResponse,
        ] = await Promise.all([
          dashboardService.getStats(),
          accountsService.getROIForAllSales(),
          accountsService.getROIByYear(currentYear),
          accountsService.calculateProfitOrLoss(),
          accountsService.getROIByMonth(currentMonth, currentYear),
          accountsService.getUnsoldCarsCost(),
          accountsService.getTotalPurchasePrice(),
          accountsService.getTotalSalePrice(),
        ]);
        setStats(statsResponse.data);
        setRoiTotal(roiTotalResponse);
        setRoiYearly(roiYearlyResponse);
        setTotalProfit(profitResponse);
        setRoiMonthly(roiMonthlyResponse);
        setUnsoldCars(unsoldCarsResponse);
        setTotalPurchasePrice(purchasePriceResponse);
        setTotalSalePrice(salePriceResponse);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const items = [
    {
      title: 'Total ROI',
      value: roiTotal?.roiPercentage ?? 0,
      icon: <PercentIcon className="text-blue-500" />,
      bgColor: 'bg-blue-100 dark:bg-blue-900/45',
      textColor: 'text-blue-600 dark:text-blue-400',
      path: '/cars',
    },
    {
      title: 'Yearly ROI',
      value: roiYearly?.roiPercentage || 0,
      icon: <TrendingUpIcon className="text-green-500" />,
      bgColor: 'bg-green-100 dark:bg-green-900/45',
      textColor: 'text-green-600 dark:text-green-400',
      path: '/buyers',
    },
    {
      title: 'Monthly ROI',
      value: roiMonthly?.roiPercentage || 0,
      icon: <BarChartIcon className="text-orange-500" />,
      bgColor: 'bg-orange-100 dark:bg-orange-900/45',
      textColor: 'text-orange-600 dark:text-orange-400',
      path: '/sellers',
    },
    {
      title: 'Total Profit',
      value: formatNumber(totalProfit),
      icon: <DollarSignIcon className="text-amber-500" />,
      bgColor: 'bg-amber-100 dark:bg-amber-900/45',
      textColor: 'text-amber-700 dark:text-amber-400',
      path: '/cars',
    },
    {
      title: 'Total Cars Purchase Price',
      value: formatNumber(totalPurchasePrice),
      icon: <ShoppingBagIcon className="text-yellow-500" />,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/45',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      path: '/bookings',
    },
    {
      title: 'Total Cars Sale Price',
      value: formatNumber(totalSalePrice),
      icon: <CarFrontIcon className="text-purple-500" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/45',
      textColor: 'text-purple-600 dark:text-purple-400',
      path: '/cars',
    },
    {
      title: 'Car in Stock',
      value: unsoldCars?.totalUnsoldCars || 0,
      icon: <WarehouseIcon className="text-red-500" />,
      bgColor: 'bg-red-100 dark:bg-red-900/45',
      textColor: 'text-red-600 dark:text-red-400',
      path: '/inquiries',
    },
    {
      title: 'Unsold Cars Cost',
      value: formatNumber(unsoldCars?.totalStuckCapital || 0),
      icon: <PackageXIcon className="text-pink-500" />,
      bgColor: 'bg-pink-100 dark:bg-pink-900/45',
      textColor: 'text-pink-600 dark:text-pink-400',
      path: '/cars',
    },
  ];

  return (
    <Card className="mb-6" glassmorphism>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item, index) => (
          <motion.div
            key={item.title}
            // onClick={() => navigate(item.path)}
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

export default AccountsSummaryCard;