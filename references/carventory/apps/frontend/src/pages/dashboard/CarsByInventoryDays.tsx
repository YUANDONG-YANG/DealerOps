import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Table, ConfigProvider, Spin } from 'antd';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { useTheme } from '../../components/layout/ThemeContext';
import { accountsService } from '../../services/api';

interface CarInventory {
  id:number; // Assuming each car has a unique ID
  carName: string;
  year: number;
  vin: string;
  salePrice: number;
  daysInInventory: number;
  key: string; // For Ant Design Table
}

const CarsByInventoryDays: React.FC = () => {
  const { theme } = useTheme();
  const [cars, setCars] = useState<CarInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCarData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await accountsService.getCarsByPurchaseDate();

        // Map to required fields, including vin, and add unique key
        setCars(
          response.map((car: any, index: number) => ({
            id: car.id, // Assuming the API returns an id for each car
            carName: car.carName,
            year: car.year,
            vin: car.vin,
            salePrice: car.salePrice,
            daysInInventory: car.daysInInventory,
            key: `inventory-${car.vin}-${index}`, // Use vin for uniqueness
          }))
        );
      } catch (err: any) {
        setError(err.message || 'Failed to fetch car inventory data');
        console.error('Error fetching car inventory data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCarData();
  }, []);

  const columns = [
    {
      title: 'Car Name',
      dataIndex: 'carName',
      key: 'carName',
      render: (text: string) => <span className="font-medium">{text}</span>,
    },
    {
      title: 'Year',
      dataIndex: 'year',
      key: 'year',
      render: (text: number) => <span>{text}</span>,
    },
    {
      title: 'VIN',
      dataIndex: 'vin',
      key: 'vin',
      render: (text: string) => <span className="font-mono">{text}</span>,
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      key: 'salePrice',
      render: (text: number) => <span>₹{Number(text).toLocaleString()}</span>,
    },
    {
      title: 'Days in Inventory',
      dataIndex: 'daysInInventory',
      key: 'daysInInventory',
      render: (text: number) => <span>{text} days</span>,
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
    },
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-80">
        <Spin size="large" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Error: {error}</div>;
  }

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card title="Cars by Days in Inventory" glassmorphism>
        <ConfigProvider theme={tableTheme}>
          <Table
            columns={columns}
            dataSource={cars}
            pagination={{
              pageSize: 3,
              showSizeChanger: false,
              position: ['bottomCenter'],
              className: 'mt-4',
            }}
            rowKey="key"
            onRow={(record) => ({
              onClick: () => navigate(`/cars/${encodeURIComponent(record.id)}`),
              className: 'cursor-pointer',
            })}
            scroll={{ x: 'max-content' }}
          />
        </ConfigProvider>
      </Card>
    </motion.div>
  );
};

export default CarsByInventoryDays;