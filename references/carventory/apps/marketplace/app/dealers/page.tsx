'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import DealerCard from '@/components/DealerCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin } from 'lucide-react';
import { Service } from '@/lib/api'; // Adjust path to your API service
import { Dealer } from '@/lib/type';


const DealersPage = () => {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDealers = async () => {
      try {
        setLoading(true);
        const response = await Service.getAllDealers();
        setDealers(response);
        setError(null);
      } catch (error) {
        console.error('Failed to fetch dealers:', error);
        setError('Failed to load dealers. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchDealers();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Find Trusted Dealers
            </h1>
            <p className="text-lg text-gray-600">
              Connect with verified dealers in your area for the best car buying experience
            </p>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search dealers by name..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter location..."
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="reviews">Most Reviews</SelectItem>
                    <SelectItem value="distance">Distance</SelectItem>
                    <SelectItem value="inventory">Most Inventory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search Dealers
              </Button>
            </div>
          </div>

          {/* Results */}
          <div className="mb-6">
            {loading ? (
              <p className="text-gray-600">Loading dealers...</p>
            ) : error ? (
              <p className="text-red-600">{error}</p>
            ) : (
              <p className="text-gray-600">
                Showing {dealers.length} dealers
              </p>
            )}
          </div>

          {/* Dealers Grid */}
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div>{error}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dealers.map((dealer, index) => (
                <motion.div
                  key={dealer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <DealerCard dealer={dealer} />
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <div className="flex space-x-2">
              <Button variant="outline" disabled>Previous</Button>
              <Button>1</Button>
              <Button variant="outline">2</Button>
              <Button variant="outline">3</Button>
              <Button variant="outline">Next</Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DealersPage;