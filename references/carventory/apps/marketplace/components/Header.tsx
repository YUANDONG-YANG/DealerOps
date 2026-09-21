'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Menu, X, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: 'Browse Cars', href: '/cars', description: 'Explore our inventory' },
    { name: 'Dealers', href: '/dealers', description: 'Find trusted dealers' },
    { name: 'About', href: '/about', description: 'Learn about us' },
    { name: 'Contact', href: '/contact', description: 'Get in touch' },
    { name: 'FAQ', href: '/faq', description: 'Common questions' },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        isScrolled
          ? 'glass-effect shadow-lg'
          : 'bg-white/95 backdrop-blur-sm'
      )}
    >
      <div className="container mx-auto container-padding">
        <div className="flex h-16 lg:h-20 items-center justify-between">
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center space-x-3 group"
          >
            <div className="relative">
              <Car className="h-8 w-8 lg:h-10 lg:w-10 text-primary transition-transform duration-300 group-hover:scale-110" />
              <div className="absolute -inset-1 bg-primary/20 rounded-full blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl lg:text-2xl font-bold text-foreground">
                Carventory
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                Premium Marketplace
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  'hover:bg-primary/10 hover:text-primary',
                  isActive(item.href)
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground'
                )}
              >
                {item.name}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-lg"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center space-x-3">
            <Button variant="outline" size="sm" className="hidden xl:flex">
              <Phone className="h-4 w-4 mr-2" />
              Call Us
            </Button>
            <Button size="sm" className="gradient-primary">
              List Your Car
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-10 w-10 p-0"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96">
                <div className="flex flex-col h-full">
                  {/* Mobile Logo */}
                  <div className="flex items-center space-x-3 pb-6 border-b">
                    <Car className="h-8 w-8 text-primary" />
                    <div>
                      <span className="text-xl font-bold">Carventory</span>
                      <p className="text-sm text-muted-foreground">Premium Marketplace</p>
                    </div>
                  </div>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 py-6">
                    <div className="space-y-2">
                      {navigation.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            'flex flex-col p-4 rounded-lg transition-colors duration-200',
                            'hover:bg-primary/10',
                            isActive(item.href)
                              ? 'bg-primary/10 text-primary'
                              : 'text-foreground'
                          )}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {item.description}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </nav>

                  {/* Mobile CTA */}
                  <div className="space-y-3 pt-6 border-t">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      Call Us
                    </Button>
                    <Button 
                      className="w-full gradient-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      List Your Car
                    </Button>
                    <div className="flex items-center justify-center space-x-4 pt-4 text-sm text-muted-foreground">
                      <a href="tel:+1234567890" className="flex items-center hover:text-primary transition-colors">
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </a>
                      <a href="mailto:info@carventory.com" className="flex items-center hover:text-primary transition-colors">
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </a>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;