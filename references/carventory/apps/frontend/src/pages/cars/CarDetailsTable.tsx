import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Card,
  Table,
  Typography,
  Space,
  message,
  Tag,
  Descriptions,
  Spin,
  Tabs,
  Empty,
  Divider,
  ConfigProvider,
  Carousel,
  Image,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Locate, Mail, MapPinIcon, Phone, PinIcon, User2Icon } from 'lucide-react';
import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { carsService, inquiriesService } from '../../services/api';
import { useTheme } from '../../components/layout/ThemeContext';
import CarEditForm from './CarEditForm'; // Update path as needed

// Inline CSS for responsive design
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: (theme: string) => (theme === 'dark' ? '#0B1118' : '#F8FAFC'),
    padding: '16px',
    margin: '0 auto',
  },
  contentWrapper: {
    display: 'flex',
    flexWrap: 'wrap' as 'wrap',
    gap: '16px',
    // Responsive styles should be handled via CSS or styled-components, not inline JS objects
  },
  imageCard: {
    borderRadius: '8px',
    overflow: 'hidden',
    border: 'none',
    flex: '1 1 60%',
    minWidth: '200px',
    '@media (max-width: 576px)': {
      flex: '1 1 100%',
      order: 1,
    },
  },
  sidebar: {
    flex: '1 1 35%',
    minWidth: '160px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    gap: '12px',
    // Responsive styles should be handled via CSS or styled-components, not inline JS objects
  },
  carouselImage: {
    width: '100%',
    maxWidth: '600px',
    height: 'auto',
    maxHeight: '350px',
    objectFit: 'cover' as const,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    '@media (max-width: 576px)': {
      maxHeight: '200px',
    },
  },
  thumbnailGrid: {
    padding: '12px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
    gap: '6px',
    '@media (max-width: 576px)': {
      gridTemplateColumns: 'repeat(auto-fill, minmax(40px, 1fr))',
    },
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap' as 'wrap',
    rowGap: '8px',
    columnGap: '16px',
    marginBottom: '16px',
    // Responsive styles should be handled via CSS or styled-components, not inline JS objects
  },
  leftBlock: {
    flex: '1 1 auto',
    minWidth: 0,
  },
  backRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  rightBlock: {
    display: 'flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    color: (theme: string) => (theme === 'dark' ? '#C9D6E3' : '#1C2731'),
    fontSize: 'clamp(1.4rem, 4.5vw, 1.7rem)',
  },
  priceText: {
    fontSize: 'clamp(1.1rem, 3.5vw, 1.4rem)',
    fontWeight: 'bold',
    color: (theme: string) => (theme === 'dark' ? '#66B2FF' : '#1890ff'),
  },
  button: {},
  navButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '500px',
    marginTop: '12px',
  },
  navButton: {
    backgroundColor: (theme: string) => (theme === 'dark' ? '#2F3B4A' : '#D9EAFD'),
    color: (theme: string) => (theme === 'dark' ? '#C9D6E3' : '#1C2731'),
    border: (theme: string) => `1px solid ${theme === 'dark' ? '#66B2FF' : '#1890ff'}`,
    borderRadius: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    transition: 'background-color 0.3s, color 0.3s',
  },
  navButtonHover: {
    backgroundColor: (theme: string) => (theme === 'dark' ? '#5D9CEC' : '#40a9ff'),
    color: '#ffffff',
  },
};

const { Title, Text } = Typography;
const { TabPane } = Tabs;
interface Car {
  carMake: string;
  carModel: string;
  carYear: number;
  carVin: string;
  carEngineNumber: string;
  carChassisNumber: string;
  carPrice: number;
  carMileage: number;
  carPurchasePrice: number;
  carPurchaseDate: string;
  carMaintainAmount: number;
  carMaintainDetails: string | null;
  carFuelType: string;
  carTransmission: string;
  carCondition: string;
  carColor: string;
  carStatus: string;
  carOdometerReading: number;
  carNumberOfOwners: number;
  carSellerId: number;
  carImageUrl: string;
  carImage1Url: string;
  carImage2Url: string;
  carImage3Url: string;
  carImage4Url: string;
  carImage5Url: string;
  carImage6Url: string;
  carImage7Url: string;
  carImage8Url: string;
  carImage9Url: string;
  carImage10Url: string;
  carImage11Url: string;
  carImage12Url: string;
  carImage13Url: string;
  carImage14Url: string;
  carImage15Url: string;
  carRcDocumentUrl: string;
  carInsuranceDocumentUrl: string;
  carPucDocumentUrl: string;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  sellerAddress: string;
  sellerPhotoUrl: string;
  sellerAadharCardUrl: string;
  sellerPanCardUrl: string;
  sellerAddressProofUrl: string;
  engineCapacity: number | null;
  drivetrain: string | null;
  suspensionType: string | null;
  fuelTankCapacity: number | null;
  cityMileage: number | null;
  highwayMileage: number | null;
  length: number | null;
  width: number | null;
  height: number | null;
  groundClearance: number | null;
  wheelbase: number | null;
  bootSpace: number | null;
  frontBrakeType: string | null;
  rearBrakeType: string | null;
  tireType: string | null;
  wheelSize: string | null;
  airConditioning: boolean | null;
  airConditioningType: string | null;
  powerSteering: boolean | null;
  powerWindowsType: string | null;
  cruiseControl: boolean | null;
  centralLocking: boolean | null;
  infotainmentSystem: boolean | null;
  navigationSystem: boolean | null;
  sunroof: boolean | null;
  airbags: number | null;
  abs: boolean | null;
  ebd: boolean | null;
  tractionControl: boolean | null;
  rearCamera: boolean | null;
  parkingSensors: boolean | null;
  amFmRadio: boolean | null;
  auxCompatibility: boolean | null;
  usbCompatibility: boolean | null;
  bluetooth: boolean | null;
  antiTheftDevice: boolean | null;
  adjustableExternalMirror: string | null;
  adjustableSteering: boolean | null;
  batteryCondition: string | null;
  insuranceType: string | null;
  lockSystem: string | null;
  makeYear: string | null;
  registrationPlace: string | null;
  exchangeAvailable: boolean | null;
  financeAvailable: boolean | null;
  serviceHistoryAvailable: boolean | null;
  tyreCondition: string | null;
}


interface Inquiry {
  id: string;
  name: string;
  message: string;
  inquiryDate: string;
  inquiryStatus: string;
}

interface CarForInquiry {
  id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  engineNumber: string;
  chassisNumber: string;
  price: number;
  mileage: number;
  purchasePrice: number;
  purchaseDate: string;
  carMaintainAmount: number;
  carMaintainDetails: string | null;
  fuelType: string;
  transmission: string;
  condition: string;
  color: string;
  status: string;
  odometerReading: number;
  numberOfOwners: number;
  image: string | null;
  rcDocument: string | null;
  insuranceDocument: string | null;
  pucDocument: string | null;
  createdAt: string;
  deleteFlag: boolean;
}

interface CarInquiryProps {
  id: number;
  carInquiry: CarForInquiry;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerRequiredCar: string;
  fuelType: string;
  budget: number;
  inquiryDate: string;
  message: string | null;
  inquiryStatus: string;
  createdAt: string;
  deleteFlag: boolean;
}

const CarDetailsTable: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<Car | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inquiriesLoading, setInquiriesLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const carouselRef = useRef<any>(null);
  const [hoverPhone, setHoverPhone] = useState(false);
  const [hoverEmail, setHoverEmail] = useState(false);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);
  // Add a useRef to track if inquiries have been fetched
  const hasFetchedInquiries = useRef(false);

  const hoverStyle = {
    backgroundColor: '#1890ff',
    color: 'white',
    borderColor: '#1890ff',
  };

  const fetchCarDetails = async (carId: string, retryCount = 3, delay = 1000) => {
    try {
      setLoading(true);
      setError(null);
      const response = await carsService.getById(carId);
      setCar(response.data);
    } catch (error: any) {
      console.error('Failed to fetch car details:', error);
      if (retryCount > 0) {
        setTimeout(() => fetchCarDetails(carId, retryCount - 1, delay * 2), delay);
      } else {
        setError(error.message === 'Car not found' ? 'Car not found.' : 'Failed to load car details. Please try again later.');
        message.error('Failed to fetch car details');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCarInquiries = async (carVin: string, retryCount = 3, delay = 1000) => {
    try {
      setInquiriesLoading(true);
      const response = await inquiriesService.getInquiriesByCarVin(carVin);
      setInquiries(response.data.map((inquiry: CarInquiryProps) => ({
        id: inquiry.id,
        name: inquiry.name,
        message: inquiry.message || 'No message',
        inquiryDate: inquiry.inquiryDate,
        status: inquiry.inquiryStatus,
      })));
    } catch (error: any) {
      console.error('Failed to fetch inquiries:', error);
      if (retryCount > 0) {
        setTimeout(() => fetchCarInquiries(carVin, retryCount - 1, delay * 2), delay);
      } else {
        message.error('Failed to fetch inquiries');
      }
    } finally {
      setInquiriesLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchCarDetails(id);
      // Reset the flag on page load or refresh to allow fetching inquiries
      hasFetchedInquiries.current = false;
    }
  }, [id]);

  useEffect(() => {
    if (car?.carVin && !hasFetchedInquiries.current) {
      fetchCarInquiries(car.carVin.toString());
      // Set the flag to true to prevent further fetches
      hasFetchedInquiries.current = true;
    }
  }, [car?.carVin]);

  const images = [
    car?.carImageUrl,
    car?.carImage1Url,
    car?.carImage2Url,
    car?.carImage3Url,
    car?.carImage4Url,
    car?.carImage5Url,
    car?.carImage6Url,
    car?.carImage7Url,
    car?.carImage8Url,
    car?.carImage9Url,
    car?.carImage10Url,
    car?.carImage11Url,
    car?.carImage12Url,
    car?.carImage13Url,
    car?.carImage14Url,
    car?.carImage15Url,
  ].filter((img): img is string => img !== null && img !== undefined);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
    if (carouselRef.current) {
      carouselRef.current.goTo(index);
    }
  };

  const handlePrev = () => {
    if (carouselRef.current) {
      carouselRef.current.prev();
    }
  };

  const handleNext = () => {
    if (carouselRef.current) {
      carouselRef.current.next();
    }
  };

  const inquiryColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => text || 'N/A',
      responsive: ['xs', 'sm', 'md'] as ('xxl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs')[],
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      render: (text: string) => text || 'No message',
      responsive: ['sm', 'md'] as ('xxl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs')[],
    },
    {
      title: 'Date',
      dataIndex: 'inquiryDate',
      key: 'inquiryDate',
      render: (date: string) => (date ? new Date(date).toLocaleDateString() : 'N/A'),
      responsive: ['sm', 'md'] as ('xxl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs')[],
    },
    {
      title: 'inquiryStatus',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <Tag
          color={
            text === 'Pending'
              ? 'orange'
              : text === 'Available'
                ? 'green'
                : text === 'Sold'
                  ? 'blue'
                  : 'default'
          }
        >
          {text}
        </Tag>
      ),
      responsive: ['xs', 'sm', 'md'] as ('xxl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs')[],
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Inquiry) => (
        <Button
          type="primary"
          ghost
          size="small"
          onClick={() => navigate(`/inquiries/${record.id}`)}
          disabled={!record.id}
          aria-label={`View inquiry ${record.id}`}
        >
          View
        </Button>
      ),
      responsive: ['xs', 'sm', 'md'] as ('xxl' | 'xl' | 'lg' | 'md' | 'sm' | 'xs')[],
    },
  ];

  const tableTheme = {
    token: {
      colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
      colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
      colorTextHeading: theme === 'dark' ? '#C9D6E3' : '#1C2731',
      colorBorderSecondary: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
      colorBgContainerHover: theme === 'dark' ? '#1A2734' : '#EEE0C9',
      colorBgContainerSelected: theme === 'dark' ? '#1A2734' : '#ADC4CE',
      fontSize: 14,
      borderRadius: 8,
    },
    components: {
      Table: {
        headerBg: theme === 'dark' ? '#14212E' : '#2A4759',
        headerColor: theme === 'dark' ? '#C9D6E3' : '#eeeeee',
        rowHoverBg: theme === 'dark' ? '#2F3B4A' : '#D9EAFD',
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
      },
      Button: {
        colorPrimary: theme === 'dark' ? '#66B2FF' : '#1890ff',
        colorPrimaryHover: theme === 'dark' ? '#5D9CEC' : '#40a9ff',
      },
      Card: {
        colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
        colorBorderSecondary: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
      },
      Descriptions: {
        labelBg: theme === 'dark' ? '#14212E' : '#E1F2FB',
        colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
      },
      Divider: {
        colorSplit: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
      },
      Tabs: {
        colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
        inkBarColor: theme === 'dark' ? '#66B2FF' : '#1890ff',
      },
    },
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: theme === 'dark' ? '#0B1118' : '#F8FAFC',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !car) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme === 'dark' ? '#0B1118' : '#F8FAFC',
        }}
      >
        <Space direction="vertical" align="center">
          <Empty description={error || 'Car not found'} />
          <Button type="primary" onClick={() => id && fetchCarDetails(id)} style={styles.button} aria-label="Retry loading car details">
            Retry
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <ConfigProvider theme={tableTheme}>
      <div style={{ ...styles.container, backgroundColor: styles.container.backgroundColor(theme) }}>
        <div style={styles.header}>
          <div style={styles.leftBlock}>
            <div style={styles.backRow}>
              <Button
                type="text"
                icon={<ArrowLeft size={16} />}
                onClick={() => navigate('/cars')}
                style={{ color: theme === 'dark' ? '#66B2FF' : '#1890ff', ...styles.button }}
                aria-label="Back to cars list"
              >
                Back to Cars
              </Button>
            </div>
            <Title
              level={2}
              style={{
                ...styles.title,
                color: styles.title.color(theme),
                margin: 0,
              }}
            >
              {car.carYear} {car.carMake} {car.carModel}
            </Title>
          </div>
          <div style={styles.rightBlock}>
            <Text style={{ ...styles.priceText, color: styles.priceText.color(theme) }}>
              ₹ {car.carPrice.toLocaleString()}
            </Text>
          </div>
        </div>
        <div style={styles.contentWrapper}>
          <Card style={styles.imageCard}>
            {images.length > 0 ? (
              <>
                <Carousel
                  ref={carouselRef}
                  arrows={false}
                  beforeChange={(_, next) => setSelectedImageIndex(next)}
                >
                  {images.map((img, index) => (
                    <div key={`carousel-${index}`}>
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0' }}>
                        <Image
                          src={img}
                          alt={`${car.carMake} ${car.carModel} image ${index + 1}`}
                          style={styles.carouselImage}
                          placeholder={<Spin />}
                          preview={false}
                        />
                      </div>
                    </div>
                  ))}
                </Carousel>

                <div style={styles.navButtonContainer}>
                  <Button
                    type="primary"
                    ghost
                    onClick={handlePrev}
                    onMouseEnter={() => setHoverPrev(true)}
                    onMouseLeave={() => setHoverPrev(false)}
                    aria-label="Previous image"
                    icon={<ArrowLeft size={16} />}
                  >
                    Previous
                  </Button>
                  <Button
                    type="primary"
                    ghost
                    onClick={handleNext}
                    onMouseEnter={() => setHoverNext(true)}
                    onMouseLeave={() => setHoverNext(false)}
                    aria-label="Next image"
                    icon={<ArrowRight size={16} />}
                  >
                    Next
                  </Button>
                </div>

                <div style={styles.thumbnailGrid}>
                  {images.map((img, index) => (
                    <Button
                      key={`thumbnail-${index}`}
                      type={index === selectedImageIndex ? 'primary' : 'default'}
                      onClick={() => handleImageClick(index)}
                      style={{ padding: 0, height: 'auto', ...styles.button }}
                      aria-label={`Select image ${index + 1}`}
                    >
                      <Image
                        src={img}
                        alt={`${car.carMake} ${car.carModel} thumbnail ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '50px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                        }}
                        preview={false}
                        placeholder={<Spin />}
                      />
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <div
                style={{
                  height: '200px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme === 'dark' ? '#2F3B4A' : '#D9EAFD',
                  borderRadius: '8px',
                }}
              >
                <Text>No Image Available</Text>
              </div>
            )}
          </Card>

          <div style={styles.sidebar}>
            <Card style={{ borderRadius: 8, border: 'none' }}>
              <Title level={4} style={{ margin: 0, color: theme === 'dark' ? '#C9D6E3' : '#1C2731' }}>
                Key Specifications
              </Title>
              <Divider />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Year:</Text>
                  <Text>{car.carYear || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Mileage:</Text>
                  <Text>{car.carMileage ? `${car.carMileage.toLocaleString()} km` : 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Fuel Type:</Text>
                  <Text>{car.carFuelType || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Transmission:</Text>
                  <Text>{car.carTransmission || 'N/A'}</Text>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 8, border: 'none' }}>
              <Title level={4} style={{ margin: 0, color: theme === 'dark' ? '#C9D6E3' : '#1C2731' }}>
                Seller Information
              </Title>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0 }}>
                  {car.sellerPhotoUrl ? (
                    <Image
                      src={`${car.sellerPhotoUrl}`}
                      alt="Seller photo"
                      style={{
                        width: '100px',
                        height: '100px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                      placeholder={<Spin />}
                      preview={{
                        mask: 'View Larger',
                        src: `${car.sellerPhotoUrl}`,
                      }}
                    />
                  ) : (
                    <Text>No photo</Text>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User2Icon style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text strong>{car.sellerName || 'N/A'}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text>{car.sellerPhone || 'N/A'}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text>{car.sellerEmail || 'N/A'}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPinIcon style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text>{car.sellerAddress || 'N/A'}</Text>
                  </div>
                </div>
              </div>
              <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }} size="middle">
                <Button
                  block
                  icon={<PhoneOutlined />}
                  type='primary'
                  ghost
                  disabled={!car.sellerPhone}
                  style={hoverPhone ? { ...styles.button, ...hoverStyle } : styles.button}
                  onClick={() => car.sellerPhone && window.open(`tel:${car.sellerPhone}`)}
                  onMouseEnter={() => setHoverPhone(true)}
                  onMouseLeave={() => setHoverPhone(false)}
                  aria-label="Call seller"
                >
                  Call Seller
                </Button>
                <Button
                  block
                  icon={<MailOutlined />}
                  type='primary'
                  ghost
                  disabled={!car.sellerEmail}
                  style={hoverEmail ? { ...styles.button, ...hoverStyle } : styles.button}
                  onClick={() => car.sellerEmail && window.open(`mailto:${car.sellerEmail}`)}
                  onMouseEnter={() => setHoverEmail(true)}
                  onMouseLeave={() => setHoverEmail(false)}
                  aria-label="Email seller"
                >
                  Email Seller
                </Button>
              </Space>
            </Card>
          </div>
        </div>
        <Card style={{ marginTop: '16px', borderRadius: 8, border: 'none' }}>
          <Tabs defaultActiveKey="overview">
            <TabPane tab="Overview" key="overview">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={4} style={{ color: theme === 'dark' ? '#C9D6E3' : '#1C2731' }}>
                    Car Information
                  </Title>
                  <Descriptions
                    bordered
                    column={{ xs: 1, sm: 2, md: 3, lg: 3 }}
                    size="middle"
                  >
                    <Descriptions.Item label="Make" key="make">{car.carMake || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Model" key="model">{car.carModel || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Year" key="year">{car.carYear || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="VIN" key="vin">{car.carVin || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Total Owners" key="owners">{car.carNumberOfOwners || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Total Km Run" key="odometer">{car.carOdometerReading || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Engine No." key="engine">{car.carEngineNumber || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Chassis No." key="chassis">{car.carChassisNumber || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Sale Price" key="price">{car.carPrice ? `₹ ${car.carPrice.toLocaleString()}` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Mileage" key="mileage">{car.carMileage ? `${car.carMileage.toLocaleString()} km` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Purchase Price" key="purchasePrice">{car.carPurchasePrice ? `₹ ${car.carPurchasePrice.toLocaleString()}` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Purchase Date" key="purchaseDate">{car.carPurchaseDate ? new Date(car.carPurchaseDate).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Fuel Type" key="fuel">{car.carFuelType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Transmission" key="transmission">{car.carTransmission || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Condition" key="condition">{car.carCondition || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Color" key="color">{car.carColor || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Status" key="status">
                      <Tag
                        color={
                          car.carStatus === 'Maintenance' ? 'red' :
                            car.carStatus === 'Sold' ? 'blue' :
                              car.carStatus === 'Booked' ? 'orange' :
                                car.carStatus === 'Available' ? 'green' : 'default'
                        }
                      >
                        {car.carStatus || 'Unknown'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Maintenance Amount" key="maintainAmount">{car.carMaintainAmount ? `₹ ${car.carMaintainAmount.toLocaleString()}` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Maintenance Details" span={3} key="maintainDetails">{car.carMaintainDetails || 'No details available'}</Descriptions.Item>
                  </Descriptions>
                </div>
                <CarEditForm onCarEdited={() => id && fetchCarDetails(id)} />
              </Space>
            </TabPane>

            <TabPane tab="Car Specification" key="specification">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={4} style={{ color: theme === 'dark' ? '#C9D6E3' : '#1C2731' }}>
                    Car Specifications
                  </Title>
                  <Descriptions bordered column={{ xs: 1, sm: 2, md: 3, lg: 3 }} size="middle">
                    <Descriptions.Item label="Engine Capacity">{car.engineCapacity || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Drivetrain">{car.drivetrain || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Suspension Type">{car.suspensionType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Fuel Tank Capacity">{car.fuelTankCapacity ? `${car.fuelTankCapacity} L` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="City Mileage">{car.cityMileage ? `${car.cityMileage} kmpl` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Highway Mileage">{car.highwayMileage ? `${car.highwayMileage} kmpl` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Length">{car.length ? `${car.length} mm` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Width">{car.width ? `${car.width} mm` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Height">{car.height ? `${car.height} mm` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Ground Clearance">{car.groundClearance ? `${car.groundClearance} mm` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Wheelbase">{car.wheelbase ? `${car.wheelbase} mm` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Boot Space">{car.bootSpace ? `${car.bootSpace} L` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Front Brake Type">{car.frontBrakeType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Rear Brake Type">{car.rearBrakeType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Tire Type">{car.tireType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Wheel Size">{car.wheelSize || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Air Conditioning">{car.airConditioning ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="AC Type">{car.airConditioningType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Power Steering">{car.powerSteering ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Power Windows">{car.powerWindowsType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Cruise Control">{car.cruiseControl ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Central Locking">{car.centralLocking ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Infotainment System">{car.infotainmentSystem ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Navigation System">{car.navigationSystem ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Sunroof">{car.sunroof ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Airbags">{car.airbags ?? 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="ABS">{car.abs ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="EBD">{car.ebd ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Traction Control">{car.tractionControl ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Rear Camera">{car.rearCamera ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Parking Sensors">{car.parkingSensors ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="AM/FM Radio">{car.amFmRadio ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="AUX">{car.auxCompatibility ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="USB">{car.usbCompatibility ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Bluetooth">{car.bluetooth ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Anti-Theft Device">{car.antiTheftDevice ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Adjustable External Mirrors">{car.adjustableExternalMirror || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Adjustable Steering">{car.adjustableSteering ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Battery Condition">{car.batteryCondition || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Insurance Type">{car.insuranceType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Lock System">{car.lockSystem || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Make Year">{car.makeYear || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Registration Place">{car.registrationPlace || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Exchange Available">{car.exchangeAvailable ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Finance Available">{car.financeAvailable ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Service History Available">{car.serviceHistoryAvailable ? 'Yes' : 'No'}</Descriptions.Item>
                    <Descriptions.Item label="Tyre Condition">{car.tyreCondition || 'N/A'}</Descriptions.Item>
                  </Descriptions>
                </div>

                <CarEditForm onCarEdited={() => id && fetchCarDetails(id)} />
              </Space>
            </TabPane>


            <TabPane tab="Documents" key="documents">
              <Descriptions
                bordered
                column={{ xs: 1, sm: 2, md: 3, lg: 3 }}
                size="middle"
              >
                {[
                  { label: 'Car Image', data: car.carImageUrl, key: 'carImageUrl' },
                  { label: 'Car Image 1', data: car.carImage1Url, key: 'carImage1Url' },
                  { label: 'Car Image 2', data: car.carImage2Url, key: 'carImage2Url' },
                  { label: 'Car Image 3', data: car.carImage3Url, key: 'carImage3Url' },
                  { label: 'Car Image 4', data: car.carImage4Url, key: 'carImage4Url' },
                  { label: 'Car Image 5', data: car.carImage5Url, key: 'carImage5Url' },
                  { label: 'Car Image 6', data: car.carImage6Url, key: 'carImage6Url' },
                  { label: 'Car Image 7', data: car.carImage7Url, key: 'carImage7Url' },
                  { label: 'Car Image 8', data: car.carImage8Url, key: 'carImage8Url' },
                  { label: 'Car Image 9', data: car.carImage9Url, key: 'carImage9Url' },
                  { label: 'Car Image 10', data: car.carImage10Url, key: 'carImage10Url' },
                  { label: 'Car Image 11', data: car.carImage11Url, key: 'carImage11Url' },
                  { label: 'Car Image 12', data: car.carImage12Url, key: 'carImage12Url' },
                  { label: 'Car Image 13', data: car.carImage13Url, key: 'carImage13Url' },
                  { label: 'Car Image 14', data: car.carImage14Url, key: 'carImage14Url' },
                  { label: 'Car Image 15', data: car.carImage15Url, key: 'carImage15Url' },
                  { label: 'Car RC Document', data: car.carRcDocumentUrl, key: 'carRcDocumentUrl' },
                  { label: 'Car Insurance Document', data: car.carInsuranceDocumentUrl, key: 'carInsuranceDocumentUrl' },
                  { label: 'Car PUC Document', data: car.carPucDocumentUrl, key: 'carPucDocumentUrl' },
                  { label: 'Seller Photo', data: car.sellerPhotoUrl, key: 'sellerPhotoUrl' },
                  { label: 'Seller Aadhar Card', data: car.sellerAadharCardUrl, key: 'sellerAadharCardUrl' },
                  { label: 'Seller PAN Card', data: car.sellerPanCardUrl, key: 'sellerPanCardUrl' },
                  { label: 'Seller Address Proof', data: car.sellerAddressProofUrl, key: 'sellerAddressProofUrl' }

                ].map((item) => (
                  <Descriptions.Item label={item.label} key={item.key}>
                    {item.data ? (
                      <Image
                        src={`${item.data}`}
                        alt={item.label}
                        style={{ maxWidth: '80px', maxHeight: '80px' }}
                        placeholder={<Spin />}
                        preview={{
                          mask: 'View Larger',
                          src: `${item.data}`,
                        }}
                      />
                    ) : (
                      'No image'
                    )}
                  </Descriptions.Item>
                ))}
              </Descriptions>

            </TabPane>
            <TabPane tab="Inquiries" key="inquiries">
              {inquiriesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
                  <Spin />
                </div>
              ) : inquiries.length > 0 ? (
                <Table
                  dataSource={inquiries}
                  columns={inquiryColumns}
                  rowKey="id"
                  pagination={{ pageSize: 5, responsive: true }}
                  bordered
                  scroll={{ x: 'max-content' }}
                />
              ) : (
                <Empty description="No inquiries found for this car" />
              )}
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default CarDetailsTable;