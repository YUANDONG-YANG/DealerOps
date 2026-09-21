'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Star, MapPin, Phone, Mail, Clock, Car, ExternalLink, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dealer } from '@/lib/type';

interface DealerCardProps {
  dealer: Dealer;
}

const DealerCard = ({ dealer }: DealerCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100">
                {dealer.companyLogoUrl ? (
                  <img
                    src={`${dealer.companyLogoUrl}`}
                    alt={`${dealer.companyName} logo`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                    No Logo
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{dealer.companyName}</h3>
                {dealer.rating && dealer.reviewCount ? (
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(dealer.rating!)
                              ? 'text-yellow-500 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {dealer.rating} ({dealer.reviewCount} reviews)
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-600">No reviews yet</span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Est. {dealer.yearEstablished}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            {dealer.description || `Trusted dealer in ${dealer.city}, ${dealer.state}.`}
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-gray-500" />
              <span>
                {dealer.companyAddress}, {dealer.city}, {dealer.state} {dealer.postalCode}, {dealer.country}
              </span>
            </div>
            {dealer.carCount && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Car className="h-4 w-4 text-gray-500" />
                <span>{dealer.carCount} cars available</span>
              </div>
            )}
            {dealer.hours && (
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Clock className="h-4 w-4 text-gray-500" />
                <span>{dealer.hours}</span>
              </div>
            )}
          </div>

          {dealer.specialties && dealer.specialties.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Specialties:</div>
              <div className="flex flex-wrap gap-2">
                {dealer.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4 mr-1" />
                Call
              </Button>
              {dealer.email && (
                <Button size="sm" variant="outline">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Link href={`/dealers/${dealer.id}`} className="flex-1">
                <Button className="w-full" size="sm">
                  View Dealer
                </Button>
              </Link>
              {dealer.website && (
                <Button size="sm" variant="outline" className="px-3" asChild>
                  <a href={dealer.website} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default DealerCard;