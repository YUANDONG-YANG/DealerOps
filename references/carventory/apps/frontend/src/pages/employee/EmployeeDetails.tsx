import React, { useEffect, useState } from 'react';
import {
    Typography,
    message,
    Descriptions,
    Spin,
    Empty,
    ConfigProvider,
} from 'antd';
import { employeeService } from '../../services/api';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from 'antd/es/card/Card';
import { useParams } from 'react-router-dom';

const { Title } = Typography;


interface Employee {
    ownerName: string;
    email: string;
    role: string;
    userPhone: string;
    userMobile: string;
    username: string;
    active: boolean;
}

const EmployeeDetails: React.FC = () => {
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [loading, setLoading] = useState(true);
    const { theme } = useTheme(); // Assuming theme is 'light' or 'dark'
    const { id } = useParams<{ id: string }>();

    useEffect(() => {
        if (id) {
            fetchInquiryDetails(id);
        }
    }, [id]);

    const fetchInquiryDetails = async (InquiryId: string) => {
        try {
            setLoading(true);
            const response = await employeeService.getById(Number(InquiryId));
            setEmployee(response.data);
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
            ) : !employee ? (
                <Empty description="Employee not found" />
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
                                <Title
                                    level={2}
                                    style={{
                                        margin: 0,
                                        color: theme === 'dark' ? '#C9D6E3' : '#1C2731',
                                    }}
                                >
                                    {employee.ownerName}
                                </Title>
                            </div>

                            <Card
                                style={{
                                    margin: '24px 0',
                                    borderRadius: 8,
                                }}

                            >

                                <Descriptions
                                    bordered
                                    column={2}
                                    size="middle"
                                >
                                    <Descriptions.Item label="Owner Name">{employee.ownerName}</Descriptions.Item>
                                    <Descriptions.Item label="Email">{employee.email}</Descriptions.Item>
                                    <Descriptions.Item label="Username">{employee.username}</Descriptions.Item>
                                    <Descriptions.Item label="Role">{employee.role}</Descriptions.Item>
                                    <Descriptions.Item label="Phone">{employee.userPhone}</Descriptions.Item>
                                    <Descriptions.Item label="Mobile">{employee.userMobile}</Descriptions.Item>
                                    <Descriptions.Item label="Active">{employee.active ? 'Yes' : 'No'}</Descriptions.Item>
                                </Descriptions>

                            </Card>
                        </div>
                    </div>
                </ConfigProvider>
            )}
        </>
    );
};

export default EmployeeDetails;