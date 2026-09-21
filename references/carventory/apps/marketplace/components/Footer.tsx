import Link from 'next/link';
import { Car, Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Browse',
      links: [
        { name: 'All Cars', href: '/cars' },
        { name: 'Sedans', href: '/cars?type=sedan' },
        { name: 'SUVs', href: '/cars?type=suv' },
        { name: 'Hatchbacks', href: '/cars?type=hatchback' },
        { name: 'Luxury Cars', href: '/cars?category=luxury' },
        { name: 'Electric Cars', href: '/cars?fuel=electric' },
      ],
    },
    {
      title: 'Services',
      links: [
        { name: 'Car Financing', href: '/services/financing' },
        { name: 'Trade-In Value', href: '/services/trade-in' },
        { name: 'Extended Warranty', href: '/services/warranty' },
        { name: 'Vehicle History', href: '/services/history' },
        { name: 'Insurance', href: '/services/insurance' },
        { name: 'Maintenance', href: '/services/maintenance' },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', href: '/about' },
        { name: 'Our Dealers', href: '/dealers' },
        { name: 'Careers', href: '/careers' },
        { name: 'Press', href: '/press' },
        { name: 'Blog', href: '/blog' },
        { name: 'Investor Relations', href: '/investors' },
      ],
    },
    {
      title: 'Support',
      links: [
        { name: 'Help Center', href: '/help' },
        { name: 'Contact Us', href: '/contact' },
        { name: 'FAQ', href: '/faq' },
        { name: 'Live Chat', href: '/chat' },
        { name: 'Report Issue', href: '/report' },
        { name: 'Feedback', href: '/feedback' },
      ],
    },
  ];

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: 'https://facebook.com/carventory' },
    { name: 'Twitter', icon: Twitter, href: 'https://twitter.com/carventory' },
    { name: 'Instagram', icon: Instagram, href: 'https://instagram.com/carventory' },
    { name: 'LinkedIn', icon: Linkedin, href: 'https://linkedin.com/company/carventory' },
  ];

  const contactInfo = [
    { icon: Phone, text: '+1 (555) 123-4567', href: 'tel:+15551234567' },
    { icon: Mail, text: 'support@carventory.com', href: 'mailto:support@carventory.com' },
    { icon: MapPin, text: '123 Auto Plaza, New York, NY 10001' },
    { icon: Clock, text: 'Mon-Fri: 9AM-7PM, Sat-Sun: 10AM-6PM' },
  ];

  return (
    <footer className="bg-slate-900 text-white">
      {/* Newsletter Section */}
      <div className="border-b border-slate-800">
        <div className="container mx-auto container-padding section-padding">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4">
              Stay Updated with the Latest Cars
            </h3>
            <p className="text-slate-300 mb-8 text-lg">
              Get notified about new arrivals, exclusive deals, and market insights.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email address"
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 focus:border-primary"
              />
              <Button className="gradient-primary px-8">
                Subscribe
              </Button>
            </div>
            <p className="text-sm text-slate-400 mt-4">
              No spam, unsubscribe at any time. Privacy policy applies.
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto container-padding py-16">
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-12">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Car className="h-10 w-10 text-primary" />
                <div className="absolute -inset-1 bg-primary/20 rounded-full blur" />
              </div>
              <div>
                <span className="text-2xl font-bold">Carventory</span>
                <p className="text-slate-300 text-sm">Premium Marketplace</p>
              </div>
            </div>
            <p className="text-slate-300 leading-relaxed max-w-md">
              Your trusted partner in finding the perfect used car. We connect buyers 
              with verified dealers, ensuring quality, transparency, and exceptional service 
              in every transaction.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3">
              {contactInfo.map((item, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm">
                  <item.icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  {item.href ? (
                    <a 
                      href={item.href} 
                      className="text-slate-300 hover:text-white transition-colors"
                    >
                      {item.text}
                    </a>
                  ) : (
                    <span className="text-slate-300">{item.text}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-primary transition-colors duration-200 group"
                >
                  <social.icon className="h-5 w-5 text-slate-400 group-hover:text-white" />
                  <span className="sr-only">{social.name}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <h4 className="font-semibold text-lg">{section.title}</h4>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-slate-300 hover:text-white transition-colors duration-200 text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="container mx-auto container-padding py-6">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6 text-sm text-slate-400">
              <p>&copy; {currentYear} Carventory. All rights reserved.</p>
              <div className="flex items-center space-x-4">
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
                <Link href="/cookies" className="hover:text-white transition-colors">
                  Cookie Policy
                </Link>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-slate-400">
              <span>Made with ❤️ for car enthusiasts</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;