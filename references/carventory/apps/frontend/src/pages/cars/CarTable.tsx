import React, { useEffect, useState } from 'react';
import { Table, Spin, ConfigProvider, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { DownloadIcon, Eye, MoreHorizontal } from 'lucide-react';
import { Button, Dropdown, message, Tag } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/CardTable';
import { carsService } from '../../services/api';
import CarCreateForm from './CarCreateForm';

interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  price: number;
  status: string;
  seller: {
    id: number;
    name: string;
    email: string;
  };
  condition: string;
  fuelType: string;
  transmission: string;
  color: string;
}

const CarTable: React.FC = () => {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { theme } = useTheme();

  useEffect(() => {
    fetchCars();
  }, []);

  const fetchCars = async (query?: string) => {
    try {
      setLoading(true);
      let carsData: Car[] = [];

      if (query) {
        // Perform both VIN and make/model searches
        const [vinResponse, searchResponse] = await Promise.all([
          carsService.getByVin(query).catch(() => ({ data: null })),
          carsService.search(query).catch(() => ({ data: [] })),
        ]);

        // Collect VIN results (single car or none)
        if (vinResponse.data) {
          carsData.push(vinResponse.data);
        }

        // Collect make/model search results
        if (searchResponse.data) {
          carsData = [...carsData, ...searchResponse.data];
        }

        // Remove duplicates based on car ID
        const uniqueCars = Array.from(
          new Map(carsData.map(car => [car.id, car])).values()
        );

        setCars(uniqueCars);
      } else {
        const response = await carsService.getAll();
        setCars(response.data || []);
      }
    } catch (error) {
      message.error('Failed to fetch cars');
      console.error(error);
      setCars([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
      fetchCars(value.trim());
    } else {
      fetchCars(); // Reset to all cars when search is cleared
    }
  };

  const handleDownloadBill = async (carId: string, carName: string, carVin: string) => {
    try {
      const response = await carsService.getDetailsPdf(carId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      const sanitizedCarName = carName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${sanitizedCarName}_${carVin}.pdf`;

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
      title: 'Company & Model',
      key: 'makeModel',
      render: (_: any, record: Car) => `${record.make} ${record.model}`,
    },
    {
      title: 'VIN',
      dataIndex: 'vin',
      key: 'vin',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
    },
    {
      title: 'Sale Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => `₹${price.toLocaleString()}`,
    },
    {
      title: 'Fuel Type',
      dataIndex: 'fuelType',
      key: 'fuelType',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <Tag
          color={
            text === 'Booked'
              ? 'orange'
              : text === 'Available'
                ? 'green'
                : text === 'Sold'
                  ? 'blue'
                  : text === 'Maintenance'
                    ? 'red'
                    : 'default'
          }
        >
          {text}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Car) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                label: 'View Details',
                icon: <Eye size={14} />,
                onClick: () => navigate(`/cars/${record.id}`),
              },
              {
                key: 'downloadBill',
                label: 'Download Details',
                icon: <DownloadIcon size={14} />,
                onClick: () => handleDownloadBill(record.id.toString(), record.make, record.vin),
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

  const dataSource = cars.map((car) => ({
    ...car,
    key: car.id.toString(),
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
        title="Cars List"
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
              placeholder="Search by VIN or Make/Model"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onSearch={handleSearch}
              style={{ width: 300, maxWidth: '100%' }} // Ensures search bar doesn't overflow
              allowClear
            />
            <CarCreateForm onCarCreated={fetchCars} />

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

export default CarTable;