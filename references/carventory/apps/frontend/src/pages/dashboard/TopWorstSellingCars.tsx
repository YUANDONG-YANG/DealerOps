import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../../components/ui/Card';
import { useTheme } from '../../components/layout/ThemeContext';
import { accountsService } from '../../services/api';

interface CarPerformance {
  carMakeModel: string;
  salesCount: number;
  averageProfit: number;
}

const TopWorstSellingCars: React.FC = () => {
  const { theme } = useTheme();
  const [topCars, setTopCars] = useState<CarPerformance[]>([]);
  const [worstCars, setWorstCars] = useState<CarPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [topCurrentPage, setTopCurrentPage] = useState(1);
  const [worstCurrentPage, setWorstCurrentPage] = useState(1);
  const itemsPerPage = 3;

  useEffect(() => {
    const fetchCarData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [topResponse, worstResponse] = await Promise.all([
          accountsService.getTopPerformingCars(),
          accountsService.getWorstPerformingCars(),
        ]);

        // Filter out vin and map to required fields
        setTopCars(
          topResponse.map(({ carMakeModel, salesCount, averageProfit }: CarPerformance) => ({
            carMakeModel,
            salesCount,
            averageProfit,
          }))
        );
        setWorstCars(
          worstResponse.map(({ carMakeModel, salesCount, averageProfit }: CarPerformance) => ({
            carMakeModel,
            salesCount,
            averageProfit,
          }))
        );
      } catch (err: any) {
        setError(err.message || 'Failed to fetch car performance data');
      } finally {
        setLoading(false);
      }
    };

    fetchCarData();
  }, []);

  // Pagination logic for top-selling cars
  const topTotalPages = Math.ceil(topCars.length / itemsPerPage);
  const topStartIndex = (topCurrentPage - 1) * itemsPerPage;
  const topPaginatedCars = topCars.slice(topStartIndex, topStartIndex + itemsPerPage);

  // Pagination logic for worst-selling cars
  const worstTotalPages = Math.ceil(worstCars.length / itemsPerPage);
  const worstStartIndex = (worstCurrentPage - 1) * itemsPerPage;
  const worstPaginatedCars = worstCars.slice(worstStartIndex, worstStartIndex + itemsPerPage);

  const handleTopPageChange = (page: number) => {
    if (page >= 1 && page <= topTotalPages) {
      setTopCurrentPage(page);
    }
  };

  const handleWorstPageChange = (page: number) => {
    if (page >= 1 && page <= worstTotalPages) {
      setWorstCurrentPage(page);
    }
  };

  const renderCarCard = (car: CarPerformance, index: number, isTop: boolean) => (
    <motion.div
      key={car.carMakeModel}
      className={`${
        isTop
          ? 'bg-green-100 dark:bg-green-900/45'
          : 'bg-red-100 dark:bg-red-900/45'
      } rounded-lg p-4 flex items-center shadow hover:shadow-lg transition-shadow duration-300 cursor-pointer`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <div className="p-3 rounded-full bg-white dark:bg-gray-800 mr-4">
        <CarIcon className={isTop ? 'text-green-500' : 'text-red-500'} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {car.carMakeModel}
        </p>
        <h3
          className={`text-lg font-bold ${
            isTop
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {car.salesCount} Sales
        </h3>
        <p
          className={`text-sm ${
            isTop
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {`₹${car.averageProfit.toLocaleString()} `}
          {isTop ? 'Avg. Profit' : 'Avg. Loss'}
        </p>
      </div>
    </motion.div>
  );

  if (loading) {
    return <div className="text-center p-4">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <div className="mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Top Selling Cars" glassmorphism>
          <div className="grid grid-cols-1 gap-4">
            {topCars.length > 0 ? (
              topPaginatedCars.map((car, index) => renderCarCard(car, index, true))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No top-selling cars available
              </p>
            )}
          </div>
          {topTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleTopPageChange(topCurrentPage - 1)}
                  disabled={topCurrentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: topTotalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handleTopPageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium ${
                        topCurrentPage === page
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleTopPageChange(topCurrentPage + 1)}
                  disabled={topCurrentPage === topTotalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {topStartIndex + 1} to{' '}
                {Math.min(topStartIndex + itemsPerPage, topCars.length)} of {topCars.length} cars
              </div>
            </div>
          )}
        </Card>
        <Card title="Worst Selling Cars" glassmorphism>
          <div className="grid grid-cols-1 gap-4">
            {worstCars.length > 0 ? (
              worstPaginatedCars.map((car, index) => renderCarCard(car, index, false))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center">
                No worst-selling cars available
              </p>
            )}
          </div>
          {worstTotalPages > 1 && (
            <div className="mt-4 flex items-center justify-between px-4 py-3 sm:px-6">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleWorstPageChange(worstCurrentPage - 1)}
                  disabled={worstCurrentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="hidden sm:flex space-x-1">
                  {Array.from({ length: worstTotalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handleWorstPageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 text-sm font-medium ${
                        worstCurrentPage === page
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-white text-gray-700 dark:bg-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => handleWorstPageChange(worstCurrentPage + 1)}
                  disabled={worstCurrentPage === worstTotalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {worstStartIndex + 1} to{' '}
                {Math.min(worstStartIndex + itemsPerPage, worstCars.length)} of {worstCars.length}{' '}
                cars
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TopWorstSellingCars;