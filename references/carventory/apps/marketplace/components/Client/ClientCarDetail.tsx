'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Calendar, Fuel, Gauge, Heart, Mail, MapPin, Phone, Settings, Share2, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
import { CarDetail } from '@/lib/type';
import { useState } from 'react';

interface ClientCarDetailsProps {
  carId: number;
  carDetail: CarDetail;
}

function ClientCarDetails({ carId, carDetail }: ClientCarDetailsProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Mapping of car makes to their logo URLs
  const makeLogos: Record<string, string> = {
    'Maruti Suzuki': 'https://www.carlogos.org/car-logos/suzuki-logo.png',
    'Tata Motors': 'https://www.carlogos.org/car-logos/tata-logo.png',
    'Mahindra': 'https://www.carlogos.org/car-logos/mahindra-logo.png',
    'Hyundai': 'https://www.carlogos.org/car-logos/hyundai-logo.png',
    'Kia': 'https://www.carlogos.org/car-logos/kia-logo.png',
    'Honda': 'https://www.carlogos.org/car-logos/honda-logo.png',
    'Toyota': 'https://www.carlogos.org/car-logos/toyota-logo.png',
    'Renault': 'https://www.carlogos.org/car-logos/renault-logo.png',
    'Volkswagen': 'https://www.carlogos.org/car-logos/volkswagen-logo.png',
    'Skoda': 'https://www.carlogos.org/car-logos/skoda-logo.png',
    'MG': 'https://www.carlogos.org/car-logos/mg-logo.png',
    'Nissan': 'https://www.carlogos.org/car-logos/nissan-logo.png',
    'Jeep': 'https://www.carlogos.org/car-logos/jeep-logo.png',
    'Citroën': 'https://www.carlogos.org/car-logos/citroen-logo.png',
    'BMW': 'https://www.carlogos.org/car-logos/bmw-logo.png',
    'Mercedes-Benz': 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png',
    'Audi': 'https://www.carlogos.org/car-logos/audi-logo.png',
    'Volvo': 'https://www.carlogos.org/car-logos/volvo-logo.png',
    'Lexus': 'https://www.carlogos.org/car-logos/lexus-logo.png',
    'Jaguar': 'https://www.carlogos.org/car-logos/jaguar-logo.png',
    'Land Rover': 'https://www.carlogos.org/car-logos/land-rover-logo.png',
    'Mini': 'https://www.carlogos.org/car-logos/mini-logo.png',
    'Porsche': 'https://www.carlogos.org/car-logos/porsche-logo.png',
    'Maserati': 'https://www.carlogos.org/car-logos/maserati-logo.png',
    'Lamborghini': 'https://www.carlogos.org/car-logos/lamborghini-logo.png',
    'Ferrari': 'https://www.carlogos.org/car-logos/ferrari-logo.png',
    'Rolls-Royce': 'https://www.carlogos.org/car-logos/rolls-royce-logo.png',
    'Bentley': 'https://www.carlogos.org/car-logos/bentley-logo.png',
    'Aston Martin': 'https://www.carlogos.org/car-logos/aston-martin-logo.png',
    'BYD': 'https://www.carlogos.org/car-logos/byd-logo.png',
    'Tesla': 'https://www.carlogos.org/car-logos/tesla-logo.png',
    'Ford': 'https://www.carlogos.org/car-logos/ford-logo.png',
    'Chevrolet': 'https://www.carlogos.org/car-logos/chevrolet-logo.png',
    'Fiat': 'https://www.carlogos.org/car-logos/fiat-logo.png',
    'Datsun': 'https://www.carlogos.org/car-logos/datsun-logo.png',
    'Isuzu': 'https://www.carlogos.org/car-logos/isuzu-logo.png',
    'Unknown': 'https://www.carlogos.org/logo/Car-Logos-logo.png',
  };

  if (!carDetail?.car) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">No car data available.</p>
        </div>
      </div>
    );
  }

  const { car, dealer, carImage, features } = carDetail;

  // Collect all available images into an array
  const images = [
    carImage.imageUrl,
    carImage.carImage1Url,
    carImage.carImage2Url,
    carImage.carImage3Url,
    carImage.carImage4Url,
    carImage.carImage5Url,
    carImage.carImage6Url,
    carImage.carImage7Url,
    carImage.carImage8Url,
    carImage.carImage9Url,
    carImage.carImage10Url,
    carImage.carImage11Url,
    carImage.carImage12Url,
    carImage.carImage13Url,
    carImage.carImage14Url,
    carImage.carImage15Url,
  ].filter((img): img is string => img !== null && img !== undefined);

  // Navigation functions
  const handlePrevImage = () => {
    setSelectedImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
                  <img
                    src={makeLogos[car.make] || makeLogos['Unknown']}
                    alt={`${car.make} Logo`}
                    className="h-[1em] w-auto inline-block align-middle"
                  />
                  <span>{car.year} {car.make} {car.model}</span>
                </h1>
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {dealer.companyAddress}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4 mt-4 md:mt-0">
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">
                    ${car.price.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">
                    ${(car.price / 60).toFixed(0)}/mo est.
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Heart className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Image Gallery */}
            <div className="lg:col-span-2">
              <Card className="overflow-hidden shadow-lg border-0">
                <div className="relative aspect-[4/3]">
                  {images.length > 0 ? (
                    <>
                      <img
                        src={`${images[selectedImageIndex]}`}
                        alt={`${car.make} ${car.model}`}
                        className="w-full h-full object-cover rounded-t-lg"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-between p-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handlePrevImage}
                          disabled={images.length <= 1}
                          className="bg-white/80 hover:bg-white disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleNextImage}
                          disabled={images.length <= 1}
                          className="bg-white/80 hover:bg-white disabled:opacity-50"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="flex space-x-2">
                          {images.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setSelectedImageIndex(index)}
                              className={`w-2 h-2 rounded-full transition-colors ${
                                index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm rounded-t-lg">
                      No Image Available
                    </div>
                  )}
                </div>
                {images.length > 0 && (
                  <div className="p-4">
                    <div className="grid grid-cols-6 gap-2">
                      {images.map((img, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedImageIndex(index)}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                            index === selectedImageIndex ? 'border-blue-500' : 'border-gray-200'
                          }`}
                        >
                          <img
                            src={`${img}`}
                            alt={`${car.make} ${car.model} ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Key Specs */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Key Specifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Year</div>
                        <div className="font-medium">{car.year}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Gauge className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Mileage</div>
                        <div className="font-medium">{car.mileage.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Fuel className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Fuel Type</div>
                        <div className="font-medium">{car.fuelType}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-600">Transmission</div>
                        <div className="font-medium">{car.transmission}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dealer Info */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Dealer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg">{dealer.companyName}</h4>
                    <p className="text-sm text-gray-600">Dealer ID: {dealer.id}</p>
                  </div>
                  <Separator />
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{dealer.companyAddress}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{dealer.companyPhone}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <Button className="w-full">
                      <Phone className="h-4 w-4 mr-2" />
                      Call Dealer
                    </Button>
                    <Button variant="outline" className="w-full">
                      <Mail className="h-4 w-4 mr-2" />
                      Email Dealer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Financing */}
              <Card className="shadow-lg border-0">
                <CardHeader>
                  <CardTitle className="text-lg">Financing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      ${(car.price / 60).toFixed(0)}/mo
                    </div>
                    <div className="text-sm text-gray-600">
                      Est. monthly payment
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    Get Pre-Approved
                  </Button>
                  <div className="text-xs text-gray-500 text-center">
                    *Based on 60 months at 4.9% APR with $2,000 down
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Detailed Information */}
          <div className="mt-12">
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="specs">Specifications</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="mt-6">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-xl font-semibold mb-3">Description</h3>
                        <p className="text-gray-600 leading-relaxed">
                          {features.description}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">Exterior</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>Color: {features.exteriorColor}</li>
                            <li>Body Type: {features.bodyType}</li>
                            <li>Drivetrain: {features.drivetrain}</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">Interior</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>Color: {features.interiorColor}</li>
                            <li>Seating: 5 passengers</li>
                            <li>Cargo: Unknown</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="specs" className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h4 className="font-semibold mb-4">Engine & Performance</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Engine:</span>
                            <span>{features.engine}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Horsepower:</span>
                            <span>{features.horsepower || 'Unknown'} hp</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">MPG:</span>
                            <span>{car.mileage}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Drivetrain:</span>
                            <span>{features.drivetrain}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-4">Vehicle Details</h4>
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">VIN:</span>
                            <span className="font-mono">{car.vin}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Body Style:</span>
                            <span>{features.bodyType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Doors:</span>
                            <span>4</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="mt-6">
                    <div>
                      <h4 className="font-semibold mb-4">Standard Features</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                            <span className="text-sm">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-6">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-green-500" />
                        <span className="font-semibold">Vehicle History</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold mb-3">History Report</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>Number of Owners: {car.numberOfOwners || 'Unknown'}</li>
                            <li>Condition: {car.condition || 'Unknown'}</li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-3">Service Records</h4>
                          <ul className="space-y-2 text-sm text-gray-600">
                            <li>Service history: Contact dealer</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default ClientCarDetails;