import React, { useEffect, useState, useCallback } from 'react';
import { Table, Spin, ConfigProvider, Input, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Download, Eye, MoreHorizontal } from 'lucide-react';
import { Dropdown, message } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/CardTable';
import { buyersService } from '../../services/api';
import dayjs from 'dayjs';
import BuyerCreateForm from './BuyerCreateForm';

interface Buyer {
  id: number;
  car: {
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
    fuelType: string;
    transmission: string;
    condition: string;
    color: string;
    status: string;
  };
  name: string;
  phone: string;
  email: string;
  salePrice: number;
  saleDate: string;
  notes: string;
  address: string;
  photo?: string;
  aadharCard?: string;
  panCard?: string;
  addressProof?: string;
}

const BuyersTable: React.FC = () => {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    fetchBuyers();
  }, []);

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const response = await buyersService.getAll();
      setBuyers(response.data || []);
    } catch (error) {
      message.error('Failed to fetch buyers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (value: string) => {
    if (!value.trim()) {
      fetchBuyers();
      return;
    }

    setLoading(true);
    try {
      // Execute all search APIs concurrently
      const [phoneResults, nameResults, vinResults, makeModelResults] = await Promise.all([
        buyersService.getByPhone(value).catch(() => []),
        buyersService.getByName(value).catch(() => []),
        buyersService.getByVin(value.trim().toUpperCase()).catch((error) => {
          console.error('VIN search failed:', error);
          return [];
        }),
        buyersService.findByCarMakeOrModel(value).catch(() => []),
      ]);

      // Ensure vinResults is an array
      const normalizedVinResults = Array.isArray(vinResults)
        ? vinResults
        : vinResults && typeof vinResults === 'object' && vinResults.id
          ? [vinResults]
          : [];

      // Combine and deduplicate results based on buyer ID
      const combinedResults = [
        ...phoneResults,
        ...nameResults,
        ...normalizedVinResults,
        ...makeModelResults,
      ];
      const uniqueBuyers = Array.from(
        new Map(combinedResults.map((buyer: Buyer) => [buyer.id, buyer])).values()
      );

      setBuyers(uniqueBuyers);
      if (uniqueBuyers.length === 0) {
        message.info('No buyers found for the search term');
      }
    } catch (error) {
      message.error('Search failed. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDownloadBill = async (buyerId: string, buyerName: string, carVin: string) => {
    try {
      const response = await buyersService.downloadInvoice(buyerId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const sanitizedBuyerName = buyerName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${sanitizedBuyerName}_${carVin}.pdf`;

      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Invoice downloaded successfully');
    } catch (error) {
      message.error('Failed to download invoice');
      console.error(error);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Car VIN',
      dataIndex: ['car', 'vin'],
      key: 'carVin',
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      key: 'salePrice',
      render: (price: number) => `₹${price.toLocaleString()}`,
    },
    {
      title: 'Sale Date',
      dataIndex: 'saleDate',
      key: 'saleDate',
      render: (date: string) => (date ? dayjs(date).format('MMM D, YYYY') : '-'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Buyer) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <Eye size={14} />,
                onClick: () => navigate(`/buyers/${record.id}`),
              },
              {
                key: 'downloadBill',
                label: 'Download Bill',
                icon: <Download size={14} />,
                onClick: () => handleDownloadBill(record.id.toString(), record.name, record.car.vin),
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

  const dataSource = buyers.map((buyer) => ({
    ...buyer,
    key: buyer.id.toString(),
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
              placeholder="Search by VIN, Phone, Name, or Make/Model"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300, maxWidth: '100%' }} // Ensures search bar doesn't overflow
              allowClear
            />
            <BuyerCreateForm onBuyerCreated={fetchBuyers} />

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

export default BuyersTable;