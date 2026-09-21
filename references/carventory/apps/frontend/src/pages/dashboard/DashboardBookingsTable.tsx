import React, { useEffect, useState } from 'react';
import { Table, Spin, ConfigProvider } from 'antd';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye } from 'lucide-react';
import { Button, Dropdown, message, Tag } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/Card';
import { bookingsService } from '../../services/api';

interface Booking {
  id: string;
  carVin: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  advanceAmount: number;
  totalAmount: number;
  bookingDate: string;
  paymentCompletionDate: string;
  status: string;
}

const DashboardBookingsTable: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsService.getByAllBookedCar();
      setBookings(response.data || []);
    } catch (error) {
      message.error('Failed to fetch bookings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'buyerName',
      key: 'buyerName', // Lowercase to follow convention
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'buyerPhone',
      key: 'buyerPhone',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Car VIN',
      dataIndex: ['car', 'vin'], // Keep as is, assuming API returns nested car.vin
      key: 'carVin',
      render: (text: string) => <span>{text || 'N/A'}</span>, // Handle potential undefined
    },
    {
      title: 'Advance Amount',
      dataIndex: 'advanceAmount',
      key: 'advanceAmount',
      render: (text: number) => <span>₹ {text}</span>,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      render: (text: number) => <span>₹ {text}</span>,
    },
    {
      title: 'Booking Date',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      render: (text: string) => <span>{text ? new Date(text).toLocaleDateString() : 'N/A'}</span>,
    },
    {
      title: 'Payment Completion Date',
      dataIndex: 'paymentCompletionDate',
      key: 'paymentCompletionDate',
      render: (text: string) => <span>{text ? new Date(text).toLocaleDateString() : 'N/A'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <Tag
          color={
            text === 'Pending' ? 'orange' : text === 'Booked' ? 'green' : 'default'
          }
        >
          {text || 'Unknown'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Booking) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <Eye size={14} />,
                onClick: () => navigate(`/bookings/${record.id}`),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreHorizontal size={16} />} />
        </Dropdown>
      ),
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
        colorPrimary: theme === 'dark' ? '#66B2FF' : undefined,
        colorPrimaryHover: theme === 'dark' ? '#5D9CEC' : undefined,
      },
      Input: {
        colorBgContainer: theme === 'dark' ? '#1A2734' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
        colorBorder: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
        colorTextPlaceholder: theme === 'dark' ? '#6B7280' : '#9CA3AF',
      },
    },
  };

  // Map bookings to include a unique key for each item
  const dataSource = bookings.map((booking) => ({
    ...booking,
    key: booking.id, // Use id as the unique key
  }));

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

  return (
    <div className="mb-6">
      <Card
        title="Bookings"
        className="mt-6"
        glassmorphism={true}
      >
        <ConfigProvider theme={tableTheme}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id" // Use id instead of carVin for uniqueness
            loading={loading}
            scroll={{ x: 'max-content' }}
          />
        </ConfigProvider>
      </Card>
    </div>
  );
};

export default DashboardBookingsTable;