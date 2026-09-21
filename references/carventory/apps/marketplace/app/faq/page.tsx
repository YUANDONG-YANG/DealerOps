'use client';

import { motion } from 'framer-motion';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  Car, 
  CreditCard, 
  Shield, 
  Users, 
  Phone,
  Mail,
  MessageCircle
} from 'lucide-react';

const FAQPage = () => {
  const faqCategories = [
    {
      icon: Car,
      title: 'Buying Process',
      faqs: [
        {
          question: 'How do I search for cars on CarMarket?',
          answer: 'You can search for cars using our advanced search filters on the homepage or cars page. Filter by make, model, price range, year, mileage, fuel type, and location to find cars that match your preferences.'
        },
        {
          question: 'Can I schedule a test drive?',
          answer: 'Yes! You can contact the dealer directly through our platform to schedule a test drive. Each car listing includes the dealer\'s contact information and a "Contact Dealer" button for easy communication.'
        },
        {
          question: 'Are the car prices negotiable?',
          answer: 'Pricing policies vary by dealer. Many dealers are open to negotiation, especially for cash buyers or those with pre-approved financing. Contact the dealer directly to discuss pricing options.'
        },
        {
          question: 'What information is included in the car listings?',
          answer: 'Each listing includes detailed specifications, multiple photos, vehicle history, mileage, price, dealer information, and key features. We also provide VIN numbers for transparency.'
        }
      ]
    },
    {
      icon: CreditCard,
      title: 'Financing & Payment',
      faqs: [
        {
          question: 'Do you offer financing options?',
          answer: 'While CarMarket doesn\'t directly provide financing, many of our dealers offer competitive financing options. You can also get pre-approved through your bank or credit union before shopping.'
        },
        {
          question: 'What payment methods are accepted?',
          answer: 'Payment methods vary by dealer but typically include cash, certified checks, bank transfers, and financing through approved lenders. Contact the specific dealer for their accepted payment methods.'
        },
        {
          question: 'Can I trade in my current vehicle?',
          answer: 'Many dealers accept trade-ins. Contact the dealer directly to discuss your trade-in vehicle and get an estimated value. This can often be applied toward your purchase.'
        },
        {
          question: 'Are there any hidden fees?',
          answer: 'CarMarket promotes transparent pricing. However, additional fees like documentation, registration, or dealer fees may apply. All fees should be clearly disclosed by the dealer before purchase.'
        }
      ]
    },
    {
      icon: Shield,
      title: 'Vehicle Quality & Warranty',
      faqs: [
        {
          question: 'Are all vehicles inspected?',
          answer: 'Our verified dealers follow strict quality standards. Many vehicles undergo multi-point inspections, but inspection levels may vary. Check the individual listing for specific inspection details.'
        },
        {
          question: 'Do cars come with warranties?',
          answer: 'Warranty coverage varies by vehicle age, mileage, and dealer. Some cars may still have manufacturer warranty remaining, while others may offer dealer warranties or extended warranty options.'
        },
        {
          question: 'What if I find issues after purchase?',
          answer: 'Contact the dealer immediately if you discover any issues. Many dealers offer return policies or will work to resolve problems. Review the dealer\'s specific policies before purchasing.'
        },
        {
          question: 'Can I get a vehicle history report?',
          answer: 'Yes! Most listings include vehicle history information. You can also request a detailed history report from the dealer or obtain one independently using the VIN number.'
        }
      ]
    },
    {
      icon: Users,
      title: 'Dealer Information',
      faqs: [
        {
          question: 'How are dealers verified?',
          answer: 'All dealers undergo a thorough verification process including business license verification, customer review analysis, and quality standards assessment before joining our platform.'
        },
        {
          question: 'Can I visit the dealer in person?',
          answer: 'Absolutely! Each dealer listing includes their physical address, hours of operation, and contact information. We encourage visiting dealers to see vehicles in person.'
        },
        {
          question: 'How do I contact a dealer?',
          answer: 'You can contact dealers through phone, email, or our platform\'s messaging system. Contact information is provided on each dealer\'s profile and car listings.'
        },
        {
          question: 'What if I have issues with a dealer?',
          answer: 'If you experience any issues with a dealer, please contact our customer support team immediately. We take dealer conduct seriously and will investigate any concerns.'
        }
      ]
    }
  ];

  const quickHelp = [
    {
      icon: Phone,
      title: 'Call Us',
      description: 'Speak with our customer service team',
      action: '+1 (555) 123-4567',
      buttonText: 'Call Now'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us your questions via email',
      action: 'support@carmarket.com',
      buttonText: 'Send Email'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with us in real-time',
      action: 'Available 9AM-6PM EST',
      buttonText: 'Start Chat'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 rounded-full flex items-center justify-center">
              <HelpCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Find answers to common questions about buying cars, our dealers, 
              and using the CarMarket platform.
            </p>
          </div>

          {/* Quick Help Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Need Immediate Help?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {quickHelp.map((help, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
                    <CardContent className="p-6">
                      <div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                        <help.icon className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {help.title}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {help.description}
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        {help.action}
                      </p>
                      <Button className="w-full">
                        {help.buttonText}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>

          {/* FAQ Categories */}
          <div className="space-y-8">
            {faqCategories.map((category, categoryIndex) => (
              <motion.div
                key={categoryIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              >
                <Card className="shadow-lg border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center text-xl">
                      <div className="w-8 h-8 mr-3 bg-blue-100 rounded-full flex items-center justify-center">
                        <category.icon className="h-5 w-5 text-blue-600" />
                      </div>
                      {category.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {category.faqs.map((faq, faqIndex) => (
                        <AccordionItem 
                          key={faqIndex} 
                          value={`${categoryIndex}-${faqIndex}`}
                          className="border-gray-200"
                        >
                          <AccordionTrigger className="text-left hover:no-underline hover:text-blue-600 transition-colors">
                            {faq.question}
                          </AccordionTrigger>
                          <AccordionContent className="text-gray-600 leading-relaxed">
                            {faq.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-16"
          >
            <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-gray-50">
              <CardContent className="p-8 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Still Have Questions?
                </h2>
                <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Can't find the answer you're looking for? Our customer support team 
                  is here to help you with any questions about our platform, dealers, or the car buying process.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" className="px-8">
                    <Phone className="h-5 w-5 mr-2" />
                    Contact Support
                  </Button>
                  <Button variant="outline" size="lg" className="px-8">
                    <Mail className="h-5 w-5 mr-2" />
                    Send Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default FAQPage;