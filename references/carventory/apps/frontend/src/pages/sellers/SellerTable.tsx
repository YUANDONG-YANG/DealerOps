import React, { useEffect, useState } from 'react';
import { Table, Spin, ConfigProvider, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal } from 'lucide-react';
import { Button, Dropdown, message } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/Card';
import { sellersService } from '../../services/api';

interface Seller {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  cars: {
    make: string;
    model: string;
    vin: string;
  };
}

const SellerTable: React.FC = () => {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    fetchSellers();
  }, []);

  const sanitizePhoneNumber = (phone: string): string => {
    // Remove spaces, dashes, parentheses, and other non-digit characters
    return phone.replace(/[\s\-\(\)+]/g, '');
  };

  const fetchSellers = async (query?: string) => {
    try {
      setLoading(true);
      let sellersData: Seller[] = [];
      let totalElements = 0;

      if (query) {
        // Sanitize phone number for getByPhone API
        const sanitizedQuery = sanitizePhoneNumber(query);

        // Perform searches across all APIs concurrently
        const [vinResponse, phoneResponse, nameResponse, makeModelResponse] = await Promise.all([
          sellersService.getByVin(query).catch((error) => {
            console.error('getByVin error:', error);
            return { data: null };
          }),
          sellersService.getByPhone(sanitizedQuery).catch((error) => {
            console.error('getByPhone error:', error);
            return { data: [] };
          }),
          sellersService.getByName(query).catch((error) => {
            console.error('getByName error:', error);
            return { data: [] };
          }),
          sellersService.getByCarMakeOrModel(query).catch((error) => {
            console.error('getByCarMakeOrModel error:', error);
            return { data: [] };
          }),
        ]);

        // Collect results from all APIs
        if (vinResponse.data) {
          console.log('getByVin response:', vinResponse.data);
          if (vinResponse.data.id) sellersData.push(vinResponse.data);
        }
        if (phoneResponse.data && Array.isArray(phoneResponse.data)) {
          console.log('getByPhone response:', phoneResponse.data);
          sellersData = [...sellersData, ...phoneResponse.data.filter(seller => seller && seller.id)];
        }
        if (nameResponse.data && Array.isArray(nameResponse.data)) {
          console.log('getByName response:', nameResponse.data);
          sellersData = [...sellersData, ...nameResponse.data.filter(seller => seller && seller.id)];
        }
        if (makeModelResponse.data && Array.isArray(makeModelResponse.data)) {
          console.log('getByCarMakeOrModel response:', makeModelResponse.data);
          sellersData = [...sellersData, ...makeModelResponse.data.filter(seller => seller && seller.id)];
        }

        // Remove duplicates based on seller ID and validate data
        const uniqueSellers = Array.from(
          new Map(
            sellersData
              .filter(seller => seller && typeof seller.id === 'number' && seller.cars) // Strict validation
              .map(seller => [seller.id, seller])
          ).values()
        );

        sellersData = uniqueSellers;
        totalElements = uniqueSellers.length;
      } else {
        const response = await sellersService.getAll();
        console.log('getAll response:', response.data);
        sellersData = response.data?.filter((seller: { id: any; cars: any; }) => seller && typeof seller.id === 'number' && seller.cars) || [];
        totalElements = sellersData.length;
      }

      // Map sellers to include car details and unique key
      setSellers(
        sellersData.map((seller, index) => {
          console.log(`Mapping seller at index ${index}:`, seller); // Debug each seller
          return {
            ...seller,
            carVin: seller.cars?.vin || '',
            carMake: seller.cars?.make || '',
            carModel: seller.cars?.model || '',
            key: seller.id.toString(),
          };
        })
      );
      setTotal(totalElements);
    } catch (error) {
      message.error('Failed to fetch sellers');
      console.error('fetchSellers error:', error);
      setSellers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      fetchSellers(value.trim());
    } else {
      fetchSellers(); // Reset to all sellers when search is cleared
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
      dataIndex: 'carVin',
      key: 'carVin',
    },
    {
      title: 'Car Make',
      dataIndex: 'carMake',
      key: 'carMake',
    },
    {
      title: 'Car Model',
      dataIndex: 'carModel',
      key: 'carModel',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Seller) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <Eye size={14} />,
                onClick: () => navigate(`/cars/${record.id}`),
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
        activeBorderColor: theme === 'dark' ? '#66B2FF' : '#2A4759',
        hoverBorderColor: theme === 'dark' ? '#5D9CEC' : '#1C2731',
      },
    },
  };

  const dataSource = sellers.map((seller) => ({
    ...seller,
    key: seller.id.toString(),
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
        title="Sellers List"
        className="mt-6"
        glassmorphism={true}
        header={
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '8px 0',
              flexWrap: 'wrap',
            }}
          >
            <Input.Search
              placeholder="Search by VIN, Phone, Name, or Make/Model"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300, maxWidth: '100%' }}
              allowClear
            />
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

export default SellerTable;