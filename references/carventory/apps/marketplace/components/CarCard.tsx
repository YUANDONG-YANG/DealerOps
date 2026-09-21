'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Heart, Fuel, Settings, MapPin, Eye, Calendar, Gauge, Phone, Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CarCardProps {
  car: {
    id: number;
    make: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    fuelType: string;
    transmission: string;
    imageUrl: string | null;
    rtoCode: string;
    dealer: string;
    location: string;
    featured: boolean;
  };
}

const CarCard = ({ car }: CarCardProps) => {
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

  const formatPrice = (price: number) => {
    if (price >= 1000000) {
      return `$${(price / 1000000).toFixed(1)}M`;
    } else if (price >= 1000) {
      return `$${(price / 1000).toFixed(0)}K`;
    }
    return `$${price.toLocaleString()}`;
  };

  const getEstimatedMonthlyPayment = (price: number) => {
    // Simple calculation: price / 60 months at ~5% APR
    const monthlyPayment = (price * 0.05 / 12 + price / 60);
    return Math.round(monthlyPayment);
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="group h-full"
    >
      <Card className="h-full rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-2xl border border-gray-100 transition-all duration-300 group-hover:border-primary/20">
        {/* Image Container */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
          {car.imageUrl ? (
            <Link href={`/cars/${car.id}`}>
              <img
                src={`${car.imageUrl}`}
                alt={`${car.make} ${car.model}`}
                className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                loading="lazy"
              />
            </Link>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center">
                  <img
                    src={makeLogos[car.make] || makeLogos['Unknown']}
                    alt={`${car.make} Logo`}
                    className="h-8 w-8 opacity-50"
                  />
                </div>
                <p className="text-sm text-gray-400">No Image Available</p>
              </div>
            </div>
          )}

          {/* Overlay Elements */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            {car.featured && (
              <Badge className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 shadow-lg">
                <Star className="h-3 w-3 mr-1 fill-current" />
                Featured
              </Badge>
            )}
            <Badge variant="secondary" className="bg-white/90 text-gray-700 text-xs font-medium px-3 py-1 shadow-lg">
              {car.rtoCode}
            </Badge>
          </div>

          {/* Top Right Actions */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <Button
              size="icon"
              variant="secondary"
              className="w-9 h-9 bg-white/90 hover:bg-white shadow-lg backdrop-blur-sm"
            >
              <Heart className="h-4 w-4 text-gray-600" />
            </Button>
          </div>

          {/* Bottom Right View Button */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
            <Link href={`/cars/${car.id}`}>
              <Button
                size="sm"
                className="bg-white/90 hover:bg-white text-gray-900 shadow-lg backdrop-blur-sm"
              >
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </Link>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-6 space-y-5">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-foreground flex items-center space-x-2 mb-1">
                  <img
                    src={makeLogos[car.make] || makeLogos['Unknown']}
                    alt={`${car.make} Logo`}
                    className="h-5 w-5 flex-shrink-0"
                  />
                  <span className="truncate">{car.make} {car.model}</span>
                </h3>
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{car.year}</span>
                  <span>•</span>
                  <Gauge className="h-4 w-4" />
                  <span>{car.mileage.toLocaleString()} km</span>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-1">
              <div className="text-2xl font-bold text-primary">
                {formatPrice(car.price)}
              </div>
              <div className="text-sm text-muted-foreground">
                Est. ${getEstimatedMonthlyPayment(car.price)}/mo
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Fuel className="h-4 w-4 text-green-600" />
              <span>{car.fuelType}</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Settings className="h-4 w-4 text-blue-600" />
              <span>{car.transmission}</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground col-span-2">
              <MapPin className="h-4 w-4 text-red-500" />
              <span className="truncate">{car.location}</span>
            </div>
          </div>

          {/* Dealer Info */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">Sold by</p>
                <p className="font-medium text-foreground truncate">{car.dealer}</p>
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span>4.8</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Link href={`/cars/${car.id}`} className="flex-1">
                <Button className="w-full gradient-primary">
                  View Details
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="px-4 hover:bg-primary hover:text-primary-foreground"
              >
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CarCard;