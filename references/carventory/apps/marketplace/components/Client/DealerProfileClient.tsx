'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import {
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Award,
  Shield,
  Calendar,
  Users,
  SlidersHorizontal,
  CarIcon
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import CarCard from '@/components/CarCard';
import { Dealer, Car } from '@/lib/type'; // Correct import path

interface DealerWithCars extends Dealer {
  cars: Car[];
}

interface DealerProfileClientProps {
  dealer: DealerWithCars;
}

const DealerProfileClient = ({ dealer }: DealerProfileClientProps) => {


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Section */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-r from-blue-700 to-blue-900">
        <img
          src={
            dealer.companyImageUrl
              ? `${dealer.companyImageUrl}`
              : 'https://placehold.co/1200x400?text=Cover+Image'
          }
          alt={dealer.companyName}
          className="w-full h-full object-cover rounded-none"
        />
        <div className="absolute inset-0 bg-black/50" />

        {/* Overlay content */}
        <div className="absolute inset-x-0 bottom-0 px-4 sm:px-8 pb-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center sm:items-end space-y-3 sm:space-y-0 sm:space-x-5">

              {/* Logo */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden bg-white p-1.5 shadow-2xl border-2 border-white">
                <img
                  src={
                    dealer.companyLogoUrl
                      ? `${dealer.companyLogoUrl}`
                      : 'https://placehold.co/100x100?text=Logo'
                  }
                  alt={`${dealer.companyName} logo`}
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              {/* Dealer Info */}
              <div className="text-white text-center sm:text-left drop-shadow-md">
                <h1 className="text-2xl sm:text-3xl font-bold">{dealer.companyName}</h1>
                <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 mt-1 text-sm sm:text-base">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4 text-white/90" />
                    <span>{dealer.city}, {dealer.state}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-white/90" />
                    <span>Est. {dealer.yearEstablished || 'N/A'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-0 py-10 max-w-full mx-auto overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col lg:flex-row gap-0 lg:gap-10">
            {/* Sidebar (no scrollbar, properly aligned) */}
            <aside className="lg:sticky top-0 w-full lg:w-80 lg:min-h-screen shrink-0 space-y-6 px-4">

              {/* Contact Info */}
              <Card className="shadow-xl border border-gray-200 rounded-2xl p-4 bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-gray-800">Contact Information</CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="space-y-4 text-sm text-gray-700">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-500 mt-0.5" />
                      <p className="leading-relaxed">
                        {dealer.companyAddress}, {dealer.city}, {dealer.state} {dealer.postalCode}, {dealer.country}
                      </p>
                    </div>

                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-500 mt-0.5" />
                      <p>{dealer.companyPhone}</p>
                    </div>

                    {dealer.email && (
                      <div className="flex items-start gap-3">
                        <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                        <p>{dealer.email}</p>
                      </div>
                    )}

                    {dealer.website && (
                      <div className="flex items-start gap-3">
                        <Globe className="h-5 w-5 text-gray-500 mt-0.5" />
                        <p>{dealer.website}</p>
                      </div>
                    )}

                    {dealer.hours && (
                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
                        <p>{dealer.hours}</p>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="space-y-3 pt-1">
                    <Button className="w-full text-sm font-medium">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Dealer
                    </Button>
                    {dealer.email && (
                      <Button variant="outline" className="w-full text-sm font-medium">
                        <Mail className="h-4 w-4 mr-2" />
                        Email Dealer
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-xl border border-gray-200 rounded-2xl bg-white p-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl font-semibold text-gray-800">Quick Stats</CardTitle>
                </CardHeader>

                <CardContent>
                  <div className="grid grid-cols-2 gap-6 text-center">
                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-blue-600">
                        {dealer.carCount || dealer.cars.length}
                      </div>
                      <div className="text-sm text-gray-500">Cars Available</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-3xl font-bold text-blue-600">
                        {dealer.yearEstablished ? new Date().getFullYear() - dealer.yearEstablished : 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">Years in Business</div>
                    </div>
                  </div>
                </CardContent>
              </Card>


              {/* Specialties */}
              {dealer.specialties && dealer.specialties.length > 0 && (
                <Card className="shadow-xl border border-gray-200 rounded-2xl bg-white p-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xl font-semibold text-gray-800">Specialties</CardTitle>
                  </CardHeader>

                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {dealer.specialties.map((specialty, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-sm font-medium px-3 py-1 rounded-full border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 transition"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </aside>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">

              <Tabs defaultValue="inventory" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="inventory">Inventory</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="mt-6">
                  <Card className="shadow-xl border border-gray-200 rounded-2xl bg-white p-6 w-full">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-2xl font-semibold text-gray-800 mb-2">
                        About {dealer.companyName}
                      </CardTitle>
                    </CardHeader>

                    <CardContent>
                      <p className="text-gray-600 leading-relaxed text-base mb-6">
                        {dealer.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {/* Services Offered */}
                        <div>
                          <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                            <CarIcon className="h-5 w-5 text-blue-600 mr-2" />
                            Services Offered
                          </h4>
                          <ul className="space-y-3">
                            <li className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full" />
                              Financing
                            </li>
                            <li className="flex items-center gap-2 text-sm text-gray-700">
                              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full" />
                              Trade-ins
                            </li>
                          </ul>
                        </div>

                        {/* Key Features */}
                        <div>
                          <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center">
                            <Users className="h-5 w-5 text-blue-600 mr-2" />
                            Key Features
                          </h4>
                          <ul className="space-y-3 text-sm text-gray-700">
                            {[
                              'Transparent pricing',
                              'Comprehensive vehicle inspections',
                              'Competitive financing options',
                              'Trade-in evaluations',
                              'Extended warranty options',
                              'Customer satisfaction guarantee',
                            ].map((feature, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-green-600" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Inventory Tab */}
                <TabsContent value="inventory" className="mt-6">
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <CarIcon className="text-blue-600 h-5 w-5" />
                        <h3 className="text-2xl font-semibold text-gray-800">
                          Current Inventory
                        </h3>
                      </div>
                      <span className="text-sm text-gray-500">
                        {dealer.cars.length} {dealer.cars.length === 1 ? 'car' : 'cars'} available
                      </span>
                    </div>

                    {/* Car Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                      {dealer.cars.map((car, index) => (
                        <motion.div
                          key={car.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className="hover:scale-[1.01] transition-transform duration-300 ease-in-out"
                        >
                          <CarCard
                            car={{
                              id: car.id,
                              make: car.make,
                              model: car.model,
                              year: car.year,
                              price: car.price,
                              mileage: car.mileage,
                              fuelType: car.fuelType,
                              transmission: car.transmission,
                              imageUrl: car.imageUrl,
                              rtoCode: car.rtoCode || 'N/A',
                              dealer: car.companyName,
                              location: `${car.companyCity}, ${car.companyState}`,
                              featured: car.featured || false,
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>

                    {/* CTA */}
                    {dealer.cars.length > 8 && (
                      <div className="text-center pt-4">
                        <Button
                          variant="outline"
                          className="px-6 py-2 rounded-full text-sm font-medium hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          View All Inventory
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default DealerProfileClient;
