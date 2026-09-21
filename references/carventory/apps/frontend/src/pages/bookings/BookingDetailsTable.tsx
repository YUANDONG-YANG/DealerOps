import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Typography,
    Space,
    message,
    Tag,
    Descriptions,
    Spin,
    Empty,
    Divider,
    ConfigProvider,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { bookingsService } from '../../services/api';
import { useTheme } from '../../components/layout/ThemeContext';
import BookingEditForm from './BookingEditForm';

const { Title } = Typography;

interface Car {
    make: string;
    model: string;
    year: number;
    vin: string;
    engineNumber: string;
    chassisNumber: string;
    maintainAmount: number;
    maintainDetails: string;
    price: number;
    mileage: number;
    purchasePrice: number;
    purchaseDate: string;
    fuelType: string;
    transmission: string;
    condition: string;
    color: string;
    status: string;
    numberOfOwners: number;
    odometerReading: number;
    sellerName: string;
    sellerPhone: string;
    sellerEmail: string;
    sellerAddress: string;
    image?: string;
    rcDocument?: string;
    insuranceDocument?: string;
    pucDocument?: string;
    sellerPhoto?: string;
    sellerAadharCard?: string;
    sellerPanCard?: string;
    sellerAddressProof?: string;
}

interface Booking {
    id: number;
    carVin: string;
    car: Car;
    buyerName: string;
    buyerPhone: string;
    buyerEmail: string;
    advanceAmount: number;
    totalAmount: number;
    bookingDate: string;
    paymentCompletionDate: string;
    status: string;
    createdAt: string;
    deleteFlag: boolean;
}

const BookingDetailsTable: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { theme } = useTheme();

    useEffect(() => {
        if (id) {
            fetchBookingDetails(id);
        }
    }, [id]);

    const fetchBookingDetails = async (bookingId: string) => {
        try {
            setLoading(true);
            const response = await bookingsService.getById(bookingId);
            setBooking(response.data);
            console.log("Booking Details", response.data);
        } catch (error) {
            message.error('Failed to fetch Booking details');
            console.error(error);
        } finally {
            setLoading(false);
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
                    height: '80vh',
                }}
            >
                <Spin size="large" />
            </div>
        );
    }

    if (!booking) {
        return <Empty description="Booking not found" />;
    }

    return (
        <ConfigProvider theme={tableTheme}>
            <div
                className="p-4"
                style={{
                    backgroundColor: theme === 'dark' ? '#0B1118' : '#F8FAFC',
                }}
            >
                <div
                    className="p-4"
                    style={{
                        backgroundColor: theme === 'dark' ? '#0B1118' : '#F8FAFC',
                    }}
                >
                    <div className="flex items-center mb-6">
                        <Button
                            type="text"
                            icon={<ArrowLeft size={16} />}
                            onClick={() => navigate('/bookings')}
                            style={{
                                marginRight: 16,
                                color: theme === 'dark' ? '#66B2FF' : '#1890ff',
                            }}
                        >
                            Back to Bookings
                        </Button>
                        <Title
                            level={2}
                            style={{
                                margin: 0,
                                color: theme === 'dark' ? '#C9D6E3' : '#1C2731',
                            }}
                        >
                            {booking.buyerName}
                        </Title>
                    </div>

                    <Card
                        style={{
                            margin: '24px 0',
                            borderRadius: 8,
                        }}
                    >
                        <BookingEditForm onBookingEdited={fetchBookingDetails}/>
                        <Space
                            style={{
                                justifyContent: 'space-between',
                                width: '100%',
                            }}
                            align="center"
                        >
                            <Title
                                level={4}
                                style={{
                                    margin: 0,
                                    color: theme === 'dark' ? '#C9D6E3' : '#1C2731',
                                }}
                            >
                                Booking Details
                            </Title>
                        </Space>

                        <Divider orientation="left">Booking Information</Divider>

                        <Descriptions
                            bordered
                            column={{ xs: 1, sm: 2, md: 3 }}
                            size="middle"
                        >
                            <Descriptions.Item label="Buyer Name">{booking.buyerName}</Descriptions.Item>
                            <Descriptions.Item label="Buyer Phone">{booking.buyerPhone}</Descriptions.Item>
                            <Descriptions.Item label="Buyer Email">{booking.buyerEmail}</Descriptions.Item>
                            <Descriptions.Item label="Advance Amount">₹ {booking.advanceAmount.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Total Amount">₹ {booking.totalAmount.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Booking Date">{new Date(booking.bookingDate).toLocaleDateString()}</Descriptions.Item>
                            <Descriptions.Item label="Payment Completion Date">{new Date(booking.paymentCompletionDate).toLocaleDateString()}</Descriptions.Item>
                            <Descriptions.Item label="Status">
                                <Tag
                                    color={
                                        booking.status === 'Canceled' ? 'red' :
                                        booking.status === 'Booked' ? 'orange' :
                                        booking.status === 'Completed' ? 'green' : 'default'
                                    }
                                >
                                    {booking.status}
                                </Tag>
                            </Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left">Car Information</Divider>

                        <Descriptions
                            bordered
                            column={{ xs: 1, sm: 2, md: 3 }}
                            size="middle"
                        >
                            <Descriptions.Item label="Make">{booking.car.make}</Descriptions.Item>
                            <Descriptions.Item label="Model">{booking.car.model}</Descriptions.Item>
                            <Descriptions.Item label="Year">{booking.car.year}</Descriptions.Item>
                            <Descriptions.Item label="VIN">{booking.car.vin}</Descriptions.Item>
                            <Descriptions.Item label="Total Owner">{booking.car.numberOfOwners}</Descriptions.Item>
                            <Descriptions.Item label="Total Km">{booking.car.odometerReading}</Descriptions.Item>
                            <Descriptions.Item label="Engine Number">{booking.car.engineNumber}</Descriptions.Item>
                            <Descriptions.Item label="Chassis Number">{booking.car.chassisNumber}</Descriptions.Item>
                            <Descriptions.Item label="Price">₹ {booking.car.price.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Mileage">{booking.car.mileage} km</Descriptions.Item>
                            <Descriptions.Item label="Fuel Type">{booking.car.fuelType}</Descriptions.Item>
                            <Descriptions.Item label="Transmission">{booking.car.transmission}</Descriptions.Item>
                            <Descriptions.Item label="Condition">{booking.car.condition}</Descriptions.Item>
                            <Descriptions.Item label="Color">{booking.car.color}</Descriptions.Item>
                            <Descriptions.Item label="Status">{booking.car.status}</Descriptions.Item>
                        </Descriptions>
                    </Card>
                    <Divider />
                </div>
            </div>
        </ConfigProvider>
    );
};

export default BookingDetailsTable;