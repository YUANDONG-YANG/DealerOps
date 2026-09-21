import React from 'react';
import { motion } from 'framer-motion';
import AccountsSummaryCard from './accounts/AccountsStatsCard';
import AccountsChart from './accounts/AccountsDoughnutAndBarChart';
import UnifiedProfitLossTable from './accounts/UnifiedProfitLossTable';
import ExportReportsTable from './accounts/ExportReportsTable';
const AccountsDashboard: React.FC = () => {
  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      Accounts Dashboard
      </h1>
      <AccountsSummaryCard />
      <AccountsChart  />
      <UnifiedProfitLossTable />
      <ExportReportsTable />
    </motion.div>
  );
};

export default AccountsDashboard;