import React from 'react';
import { motion } from 'framer-motion';
import SellersList from './sellers/SellerTable';
import SellerSummaryCard from './sellers/SellerSummaryCard';
import SellerTable from './sellers/SellerTable';
const SellerDashboard: React.FC = () => {
  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Sellers Dashboard
      </h1>
      <SellerSummaryCard/>
      <SellerTable/>
    </motion.div>
  );
};

export default SellerDashboard;