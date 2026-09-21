import React, { useEffect, useState, useRef } from 'react';
import {
  Button,
  Card,
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
import { ArrowLeft, ArrowRight, Mail, MapPinIcon, Phone, User2Icon } from 'lucide-react';
import { MailOutlined, PhoneOutlined } from '@ant-design/icons';
import { buyersService } from '../../services/api';
import { useTheme } from '../../components/layout/ThemeContext';
import BuyerEditForm from './BuyerEditForm';

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

interface Buyer {
  buyerId: number;
  carId: number;
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
  fuelType: string;
  transmission: string;
  condition: string;
  color: string;
  status: string;
  imageUrl?: string;
  rcDocumentUrl?: string;
  insuranceDocumentUrl?: string;
  pucDocumentUrl?: string;
  carCreatedAt: string;
  carDeleteFlag: boolean;
  name: string;
  phone: string;
  email: string;
  salePrice: number;
  saleDate: string;
  notes: string;
  address: string;
  photoUrl?: string;
  aadharCardUrl?: string;
  panCardUrl?: string;
  addressProofUrl?: string;
  buyerCreatedAt: string;
  buyerDeleteFlag: boolean;
}

const BuyerDetailsTable: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const carouselRef = useRef<any>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [hoverPhone, setHoverPhone] = useState(false);
  const [hoverEmail, setHoverEmail] = useState(false);
  const [hoverPrev, setHoverPrev] = useState(false);
  const [hoverNext, setHoverNext] = useState(false);

  const hoverStyle = {
    backgroundColor: '#1890ff',
    color: 'white',
    borderColor: '#1890ff',
  };

  useEffect(() => {
    if (id) {
      fetchBuyerDetails(id);
    }
  }, [id]);

  const fetchBuyerDetails = async (buyerId: string, retryCount = 3, delay = 1000) => {
    try {
      setLoading(true);
      setError(null);
      const response = await buyersService.getById(buyerId);
      if (!response.data) {
        throw new Error('Invalid buyer data received');
      }

      const buyerData: Buyer = {
        ...response.data,
        buyerId: parseInt(buyerId),
        purchaseDate: response.data.purchaseDate || null,
        status: response.data.status || 'Unknown',
        carCreatedAt: response.data.carCreatedAt || new Date().toISOString(),
        buyerCreatedAt: response.data.buyerCreatedAt || new Date().toISOString(),
        photoUrl: response.data.photoUrl ? `${response.data.photoUrl}` : undefined,
        image: response.data.image ? `${response.data.image}` : undefined,
        aadharCardUrl: response.data.aadharCardUrl ? `${response.data.aadharCardUrl}` : undefined,
        panCardUrl: response.data.panCardUrl ? `${response.data.panCardUrl}` : undefined,
        addressProofUrl: response.data.addressProofUrl ? `${response.data.addressProofUrl}` : undefined,
        rcDocumentUrl: response.data.rcDocumentUrl ? `${response.data.rcDocumentUrl}` : undefined,
        insuranceDocumentUrl: response.data.insuranceDocumentUrl ? `${response.data.insuranceDocumentUrl}` : undefined,
        pucDocumentUrl: response.data.pucDocumentUrl ? `${response.data.pucDocumentUrl}` : undefined,
      };

      setBuyer(buyerData);
    } catch (error: any) {
      console.error('Error in fetchBuyerDetails:', error);
      if (retryCount > 0) {
        setTimeout(() => fetchBuyerDetails(buyerId, retryCount - 1, delay * 2), delay);
      } else {
        setError(error.message === 'Buyer not found' ? 'Buyer not found.' : 'Failed to load buyer details. Please try again later.');
        message.error('Failed to fetch buyer details');
      }
    } finally {
      setLoading(false);
    }
  };

  const images = [
    buyer?.imageUrl,
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

  if (error || !buyer) {
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
          <Empty description={error || 'Buyer not found'} />
          <Button type="primary" onClick={() => id && fetchBuyerDetails(id)} style={styles.button} aria-label="Retry loading buyer details">
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
                onClick={() => navigate('/buyers')}
                style={{ color: theme === 'dark' ? '#66B2FF' : '#1890ff', ...styles.button }}
                aria-label="Back to buyers list"
              >
                Back to Buyers
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
              {buyer.name}
            </Title>
          </div>
          <div style={styles.rightBlock}>
            <Text style={{ ...styles.priceText, color: styles.priceText.color(theme) }}>
              ₹ {buyer.salePrice.toLocaleString()}
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
                          src={`${img}`}
                          alt={`${buyer.name} photo`}
                          style={styles.carouselImage}
                          placeholder={<Spin />}
                          preview={false}
                          onError={(e) => {
                            console.error('Failed to load buyer photo:', img?.substring(0, 50) || 'undefined');
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerText = 'Corrupted photo';
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </Carousel>
                <div style={styles.navButtonContainer}>
                  <Button
                    type='primary'
                    ghost
                    onClick={handlePrev}
                    onMouseEnter={() => setHoverPrev(true)}
                    onMouseLeave={() => setHoverPrev(false)}
                    aria-label="Previous image"
                    icon={<ArrowLeft size={16} />}
                    disabled={images.length <= 1}
                    style={hoverPrev && images.length > 1 ? { ...styles.button, ...hoverStyle } : styles.button}
                  >
                    Previous
                  </Button>
                  <Button
                    type='primary'
                    ghost
                    onClick={handleNext}
                    onMouseEnter={() => setHoverNext(true)}
                    onMouseLeave={() => setHoverNext(false)}
                    aria-label="Next image"
                    icon={<ArrowRight size={16} />}
                    disabled={images.length <= 1}
                    style={hoverNext && images.length > 1 ? { ...styles.button, ...hoverStyle } : styles.button}
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
                        src={`${img}`}
                        alt={`${buyer.name} thumbnail ${index + 1}`}
                        style={{ width: '100%', height: '50px', objectFit: 'cover', borderRadius: '4px' }}
                        preview={false}
                        placeholder={<Spin />}
                        onError={(e) => {
                          console.error('Failed to load thumbnail:', img?.substring(0, 50) || 'undefined');
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerText = 'Corrupted';
                        }}
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
                Key Buyer Information
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
                  <Text strong>Name:</Text>
                  <Text>{buyer.name || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Phone:</Text>
                  <Text>{buyer.phone || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Email:</Text>
                  <Text>{buyer.email || 'N/A'}</Text>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text strong>Sale Price:</Text>
                  <Text>{buyer.salePrice ? `₹ ${buyer.salePrice.toLocaleString()}` : 'N/A'}</Text>
                </div>
              </div>
            </Card>

            <Card style={{ borderRadius: 8, border: 'none' }}>
              <Title level={4} style={{ margin: 0, color: theme === 'dark' ? '#C9D6E3' : '#1C2731' }}>
                Contact Information
              </Title>
              <Divider />
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ flexShrink: 0 }}>
                  {buyer.photoUrl ? (
                    <Image
                      src={`${buyer.photoUrl}`}
                      alt="Buyer photo"
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
                        src: `${buyer.photoUrl}`,
                      }}
                      onError={(e) => {
                        console.error('Failed to load buyer photo:', buyer.photoUrl?.substring(0, 50) || 'undefined');
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.parentElement!.innerText = 'Corrupted photo';
                      }}
                    />
                  ) : (
                    <Text>No photo</Text>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User2Icon style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text strong>{buyer.name || 'N/A'}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Phone style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text>{buyer.phone || 'N/A'}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Mail style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text>{buyer.email || 'N/A'}</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPinIcon style={{ color: theme === 'dark' ? '#C9D6E3' : '#221C30' }} size={14} />
                    <Text>{buyer.address || 'N/A'}</Text>
                  </div>
                </div>
              </div>
              <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }} size="middle">
                <Button
                  block
                  icon={<PhoneOutlined />}
                  type='primary'
                  ghost
                  disabled={!buyer.phone}
                  style={hoverPhone ? { ...styles.button, ...hoverStyle } : styles.button}
                  onClick={() => buyer.phone && window.open(`tel:${buyer.phone}`)}
                  onMouseEnter={() => setHoverPhone(true)}
                  onMouseLeave={() => setHoverPhone(false)}
                  aria-label="Call buyer"
                >
                  Call Buyer
                </Button>
                <Button
                  block
                  icon={<MailOutlined />}
                  type='primary'
                  ghost
                  disabled={!buyer.email}
                  style={hoverEmail ? { ...styles.button, ...hoverStyle } : styles.button}
                  onClick={() => buyer.email && window.open(`mailto:${buyer.email}`)}
                  onMouseEnter={() => setHoverEmail(true)}
                  onMouseLeave={() => setHoverEmail(false)}
                  aria-label="Email buyer"
                >
                  Email Buyer
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
                    Buyer Information
                  </Title>
                  <Descriptions
                    bordered
                    column={{ xs: 1, sm: 2, md: 3, lg: 3 }}
                    size="middle"
                  >
                    <Descriptions.Item label="Name">{buyer.name || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Phone">{buyer.phone || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Email">{buyer.email || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Sale Price">{buyer.salePrice ? `₹ ${buyer.salePrice.toLocaleString()}` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Sale Date">{buyer.saleDate ? new Date(buyer.saleDate).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Address">{buyer.address || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Notes" span={3}>{buyer.notes || 'No notes available'}</Descriptions.Item>
                    <Descriptions.Item label="Buyer Created">{buyer.buyerCreatedAt ? new Date(buyer.buyerCreatedAt).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                  </Descriptions>
                </div>
                <div>
                  <Title level={4} style={{ color: theme === 'dark' ? '#C9D6E3' : '#1C2731' }}>
                    Car Information
                  </Title>
                  <Descriptions
                    bordered
                    column={{ xs: 1, sm: 2, md: 3, lg: 3 }}
                    size="middle"
                  >
                    <Descriptions.Item label="Make">{buyer.make || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Model">{buyer.model || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Year">{buyer.year || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="VIN">{buyer.vin || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Engine Number">{buyer.engineNumber || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Chassis Number">{buyer.chassisNumber || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Price">{buyer.price ? `₹ ${buyer.price.toLocaleString()}` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Mileage">{buyer.mileage ? `${buyer.mileage.toLocaleString()} km` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Purchase Price">{buyer.purchasePrice ? `₹ ${buyer.purchasePrice.toLocaleString()}` : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Purchase Date">{buyer.purchaseDate ? new Date(buyer.purchaseDate).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Fuel Type">{buyer.fuelType || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Transmission">{buyer.transmission || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Condition">{buyer.condition || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Color">{buyer.color || 'N/A'}</Descriptions.Item>
                    <Descriptions.Item label="Status">
                      <Tag
                        color={
                          buyer.status === 'Maintenance' ? 'red' :
                            buyer.status === 'Sold' ? 'blue' :
                              buyer.status === 'Booked' ? 'orange' :
                                buyer.status === 'Available' ? 'green' : 'default'
                        }
                      >
                        {buyer.status || 'Unknown'}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Car Created">{buyer.carCreatedAt ? new Date(buyer.carCreatedAt).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                  </Descriptions>
                </div>
                <BuyerEditForm onBuyerEdited={() => id && fetchBuyerDetails(id)} />
              </Space>
            </TabPane>
            <TabPane tab="Documents" key="documents">
              <Descriptions
                bordered
                column={{ xs: 1, sm: 2, md: 3, lg: 3 }}
                size="middle"
              >
                {[
                  { label: 'Buyer Photo', data: buyer.photoUrl, key: 'photoUrl' },
                  { label: 'Aadhar Card', data: buyer.aadharCardUrl, key: 'aadharCardUrl' },
                  { label: 'PAN Card', data: buyer.panCardUrl, key: 'panCardUrl' },
                  { label: 'Address Proof', data: buyer.addressProofUrl, key: 'addressProofUrl' },
                  { label: 'Car Image', data: buyer.imageUrl, key: 'image' },
                  { label: 'Car RC Document', data: buyer.rcDocumentUrl, key: 'rcDocumentUrl' },
                  { label: 'Car Insurance Document', data: buyer.insuranceDocumentUrl, key: 'insuranceDocumentUrl' },
                  { label: 'Car PUC Document', data: buyer.pucDocumentUrl, key: 'pucDocumentUrl' },
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
                        onError={(e) => {
                          console.error(`Failed to load ${item.label}:`, item.data?.substring(0, 50) || 'undefined');
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.innerText = 'Corrupted';
                        }}
                      />
                    ) : (
                      'No image'
                    )}
                  </Descriptions.Item>
                ))}
              </Descriptions>
            </TabPane>
          </Tabs>
        </Card>
      </div>
    </ConfigProvider>
  );
};

export default BuyerDetailsTable;