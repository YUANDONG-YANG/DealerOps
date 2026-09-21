import React, { useEffect, useState } from 'react';
import {
    Button,
    Card,
    Typography,
    Space,
    message,
    Descriptions,
    Spin,
    Empty,
    Divider,
    ConfigProvider,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {  inquiriesService } from '../../services/api';
import { useTheme } from '../../components/layout/ThemeContext';
import InquiryEditForm from './InquiryEditForm';

const { Title } = Typography;


interface Car {
    make: string;
    model: string;
    year: number;
    vin: string;
    engineNumber: string;
    chassisNumber: string;
    carMaintainAmount: number;
    carMaintainDetails: string;
    price: number;
    mileage: number;
    purchasePrice: number;
    purchaseDate: string;
    fuelType: string;
    transmission: string;
    condition: string;
    color: string;
    status: string;
    numberOfOwners: string;
    odometerReading: string;
    carImage?: string;
    carRcDocument?: string;
    carInsuranceDocument?: string;
    carPucDocument?: string;
}

interface Inquiry {
    id: number;
    car: Car | null;
    name: string;
    phone: string;
    email: string;
    address: string;
    customerRequiredCar: string;
    fuelType: string;
    budget: number;
    inquiryDate: string | null;
    message: string;
    inquiryStatus: string;
    createdAt: string | null;
    deleteFlag: boolean;
}

const InquiryDetailsTable: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [Inquiry, setInquiry] = useState<Inquiry | null>(null);
    const [loading, setLoading] = useState(true);
    const [inquiriesLoading, setInquiriesLoading] = useState(true);
    const navigate = useNavigate();
    const { theme } = useTheme(); // Assuming theme is 'light' or 'dark'

    useEffect(() => {
        if (id) {
            fetchInquiryDetails(id);
        }
    }, [id]);

    const fetchInquiryDetails = async (InquiryId: string) => {
        try {
            setLoading(true);
            const response = await inquiriesService.getById(InquiryId);
            setInquiry(response.data);
            console.log("Inquiry Details", response.data);
        } catch (error) {
            message.error('Failed to fetch Inquiry details');
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

    if (!Inquiry) {
        return <Empty description="Inquiry not found" />;
    }

    return (
        <>
            {loading ? (
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
            ) : !Inquiry ? (
                <Empty description="Inquiry not found" />
            ) : (
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
                                    onClick={() => navigate('/inquiries')}
                                    style={{
                                        marginRight: 16,
                                        color: theme === 'dark' ? '#66B2FF' : '#1890ff',
                                    }}
                                >
                                    Back to Inquiry
                                </Button>
                                <Title
                                    level={2}
                                    style={{
                                        margin: 0,
                                        color: theme === 'dark' ? '#C9D6E3' : '#1C2731',
                                    }}
                                >
                                    {Inquiry.name}
                                </Title>
                            </div>

                            <Card
                                style={{
                                    margin: '24px 0',
                                    borderRadius: 8,
                                }}

                            >
                                <InquiryEditForm onInquiryEdited={fetchInquiryDetails}/>
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
                                        Inquiry Details
                                    </Title>
                                </Space>

                                <Divider orientation="left">Inquiry Information</Divider>

                                <Descriptions
                                    bordered
                                    column={{ xs: 1, sm: 2, md: 3 }}
                                    size="middle"
                                >
                                    <Descriptions.Item label="Inquiry Name">{Inquiry?.name}</Descriptions.Item>
                                    <Descriptions.Item label="Phone">{Inquiry?.phone}</Descriptions.Item>
                                    <Descriptions.Item label="Email">{Inquiry?.email}</Descriptions.Item>
                                    <Descriptions.Item label="Address">{Inquiry?.address}</Descriptions.Item>
                                    <Descriptions.Item label="Customer Required Car">{Inquiry?.customerRequiredCar}</Descriptions.Item>
                                    <Descriptions.Item label="Fuel Type">{Inquiry?.fuelType}</Descriptions.Item>
                                    <Descriptions.Item label="Budget">₹ {Inquiry?.budget?.toLocaleString()}</Descriptions.Item>
                                    <Descriptions.Item label="Inquiry Date">{Inquiry?.inquiryDate ? new Date(Inquiry?.inquiryDate).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Message">{Inquiry?.message}</Descriptions.Item>
                                    <Descriptions.Item label="Inquiry Status">{Inquiry?.inquiryStatus}</Descriptions.Item>
                                    <Descriptions.Item label="Created At">{Inquiry?.createdAt ? new Date(Inquiry?.createdAt).toLocaleDateString() : 'N/A'}</Descriptions.Item>
                                </Descriptions>

                                {Inquiry.car && (
                                    <>
                                        <Divider orientation="left">Car Information</Divider>

                                        <Descriptions
                                            bordered
                                            column={{ xs: 1, sm: 2, md: 3 }}
                                            size="middle"
                                        >
                                            <Descriptions.Item label="Make">{Inquiry?.car.make}</Descriptions.Item>
                                            <Descriptions.Item label="Model">{Inquiry?.car.model}</Descriptions.Item>
                                            <Descriptions.Item label="Year">{Inquiry?.car.year}</Descriptions.Item>
                                            <Descriptions.Item label="VIN">{Inquiry?.car.vin}</Descriptions.Item>
                                            <Descriptions.Item label="Total Owners">{Inquiry?.car.numberOfOwners}</Descriptions.Item>
                                            <Descriptions.Item label="Total Km">{Inquiry?.car.odometerReading}</Descriptions.Item>
                                            <Descriptions.Item label="Engine Number">{Inquiry?.car.engineNumber}</Descriptions.Item>
                                            <Descriptions.Item label="Chassis Number">{Inquiry?.car.chassisNumber}</Descriptions.Item>
                                            <Descriptions.Item label="Price">₹ {Inquiry?.car.price?.toLocaleString()}</Descriptions.Item>
                                            <Descriptions.Item label="Mileage">{Inquiry?.car.mileage} km</Descriptions.Item>
                                            <Descriptions.Item label="Fuel Type">{Inquiry?.car.fuelType}</Descriptions.Item>
                                            <Descriptions.Item label="Transmission">{Inquiry?.car.transmission}</Descriptions.Item>
                                            <Descriptions.Item label="Condition">{Inquiry?.car.condition}</Descriptions.Item>
                                            <Descriptions.Item label="Color">{Inquiry?.car.color}</Descriptions.Item>
                                            <Descriptions.Item label="Status">{Inquiry?.car.status}</Descriptions.Item>
                                        </Descriptions>
                                    </>
                                )}
                            </Card>
                        </div>
                    </div>
                </ConfigProvider>
            )}
        </>
    );
};

export default InquiryDetailsTable;