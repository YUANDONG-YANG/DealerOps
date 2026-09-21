import React, { useEffect, useState } from 'react';
import { Typography, Space, message, Spin, Empty, ConfigProvider, Row, Col, Tag, Divider } from 'antd';
import Card from 'antd/es/card/Card';
import { PhoneOutlined, EnvironmentOutlined, GlobalOutlined, InfoCircleOutlined, StarOutlined, CalendarOutlined, LinkOutlined, MailOutlined, MobileOutlined } from '@ant-design/icons';
import { dealershipService } from '../services/api';
import { useTheme } from '../../src/components/layout/ThemeContext';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

interface Dealership {
  id: number;
  companyName: string;
  yearEstablished: number;
  companyPhone: string;
  companyMobile: string;
  companyAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  email: string;
  deleteFlag: boolean;
  companyLogoUrl: string;
  companyImageUrl: string;
  createdAt: string;
  description: string;
  specialties: string[];
  hours: string;
  website: string;
}

const DealershipDetails: React.FC = () => {
  const [dealership, setDealership] = useState<Dealership | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  useEffect(() => {
    fetchDealershipDetails();
  }, []);

  const fetchDealershipDetails = async () => {
    try {
      setLoading(true);
      const response = await dealershipService.getCompanyDetails();
      setDealership(response.data || null);
    } catch (error) {
      message.error('Failed to fetch dealership details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

const tableTheme = {
  token: {
    colorBgContainer: theme === 'dark' ? '#1f2937' : '#ffffff', // darker dark background
    colorText: theme === 'dark' ? '#f1f5f9' : '#1f2937', // lighter text on dark, stronger text on light
    colorTextHeading: theme === 'dark' ? '#f9fafb' : '#111827', // extra contrast for headings
    colorBorderSecondary: theme === 'dark' ? '#6b7280' : '#cbd5e1', // brighter borders in both themes
    fontSize: 14,
    borderRadius: 10,
    colorPrimary: theme === 'dark' ? '#3b82f6' : '#0A66C2', // vivid primary color
  },
  components: {
Card: {
  colorBgContainer: theme === 'dark' ? '#1f2937' : '#ffffff',
  colorBorderSecondary: theme === 'dark' ? '#4b5563' : '#d1d5db',
  boxShadow: theme === 'dark'
    ? '0 8px 20px rgba(0, 0, 0, 0.6)' // Much stronger
    : '0 8px 20px rgba(0, 0, 0, 0.1)', // More visible
  borderRadius: 12,
},

    Tag: {
      colorBgContainer: theme === 'dark' ? '#374151' : '#f9fafb', // brighter light background
      colorText: theme === 'dark' ? '#e5e7eb' : '#1f2937',
      borderRadius: 16,
    },
  },
};


  const fullAddress = dealership
    ? `${dealership.companyAddress}, ${dealership.city}, ${dealership.state} ${dealership.postalCode}, ${dealership.country}`
    : '';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <ConfigProvider theme={tableTheme}>
      <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Spin size="large" />
            </motion.div>
          </div>
        ) : !dealership ? (
          <div className="min-h-screen flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Empty description="Dealership not found" />
            </motion.div>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="max-w-6xl mx-auto"
          >
            {/* Header Banner */}
            <motion.div variants={cardVariants} className="relative">
              <div
                className="h-48 w-full relative overflow-hidden"
                style={{
                  background: theme === 'dark'
                    ? 'linear-gradient(135deg, #1e3a8a 0%, #3730a3 50%, #581c87 100%)'
                    : 'linear-gradient(135deg, #0A66C2 0%, #004182 50%, #002855 100%)'
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60"></div>
                </div>

              {/* Company Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-end space-x-6">
                  {/* Company Logo */}
                  <div className="flex-shrink-0">
                    {dealership.companyLogoUrl ? (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className={`w-32 h-32 rounded-lg overflow-hidden border-4 ${theme === 'dark' ? 'border-gray-800' : 'border-white'} shadow-xl`}
                        style={{ backgroundColor: theme === 'dark' ? '#1a202c' : '#ffffff' }}
                      >
                        <img
                          src={dealership.companyLogoUrl}
                          alt="Company Logo"
                          className="w-full h-full object-cover"
                          onError={() => message.error('Failed to load company logo')}
                        />
                      </motion.div>
                    ) : (
                      <div
                        className={`w-20 sm:w-24 md:w-28 lg:w-32 
                          aspect-square rounded-lg border-4 
                          ${theme === 'dark' ? 'border-gray-800 bg-gray-800' : 'border-white bg-white'} 
                          shadow-xl max-w-full mx-auto grid place-items-center`}
                      >
                        <Text
                          className="font-bold text-gray-400 leading-none"
                          style={{
                            fontSize: 'clamp(1rem, 4vw, 2.5rem)',
                          }}
                        >
                          {dealership.companyName.charAt(0)}
                        </Text>
                      </div>

                    )}
                  </div>

                  {/* Company Name and Basic Info */}
                  <div className="flex-1 pb-4">
                    <Title
                      level={1}
                      className="text-white m-0 font-semibold break-words leading-tight"
                      style={{
                        fontSize: 'clamp(1.5rem, 5vw, 3rem)', // Scales between 24px and 48px
                      }}
                    >
                      {dealership.companyName}
                    </Title>


                    <Text
                      className="text-blue-100 block mt-2 text-sm sm:text-base md:text-lg"
                    >
                      Established {dealership.yearEstablished} • {dealership.city}, {dealership.state}
                    </Text>
                  </div>

                </div>
              </div>
            </motion.div>

            {/* Main Content */}
            <div className="px-6 py-6">
              <Row gutter={[24, 24]}>
                {/* Left Column */}
                <Col xs={24} lg={16}>
                  {/* About Section */}
                  <motion.div variants={cardVariants} className="mb-6">
                    <Card
                        className="shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] rounded-2xl transition-shadow duration-300"
                      style={{ borderRadius: 10 }}
                    >
                      <div className="flex items-center mb-4">
                        <InfoCircleOutlined className="text-xl text-blue-600 mr-3" />
                        <Title level={4} className="m-0">About</Title>
                      </div>
                      <Paragraph className="text-base leading-relaxed">
                        {dealership.description || 'No description available'}
                      </Paragraph>
                    </Card>
                  </motion.div>

                  {/* Specialties Section */}
                  <motion.div variants={cardVariants} className="mb-6">
                    <Card
                      className="shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] rounded-2xl transition-shadow duration-300"
                      style={{ borderRadius: 10 }}
                    >
                      <div className="flex items-center mb-4">
                        <StarOutlined className="text-xl text-blue-600 mr-3" />
                        <Title level={4} className="m-0">Specialties</Title>
                      </div>
                      {dealership.specialties?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {dealership.specialties.map((specialty, index) => (
                            <Tag key={index} className="px-3 py-1 text-sm font-medium">
                              {specialty}
                            </Tag>
                          ))}
                        </div>
                      ) : (
                        <Text className="text-gray-500">No specialties listed</Text>
                      )}
                    </Card>
                  </motion.div>

                  {/* Company Image */}
                  {dealership.companyImageUrl && (
                    <motion.div variants={cardVariants} className="mb-6">
                      <Card
                        className="shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] rounded-2xl transition-shadow duration-300"
                        style={{ borderRadius: 10 }}
                      >
                        <Title level={4} className="mb-4">Company Gallery</Title>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden rounded-lg"
                        >
                          <img
                            src={dealership.companyImageUrl}
                            alt="Company Image"
                            className="w-full h-auto object-cover"
                            onError={() => message.error('Failed to load company image')}
                          />
                        </motion.div>
                      </Card>
                    </motion.div>
                  )}
                </Col>

                {/* Right Column */}
                <Col xs={24} lg={8}>
                  {/* Contact Information */}
                  <motion.div variants={cardVariants} className="mb-6">
                    <Card
                      className="shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] rounded-2xl transition-shadow duration-300"
                      style={{ borderRadius: 10 }}
                    >
                      <Title level={4} className="mb-4">Contact Information</Title>

                      <Space direction="vertical" size="middle" className="w-full">
                        <motion.div
                          className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          whileHover={{ x: 4 }}
                        >
                          <PhoneOutlined className="text-blue-600 text-lg mr-3 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Text className="text-sm text-gray-500 block">Phone</Text>
                            <a
                              href={`tel:${dealership.companyPhone}`}
                              className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {dealership.companyPhone}
                            </a>
                          </div>
                        </motion.div>

                        <Divider className="my-2" />

                        <motion.div
                          className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          whileHover={{ x: 4 }}
                        >
                          <MobileOutlined className="text-blue-600 text-lg mr-3 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Text className="text-sm text-gray-500 block">Mobile</Text>
                            <a
                              href={`tel:${dealership.companyMobile}`}
                              className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {dealership.companyMobile}
                            </a>
                          </div>
                        </motion.div>

                        <Divider className="my-2" />

                        <motion.div
                          className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          whileHover={{ x: 4 }}
                        >
                          <MailOutlined className="text-blue-600 text-lg mr-3 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <Text className="text-sm text-gray-500 block">Email</Text>
                            <a
                              href={`mailto:${dealership.email}`}
                              className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline break-all"
                            >
                              {dealership.email || 'No email available'}
                            </a>
                          </div>
                        </motion.div>

                        <Divider className="my-2" />

                        <motion.div
                          className="flex items-start p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                          whileHover={{ x: 4 }}
                        >
                          <EnvironmentOutlined className="text-blue-600 text-lg mr-3 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <Text className="text-sm text-gray-500 block">Address</Text>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                              {fullAddress}
                            </a>
                          </div>
                        </motion.div>

                        {dealership.website && (
                          <>
                            <Divider className="my-2" />
                            <motion.div
                              className="flex items-center p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                              whileHover={{ x: 4 }}
                            >
                              <LinkOutlined className="text-blue-600 text-lg mr-3 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <Text className="text-sm text-gray-500 block">Website</Text>
                                <a
                                  href={dealership.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-base font-medium text-blue-600 hover:text-blue-700 hover:underline break-all"
                                >
                                  {dealership.website}
                                </a>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </Space>
                    </Card>
                  </motion.div>

                  {/* Business Hours */}
                  <motion.div variants={cardVariants} className="mb-6">
                    <Card
                      className="shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] rounded-2xl transition-shadow duration-300"
                      style={{ borderRadius: 10 }}
                    >
                      <div className="flex items-center mb-4">
                        <CalendarOutlined className="text-xl text-blue-600 mr-3" />
                        <Title level={4} className="m-0">Business Hours</Title>
                      </div>
                      <Text className="text-base">
                        {dealership.hours || 'No hours specified'}
                      </Text>
                    </Card>
                  </motion.div>

                  {/* Additional Info */}
                  <motion.div variants={cardVariants}>
                    <Card
                      className="shadow-[0_4px_16px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.2)] rounded-2xl transition-shadow duration-300"
                      style={{ borderRadius: 10 }}
                    >
                      <div className="flex items-center mb-4">
                        <GlobalOutlined className="text-xl text-blue-600 mr-3" />
                        <Title level={4} className="m-0">Location</Title>
                      </div>
                      <Text className="text-base font-medium">{dealership.country}</Text>
                      <br />
                      <Text className="text-sm text-gray-500">
                        {dealership.city}, {dealership.state} {dealership.postalCode}
                      </Text>
                    </Card>
                  </motion.div>
                </Col>
              </Row>
            </div>
          </motion.div>
        )}
      </div>
    </ConfigProvider>
  );
};

export default DealershipDetails;