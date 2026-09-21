import React from 'react';
import { motion } from 'framer-motion';
import BuyersTable from './buyers/BuyerTable';
import BuyerSummaryCard from './buyers/BuyerSummaryCard';
const BuyersDashboard: React.FC = () => {
  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Buyers Dashboard
      </h1>
      <BuyerSummaryCard />
      <BuyersTable />
    </motion.div>
  );
};

export default BuyersDashboard;