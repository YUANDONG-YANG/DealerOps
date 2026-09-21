import React, { useEffect, useState, useCallback } from 'react';
import { Table, Spin, ConfigProvider, Input, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal } from 'lucide-react';
import { Dropdown, message, Tag } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/CardTable';
import { inquiriesService } from '../../services/api';
import InquiryCreateForm from './InquiryCreateForm';

interface Car {
  carVin: string;
  model: string;
}

interface Inquiry {
  id: number;
  car: Car;
  carId: number;
  carVin: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerRequiredCar: string;
  fuelType: string;
  budget: number;
  inquiryDate: string;
  message: string;
  inquiryStatus: string;
}

const InquiryTable: React.FC = () => {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const response = await inquiriesService.getAll();
      setInquiries(response.data || []);
    } catch (error) {
      message.error('Failed to fetch inquiries');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      fetchInquiries();
      return;
    }

    setLoading(true);
    try {
      // Execute search APIs concurrently
      const [modelResults, vinResults] = await Promise.all([
        inquiriesService.getByCustomerRequiredCar(value).catch((error) => {
          console.error('Model search failed:', error);
          return [];
        }),
        inquiriesService.getInquiriesByCarVin(value.trim().toUpperCase()).catch((error) => {
          console.error('VIN search failed:', error);
          return [];
        }),
      ]);

      // Normalize results to ensure they are arrays of Inquiry objects
      const normalizeResults = (results: any): Inquiry[] => {
        if (Array.isArray(results)) {
          return results.filter((item): item is Inquiry => item && typeof item === 'object' && 'id' in item);
        }
        if (results && typeof results === 'object') {
          if ('data' in results) {
            return Array.isArray(results.data)
              ? results.data.filter((item: any): item is Inquiry => item && typeof item === 'object' && 'id' in item)
              : results.data && typeof results.data === 'object' && 'id' in results.data
              ? [results.data]
              : [];
          }
          return 'id' in results ? [results] : [];
        }
        return [];
      };

      const normalizedModelResults = normalizeResults(modelResults);
      const normalizedVinResults = normalizeResults(vinResults);

      // Combine and deduplicate results based on inquiry ID
      const combinedResults = [...normalizedModelResults, ...normalizedVinResults];
      const uniqueInquiries = Array.from(
        new Map(combinedResults.map((inquiry) => [inquiry.id, inquiry])).values()
      );

      setInquiries(uniqueInquiries);
      if (uniqueInquiries.length === 0) {
        message.info('No inquiries found for the search term');
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
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Required Car',
      dataIndex: 'customerRequiredCar',
      key: 'customerRequiredCar',
    },
    {
      title: 'Fuel Type',
      dataIndex: 'fuelType',
      key: 'fuelType',
    },
    {
      title: 'Budget',
      dataIndex: 'budget',
      key: 'budget',
    },
    {
      title: 'Status',
      dataIndex: 'inquiryStatus',
      key: 'inquiryStatus',
      render: (status: string) => (
        <Tag
          color={
            status === 'Pending' ? 'orange' : status === 'Completed' ? 'green' : 'default'
          }
        >
          {status}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Inquiry) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <Eye size={14} />,
                onClick: () => navigate(`/inquiries/${record.id}`),
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

  const dataSource = inquiries.map((inquiry) => ({
    ...inquiry,
    key: inquiry.id.toString(),
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
        title="Buyers List"
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
              placeholder="Search by VIN & Customer Required Car"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300, maxWidth: '100%' }} // Ensures search bar doesn't overflow
              allowClear
            />
            <InquiryCreateForm onInquiryCreated={fetchInquiries} />

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

export default InquiryTable;