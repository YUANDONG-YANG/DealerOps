'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, SlidersHorizontal, MapPin, Calendar, Fuel, Settings, DollarSign } from 'lucide-react';
import Link from 'next/link';

const SearchFilters = () => {
  const [priceRange, setPriceRange] = useState([15000, 75000]);
  const [yearRange, setYearRange] = useState([2018, 2024]);
  const [isExpanded, setIsExpanded] = useState(false);

  const popularMakes = [
    { name: 'Toyota', count: '245 cars' },
    { name: 'Honda', count: '189 cars' },
    { name: 'BMW', count: '156 cars' },
    { name: 'Mercedes', count: '134 cars' },
    { name: 'Audi', count: '98 cars' },
    { name: 'Hyundai', count: '87 cars' },
  ];

  const quickFilters = [
    { label: 'Under $20K', value: 'under-20k', count: '342' },
    { label: 'Hybrid', value: 'hybrid', count: '89' },
    { label: 'Low Mileage', value: 'low-mileage', count: '156' },
    { label: 'Single Owner', value: 'single-owner', count: '234' },
    { label: 'Certified', value: 'certified', count: '178' },
  ];

  return (
    <section className="section-padding bg-white">
      <div className="container mx-auto container-padding">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          {/* Section Header */}
          <div className="text-center space-y-4">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Find Your Ideal Car
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Use our advanced filters to narrow down your search and find the perfect vehicle
            </p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap justify-center gap-3">
            {quickFilters.map((filter, index) => (
              <motion.div
                key={filter.value}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Badge 
                  variant="secondary" 
                  className="px-4 py-2 text-sm cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {filter.label}
                  <span className="ml-2 text-xs opacity-70">({filter.count})</span>
                </Badge>
              </motion.div>
            ))}
          </div>

          {/* Main Search Card */}
          <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-6 lg:p-8">
              <div className="space-y-8">
                {/* Primary Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <Search className="h-4 w-4 mr-2 text-primary" />
                      Make & Model
                    </label>
                    <Select>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Any Make" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="toyota">Toyota</SelectItem>
                        <SelectItem value="honda">Honda</SelectItem>
                        <SelectItem value="bmw">BMW</SelectItem>
                        <SelectItem value="mercedes">Mercedes-Benz</SelectItem>
                        <SelectItem value="audi">Audi</SelectItem>
                        <SelectItem value="hyundai">Hyundai</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-primary" />
                      Body Type
                    </label>
                    <Select>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Any Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="hatchback">Hatchback</SelectItem>
                        <SelectItem value="coupe">Coupe</SelectItem>
                        <SelectItem value="convertible">Convertible</SelectItem>
                        <SelectItem value="wagon">Wagon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <Fuel className="h-4 w-4 mr-2 text-primary" />
                      Fuel Type
                    </label>
                    <Select>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Any Fuel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="petrol">Petrol</SelectItem>
                        <SelectItem value="diesel">Diesel</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="electric">Electric</SelectItem>
                        <SelectItem value="cng">CNG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground flex items-center">
                      <MapPin className="h-4 w-4 mr-2 text-primary" />
                      Location
                    </label>
                    <Input
                      type="text"
                      placeholder="City or ZIP code"
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Advanced Filters Toggle */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="px-6"
                  >
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {isExpanded ? 'Hide' : 'Show'} Advanced Filters
                  </Button>
                </div>

                {/* Advanced Filters */}
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-6 pt-6 border-t"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Price Range */}
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-foreground flex items-center">
                          <DollarSign className="h-4 w-4 mr-2 text-primary" />
                          Price Range: ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
                        </label>
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          min={5000}
                          max={150000}
                          step={5000}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>$5,000</span>
                          <span>$150,000+</span>
                        </div>
                      </div>

                      {/* Year Range */}
                      <div className="space-y-4">
                        <label className="text-sm font-medium text-foreground flex items-center">
                          <Calendar className="h-4 w-4 mr-2 text-primary" />
                          Year Range: {yearRange[0]} - {yearRange[1]}
                        </label>
                        <Slider
                          value={yearRange}
                          onValueChange={setYearRange}
                          min={2010}
                          max={2024}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>2010</span>
                          <span>2024</span>
                        </div>
                      </div>
                    </div>

                    {/* Additional Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Transmission" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Manual</SelectItem>
                          <SelectItem value="automatic">Automatic</SelectItem>
                          <SelectItem value="cvt">CVT</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Mileage" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="under-30k">Under 30,000 km</SelectItem>
                          <SelectItem value="30k-60k">30,000 - 60,000 km</SelectItem>
                          <SelectItem value="60k-100k">60,000 - 100,000 km</SelectItem>
                          <SelectItem value="over-100k">Over 100,000 km</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Condition" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                )}

                {/* Search Actions */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6">
                  <Link href="/cars" className="flex-1">
                    <Button size="lg" className="w-full gradient-primary">
                      <Search className="h-5 w-5 mr-2" />
                      Search Cars ({Math.floor(Math.random() * 500) + 800} found)
                    </Button>
                  </Link>
                  <Button variant="outline" size="lg" className="sm:w-auto">
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Popular Makes */}
          <div className="text-center space-y-6">
            <h3 className="text-xl font-semibold text-foreground">
              Browse by Popular Makes
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularMakes.map((make, index) => (
                <motion.div
                  key={make.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <Link href={`/cars?make=${make.name.toLowerCase()}`}>
                    <Card className="card-hover cursor-pointer group">
                      <CardContent className="p-4 text-center">
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {make.name}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {make.count}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SearchFilters;