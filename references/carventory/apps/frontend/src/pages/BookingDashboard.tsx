import React from 'react';
import { motion } from 'framer-motion';
import BookingTable from './bookings/BookingTable';
import BookingSummaryCard from './bookings/BookingSummaryCard';
const BookingDashboard: React.FC = () => {
  return (
    <motion.div
      className="p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Booking Dashboard
      </h1>
      <BookingSummaryCard />
      <BookingTable />
    </motion.div>
  );
};

export default BookingDashboard;