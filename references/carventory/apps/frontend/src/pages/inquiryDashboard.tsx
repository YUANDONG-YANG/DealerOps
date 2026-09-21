import React from 'react';
import { motion } from 'framer-motion';
import InquiryTable from './inquiry/InquiryTable';
import InquirySummaryCard from './inquiry/InquirySummaryCard';
const InquiryDashboard: React.FC = () => {
    return (
        <motion.div
            className="p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Inquiry Dashboard
            </h1>
            <InquirySummaryCard />
            <InquiryTable />
        </motion.div>
    );
};

export default InquiryDashboard;