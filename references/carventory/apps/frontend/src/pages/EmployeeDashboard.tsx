import React from 'react';
import { motion } from 'framer-motion';
import EmployeeTable from './employee/EmployeeTable';
const EmployeeDashboard: React.FC = () => {
    return (
        <motion.div
            className="p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Employees Dashboard
            </h1>
            <EmployeeTable />
        </motion.div>
    );
};

export default EmployeeDashboard;