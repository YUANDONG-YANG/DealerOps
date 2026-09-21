import React from 'react';
import { motion } from 'framer-motion';
import CarSummaryCard from './cars/CarSummaryCard';
import CarsTable from './cars/CarTable';
const CarDashboard: React.FC = () => {
  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Cars Dashboard
      </h1>
      <CarSummaryCard />
      <CarsTable />
    </motion.div>
  );
};

export default CarDashboard;