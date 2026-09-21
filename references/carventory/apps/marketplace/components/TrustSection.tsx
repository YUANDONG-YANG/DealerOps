'use client';

import { motion } from 'framer-motion';
import { Shield, Award, Users, CheckCircle, Star, TrendingUp, Heart, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TrustSection = () => {
  const features = [
    {
      icon: Shield,
      title: 'Verified Dealers',
      description: 'All our dealers are thoroughly vetted and verified for your complete peace of mind and security',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: Award,
      title: 'Quality Guaranteed',
      description: 'Every car comes with a comprehensive quality check, detailed inspection report, and our guarantee',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Users,
      title: 'Trusted by Thousands',
      description: 'Join over 50,000+ satisfied customers who found their perfect car through our platform',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: CheckCircle,
      title: 'Transparent Pricing',
      description: 'No hidden fees, no surprises, no haggling. What you see is exactly what you pay',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
    },
  ];

  const stats = [
    { 
      icon: TrendingUp,
      number: '1,247+', 
      label: 'Cars Available',
      description: 'Fresh inventory updated daily',
      color: 'text-blue-600'
    },
    { 
      icon: Shield,
      number: '150+', 
      label: 'Verified Dealers',
      description: 'Trusted partners nationwide',
      color: 'text-green-600'
    },
    { 
      icon: Heart,
      number: '50K+', 
      label: 'Happy Customers',
      description: 'Successful car purchases',
      color: 'text-red-500'
    },
    { 
      icon: Star,
      number: '4.9/5', 
      label: 'Average Rating',
      description: 'Based on customer reviews',
      color: 'text-yellow-500'
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'First-time buyer',
      content: 'Amazing experience! Found my dream car in just 2 days. The process was transparent and stress-free.',
      rating: 5,
    },
    {
      name: 'Michael Chen',
      role: 'Repeat customer',
      content: 'Third car purchased through Carventory. Consistently excellent service and quality vehicles.',
      rating: 5,
    },
    {
      name: 'Emily Rodriguez',
      role: 'Family buyer',
      content: 'Perfect for families! Great selection of safe, reliable cars with detailed history reports.',
      rating: 5,
    },
  ];

  const certifications = [
    { name: 'BBB Accredited', badge: 'A+' },
    { name: 'Consumer Choice', badge: '2024' },
    { name: 'Industry Leader', badge: '#1' },
    { name: 'Trust Certified', badge: '✓' },
  ];

  return (
    <section className="section-padding bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto container-padding">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-16"
        >
          {/* Section Header */}
          <div className="text-center space-y-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="px-4 py-2 text-sm font-medium mb-4">
                <Shield className="h-4 w-4 mr-2" />
                Trusted & Verified
              </Badge>
            </motion.div>
            
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground text-balance">
              Why Choose Carventory?
            </h2>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto text-balance">
              We're committed to making your car buying experience safe, transparent, 
              and enjoyable with industry-leading standards and customer-first approach.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full card-hover border-0 shadow-lg">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className={`w-16 h-16 mx-auto ${feature.bgColor} rounded-2xl flex items-center justify-center`}>
                      <feature.icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <Card className="shadow-xl border-0 overflow-hidden">
              <CardContent className="p-8 lg:p-12">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  {stats.map((stat, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="text-center space-y-3"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        <div className="text-3xl lg:text-4xl font-bold text-foreground">
                          {stat.number}
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{stat.label}</div>
                        <div className="text-sm text-muted-foreground">{stat.description}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Testimonials */}
          <div className="space-y-8">
            <div className="text-center">
              <h3 className="text-2xl lg:text-3xl font-bold text-foreground mb-4">
                What Our Customers Say
              </h3>
              <p className="text-muted-foreground">
                Real experiences from real customers
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="h-full card-hover border-0 shadow-lg">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex space-x-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                        ))}
                      </div>
                      <p className="text-muted-foreground italic">
                        "{testimonial.content}"
                      </p>
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-center space-y-6"
          >
            <h3 className="text-xl font-semibold text-foreground">
              Recognized & Certified
            </h3>
            <div className="flex flex-wrap justify-center items-center gap-8">
              {certifications.map((cert, index) => (
                <div key={index} className="flex items-center space-x-2 text-muted-foreground">
                  <Badge variant="outline" className="px-3 py-1">
                    {cert.badge}
                  </Badge>
                  <span className="text-sm font-medium">{cert.name}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default TrustSection;