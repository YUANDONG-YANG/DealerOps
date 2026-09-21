// import React, { useEffect, useState } from 'react';
// import { Table, Spin, ConfigProvider } from 'antd';
// import { useNavigate } from 'react-router-dom';
// import { Eye, MoreHorizontal } from 'lucide-react';
// import { Button, Dropdown, message, Tag } from 'antd';
// import { useTheme } from '../../components/layout/ThemeContext';
// import Card from '../../components/ui/CardTable';
// import { bookingsService } from '../../services/api';
// import BookingCreateForm from './BookingCreateForm';

// interface Booking {
//   id: string; // Unique identifier for the booking
//   carVin: string;
//   buyerName: string;
//   buyerPhone: string;
//   buyerEmail: string;
//   advanceAmount: number;
//   totalAmount: number;
//   bookingDate: string; // ISO date string
//   paymentCompletionDate: string; // ISO date string
// }

// const BookingTable: React.FC = () => {
//     const [bookings, setBooking] = useState<Booking[]>([]);
//   const [loading, setLoading] = useState(true);
//   const navigate = useNavigate();
//   const { theme } = useTheme();

//   useEffect(() => {
//     fetchBookings();
//   }, []);

//   const fetchBookings = async () => {
//     try {
//       setLoading(true);
//       const response = await bookingsService.getAll();
//       setBooking(response.data || []);
//     } catch (error) {
//       message.error('Failed to fetch bookings');
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const columns = [
//     {
//       title: 'Name',
//       dataIndex: 'buyerName',
//       key: 'BuyerName',
//       render: (text: string) => <span>{text}</span>,
//     },
//     {
//       title: 'Phone',
//       dataIndex: 'buyerPhone',
//       key: 'BuyerPhone',
//       render: (text: string) => <span>{text}</span>,
//     },
//     {
//       title: 'Car VIN',
//       dataIndex: ['car', 'vin'],
//       key: 'carVin',
//       render: (text: string) => <span>{text}</span>,
//     },
//     {
//       title: 'Advance Amount',
//       dataIndex: 'advanceAmount',
//       key: 'AdvanceAmount',
//       render: (text: number) => <span>₹ {text}</span>,
//     },
//     {
//       title: 'Total Amount',
//       dataIndex: 'totalAmount',
//       key: 'TotalAmount',
//       render: (text: number) => <span>₹ {text}</span>,
//     },
//     {
//       title: 'Booking Date',
//       dataIndex: 'bookingDate',
//       key: 'BookingDate',
//       render: (text: string) => <span>{new Date(text).toLocaleDateString()}</span>,
//     },
//     {
//       title: 'Payment Completion Date',
//       dataIndex: 'paymentCompletionDate',
//       key: 'PaymentCompletionDate',
//       render: (text: string) => <span>{new Date(text).toLocaleDateString()}</span>,
//     },
//     {
//       title: 'Status',
//       dataIndex: 'status',
//       key: 'status',
//       render: (status: string) => (
//         <Tag color={
//           status === 'Available' ? 'green' :
//             status === 'Sold' ? 'blue' :
//               status === 'Booked' ? 'orange' :
//                 status === 'Maintenance' ? 'red' :
//                   'default'
//         }>
//           {status}
//         </Tag>
//       ),
//     },
//     {
//       title: 'Actions',
//       key: 'actions',
//       render: (_: any, record: Booking) => (
//         <Dropdown
//           menu={{
//             items: [
//               {
//                 key: 'view',
//                 label: 'View Details',
//                 icon: <Eye size={14} />,
//                 onClick: () => navigate(`/bookings/${record.id}`),
//               },
//             ],
//           }}
//           trigger={['click']}
//         >
//           <Button type="text" icon={<MoreHorizontal size={16} />} />
//         </Dropdown>
//       ),
//     },
//   ];


//   const tableTheme = {
//     token: {
//       colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
//       colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
//       colorTextHeading: theme === 'dark' ? '#C9D6E3' : '#1C2731',
//       colorBorderSecondary: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
//       colorBgContainerHover: theme === 'dark' ? '#1A2734' : '#EEE0C9',
//       colorBgContainerSelected: theme === 'dark' ? '#1A2734' : '#ADC4CE',
//       fontSize: 14,
//       borderRadius: 8,
//     },
//     components: {
//       Table: {
//         headerBg: theme === 'dark' ? '#14212E' : '#2A4759',
//         headerColor: theme === 'dark' ? '#C9D6E3' : '#eeeeee',
//         rowHoverBg: theme === 'dark' ? '#2F3B4A' : '#D9EAFD',
//         cellPaddingBlock: 12,
//         cellPaddingInline: 16,
//       },
//       Button: {
//         colorPrimary: theme === 'dark' ? '#66B2FF' : undefined,
//         colorPrimaryHover: theme === 'dark' ? '#5D9CEC' : undefined,
//       },
//     },
//   };

//   const dataSource = bookings.map((booking) => ({
//     ...booking,
//     key: booking.id.toString(),
//   }));

//   if (loading) {
//     return (
//       <div
//         style={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//           height: '80vh',
//         }}
//       >
//         <Spin size="large" />
//       </div>
//     );
//   }

//   return (
//     <div className="mb-6">
//       <Card
//         title="Booking List"
//         className="mt-6"
//         glassmorphism={true}
//         header={<BookingCreateForm onBookingCreated={fetchBookings} />}
//       >
//         <ConfigProvider theme={tableTheme}>
//           <Table
//             columns={columns}
//             dataSource={dataSource}
//             rowKey="id"
//             loading={loading}
//             scroll={{ x: 'max-content' }}
//           />
//         </ConfigProvider>
//       </Card>
//     </div>
//   );
// };

// export default BookingTable;


import React, { useEffect, useState, useCallback } from 'react';
import { Table, Spin, ConfigProvider, Input, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal, Search } from 'lucide-react';
import { Dropdown, message, Tag } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/CardTable';
import { bookingsService } from '../../services/api';
import BookingCreateForm from './BookingCreateForm';

interface Car {
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

interface Booking {
  id: number;
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

const BookingTable: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await bookingsService.getAll();
      setBookings(response.data || []);
    } catch (error) {
      message.error('Failed to fetch bookings');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      fetchBookings();
      return;
    }

    setLoading(true);
    try {
      // Execute search APIs concurrently
      const [nameResults, phoneResults, vinResults] = await Promise.all([
        bookingsService.getByBuyerName(value).catch((error) => {
          console.error('Name search failed:', error);
          return [];
        }),
        bookingsService.getByBuyerPhone(value).catch((error) => {
          console.error('Phone search failed:', error);
          return [];
        }),
        bookingsService.getByCarVin(value.trim().toUpperCase()).catch((error) => {
          console.error('VIN search failed:', error);
          return [];
        }),
      ]);

      // Normalize results to ensure they are arrays of Booking objects
      const normalizeResults = (results: any): Booking[] => {
        if (Array.isArray(results)) {
          return results.filter((item): item is Booking => item && typeof item === 'object' && 'id' in item);
        }
        if (results && typeof results === 'object') {
          if ('data' in results) {
            return Array.isArray(results.data)
              ? results.data.filter((item: any): item is Booking => item && typeof item === 'object' && 'id' in item)
              : results.data && typeof results.data === 'object' && 'id' in results.data
              ? [results.data]
              : [];
          }
          return 'id' in results ? [results] : [];
        }
        return [];
      };

      const normalizedNameResults = normalizeResults(nameResults);
      const normalizedPhoneResults = normalizeResults(phoneResults);
      const normalizedVinResults = normalizeResults(vinResults);

      // Combine and deduplicate results based on booking ID
      const combinedResults = [...normalizedNameResults, ...normalizedPhoneResults, ...normalizedVinResults];
      const uniqueBookings = Array.from(
        new Map(combinedResults.map((booking) => [booking.id, booking])).values()
      );

      setBookings(uniqueBookings);
      if (uniqueBookings.length === 0) {
        message.info('No bookings found for the search term');
      }
    } catch (error) {
      message.error('Search failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const columns = [
    {
      title: 'Name',
      dataIndex: 'buyerName',
      key: 'BuyerName',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Phone',
      dataIndex: 'buyerPhone',
      key: 'BuyerPhone',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Car VIN',
      key: 'carVin',
      render: (_: any, record: Booking) => <span>{record.car?.vin || '-'}</span>,
    },
    {
      title: 'Advance Amount',
      dataIndex: 'advanceAmount',
      key: 'AdvanceAmount',
      render: (text: number) => <span>₹ {text.toLocaleString()}</span>,
    },
    {
      title: 'Total Amount',
      dataIndex: 'totalAmount',
      key: 'TotalAmount',
      render: (text: number) => <span>₹ {text.toLocaleString()}</span>,
    },
    {
      title: 'Booking Date',
      dataIndex: 'bookingDate',
      key: 'BookingDate',
      render: (text: string) => <span>{new Date(text).toLocaleDateString()}</span>,
    },
    {
      title: 'Payment Completion Date',
      dataIndex: 'paymentCompletionDate',
      key: 'PaymentCompletionDate',
      render: (text: string) => <span>{text ? new Date(text).toLocaleDateString() : '-'}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag
          color={
            status === 'Completed' ? 'green' :
              status === 'Booked' ? 'blue' :
              status === 'Cancelled' ? 'red' :
              'default'
          }
        >
          {status}
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

  const dataSource = bookings.map((booking) => ({
    ...booking,
    key: booking.id.toString(),
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
        title="Booking List"
        className="mt-6"
        glassmorphism={true}
        header={
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px', // Adds spacing between elements
              flexWrap: 'wrap', // Ensures responsiveness on smaller screens
              padding: '8px 0', // Adds vertical padding for better spacing
            }}
          >
            <Input.Search
              placeholder="Search by VIN, Name, or Phone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300, maxWidth: '100%' }} // Ensures search bar doesn't overflow
              allowClear
            />
            <BookingCreateForm onBookingCreated={fetchBookings} />

          </div>
        }
      >
        <ConfigProvider theme={tableTheme}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
          />
        </ConfigProvider>
      </Card>
    </div>
  );
};

export default BookingTable;