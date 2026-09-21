import React from 'react';
import { motion } from 'framer-motion';
import DashboardBookingsTable from './dashboard/DashboardBookingsTable';
import DashboardSummaryCard from './dashboard/DashboardSummaryCard';
import DashboardChart from './dashboard/MonthlyCarSoldChartAndEmployes';
import TopWorstSellingCars from './dashboard/TopWorstSellingCars';
import CarsByInventoryDays from './dashboard/CarsByInventoryDays';

const Dashboard: React.FC = () => {
  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Financial Dashboard
      </h1>
      <DashboardSummaryCard />
      <DashboardBookingsTable />
      <DashboardChart />
      <TopWorstSellingCars />
      <CarsByInventoryDays />
    </motion.div>
  );
};

export default Dashboard;