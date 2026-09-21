'use client';

import { motion } from 'framer-motion';
import { Search, Star, Shield, Award, TrendingUp, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

const HeroSection = () => {
  const stats = [
    { icon: Star, value: '4.9/5', label: 'Customer Rating', color: 'text-yellow-500' },
    { icon: Shield, value: '150+', label: 'Verified Dealers', color: 'text-green-500' },
    { icon: Award, value: '50K+', label: 'Happy Customers', color: 'text-blue-500' },
    { icon: TrendingUp, value: '1,247+', label: 'Cars Available', color: 'text-purple-500' },
  ];

  const features = [
    'Quality Guaranteed',
    'Transparent Pricing',
    'Verified Dealers',
    'Comprehensive Reports',
  ];

  return (
    <section className="relative min-h-[90vh] lg:min-h-screen flex items-center overflow-hidden">
      {/* Background with Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50" />
      
      {/* Decorative Elements */}
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      
      <div className="container mx-auto container-padding relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-8 xl:pr-8"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
                <Users className="h-4 w-4 mr-2" />
                Trusted by 50,000+ customers
              </Badge>
            </motion.div>

            {/* Headline */}
            <div className="space-y-6">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight"
              >
                Find Your
                <span className="block text-gradient">Perfect Car</span>
                <span className="block text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-normal text-muted-foreground mt-2">
                  with Confidence
                </span>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-2xl"
              >
                Discover premium used cars from verified dealers. Every vehicle comes with 
                comprehensive reports, transparent pricing, and our quality guarantee.
              </motion.p>
            </div>

            {/* Features List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-wrap gap-4"
            >
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-muted-foreground">{feature}</span>
                </div>
              ))}
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-3 p-2 bg-white rounded-2xl shadow-lg border max-w-2xl">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by make, model, or keyword..."
                    className="pl-12 h-12 border-0 bg-transparent text-base focus-visible:ring-0"
                  />
                </div>
                <Button size="lg" className="h-12 px-8 gradient-primary">
                  <Search className="h-5 w-5 mr-2" />
                  Search Cars
                </Button>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground max-w-2xl">
                <span>Popular: Sedan, SUV, Hybrid, Electric</span>
                <Link href="/cars" className="text-primary hover:underline font-medium">
                  Browse All →
                </Link>
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="grid grid-cols-2 lg:grid-cols-4 gap-6 pt-8"
            >
              {stats.map((stat, index) => (
                <div key={index} className="text-center lg:text-left">
                  <div className="flex items-center justify-center lg:justify-start space-x-2 mb-2">
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    <span className="text-2xl lg:text-3xl font-bold text-foreground">
                      {stat.value}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            <div className="relative aspect-[4/3] lg:aspect-[3/4] xl:aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/3802510/pexels-photo-3802510.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Premium car showcase"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay Cards */}
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Live Inventory</p>
                    <p className="text-xs text-muted-foreground">Updated every hour</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">1,247+</p>
                  <p className="text-xs text-muted-foreground">Cars Available</p>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-500/10 rounded-full blur-xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;