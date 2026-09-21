'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CarCard from '@/components/CarCard';
import FilterSidebar from '@/components/FilterSidebar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid, List, SlidersHorizontal } from 'lucide-react';
import { Service } from '@/lib/api';
import { CarCardProps } from '@/lib/type';

const CarsPage = () => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCars, setAllCars] = useState<CarCardProps[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [carsPerPage, setCarsPerPage] = useState(20);

  useEffect(() => {
    fetchAllCars();
  }, []);

  const fetchAllCars = async (retryCount = 3, delay = 1000) => {
    try {
      setLoading(true);
      setError(null);
      const response = await Service.getAllExternalCars();
      console.log('getAllExternalCars Response:', response); // Debug: Log raw response

      const apiCars = Array.isArray(response) ? response : [];
      console.log('getAllExternalCars Parsed:', apiCars); // Debug: Log parsed response

      const mappedCars: CarCardProps[] = apiCars.map((car: any) => {
        console.log('Mapping Car:', car); // Debug: Log each car object
        return {
          car: {
            id: car.carId ?? 0,
            make: car.carMake ?? 'Unknown',
            model: car.carModel ?? 'Unknown',
            year: car.carYear ?? 0,
            price: car.carPrice ?? 0,
            mileage: car.carOdometerReading ?? 0,
            fuelType: car.carFuelType ?? 'N/A',
            transmission: car.carTransmission ?? 'N/A',
            imageUrl: car.carImageUrl ?? null,
            rtoCode: car.rtoCode ?? 'N/A',
            dealer: car.companyName ?? 'Unknown Dealer',
            location: car.location ?? 'N/A',
            featured: car.featured ?? false,
          },
        };
      });

      console.log('Mapped All Cars:', mappedCars); // Debug: Log mapped cars

      setAllCars(mappedCars);

      if (mappedCars.length === 0) {
        setError('No cars found in the API response.');
      }
    } catch (error: any) {
      console.error('Failed to fetch cars:', error);
      if (retryCount > 0) {
        setTimeout(() => fetchAllCars(retryCount - 1, delay * 2), delay);
      } else {
        setError('Failed to load cars. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filteredCars: CarCardProps[]) => {
    console.log('Filtered Cars:', filteredCars); // Debug: Log filtered cars
    setAllCars(filteredCars);
    setCurrentPage(1);
    if (filteredCars.length === 0) {
      setError('No cars match the selected filters. Try adjusting your criteria.');
    } else {
      setError(null);
    }
  };

  const handleResetFilters = () => {
    fetchAllCars();
  };

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      if (width >= 1280 && width < 1536) {
        // Tailwind 'xl'
        setCarsPerPage(21);
      } else {
        setCarsPerPage(20);
      }
    };

    handleResize(); // initial call
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const totalCars = allCars.length;
  const totalPages = Math.ceil(totalCars / carsPerPage);
  const startIndex = (currentPage - 1) * carsPerPage;
  const paginatedCars = allCars.slice(startIndex, startIndex + carsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Button
          key={i}
          variant={currentPage === i ? "default" : "outline"}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Button>
      );
    }

    return buttons;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Browse Cars
            </h1>
            <p className="text-lg text-gray-600">
              Discover your perfect car from our extensive collection
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            <div className="lg:w-80">
              <div className="lg:hidden mb-4">
                <Button
                  variant="outline"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </div>
              <div className={`lg:block ${isFilterOpen ? 'block' : 'hidden'}`}>
                <FilterSidebar onFilterChange={handleFilterChange} onResetFilters={handleResetFilters} />
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <p className="text-gray-600">
                  Showing {totalCars > 0 ? startIndex + 1 : 0} -{' '}
                  {Math.min(startIndex + paginatedCars.length, totalCars)} of {totalCars} cars
                </p>

                <div className="flex border rounded-lg overflow-hidden">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {loading && (
                <div className="text-center py-8">
                  <p className="text-gray-600">Loading cars...</p>
                </div>
              )}
              {error && (
                <div className="text-center py-8">
                  <p className="text-red-600">{error}</p>
                  <Button
                    variant="outline"
                    onClick={() => fetchAllCars()}
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              )}
              {!loading && !error && paginatedCars.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-600">No cars found. Try adjusting your filters or retry.</p>
                  <Button
                    variant="outline"
                    onClick={() => fetchAllCars()}
                    className="mt-4"
                  >
                    Retry
                  </Button>
                </div>
              )}

              {!loading && !error && paginatedCars.length > 0 && (
                <div
                  className={`grid gap-6 ${
                    viewMode === 'grid'
                      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'
                      : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3'
                  }`}
                >
                  {paginatedCars.map((car, index) => (
                    <motion.div
                      key={car.car.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <CarCard car={car.car} />
                    </motion.div>
                  ))}
                </div>
              )}

              {!loading && !error && totalCars > 0 && (
                <div className="mt-12 flex justify-center">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    {getPaginationButtons()}
                    <Button
                      variant="outline"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CarsPage;