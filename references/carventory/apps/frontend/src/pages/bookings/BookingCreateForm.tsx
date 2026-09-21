import React, { useState } from 'react';
import {
  Button,
  Typography,
  Input,
  Space,
  Modal,
  Form,
  message,
  InputNumber,
  DatePicker,
} from 'antd';
import { bookingsService } from '../../services/api';
import { PlusIcon } from 'lucide-react';

const { Title } = Typography;

interface BookingCreateFormProps {
  onBookingCreated?: () => void;
}

const BookingCreateForm: React.FC<BookingCreateFormProps> = ({ onBookingCreated }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = async (values: any) => {
    try {
      if (values.bookingDate) {
        values.bookingDate = values.bookingDate.format('YYYY-MM-DD');
      }
      if (values.paymentCompletionDate) {
        values.paymentCompletionDate = values.paymentCompletionDate.format('YYYY-MM-DD');
      }
      await bookingsService.create(values);
      message.success('Booking created successfully');
      setIsModalVisible(false);
      form.resetFields();
      if (onBookingCreated) {
        onBookingCreated();
      }
    } catch (error) {
      message.error('Failed to create Booking');
      console.error(error);
    }
  };

  return (
    <div className="p-4 sm:p-6 mb-6"> {/* Added responsive padding */}
      <div className="mt-6">
        <Button
          icon={<PlusIcon size={16} />}
          onClick={() => setIsModalVisible(true)}
          className="text-sm sm:text-base" // Responsive button text size
        >
          Add Booking
        </Button>
      </div>
      <Modal
        title="Add New Booking"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width="90%" // Responsive width
        className="max-w-3xl" // Limit max width for larger screens
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5" // Responsive grid
        >
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
            <Title level={4} className="text-lg sm:text-xl"> {/* Responsive title size */}
              Booking Details
            </Title>
          </div>

          <Form.Item
            name="carVin"
            label="Car VIN"
            rules={[{ required: true, message: 'Please enter car VIN' }]}
            className="col-span-1"
          >
            <Input
              onChange={(e) => form.setFieldsValue({ carVin: e.target.value.toUpperCase() })}
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="buyerName"
            label="Buyer Name"
            rules={[{ required: true, message: 'Please enter buyer name' }]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="buyerPhone"
            label="Buyer Phone"
            rules={[{ required: true, message: 'Please enter buyer phone' }]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="buyerEmail"
            label="Buyer Email"
            rules={[
              { required: false, message: 'Please enter buyer email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="advanceAmount"
            label="Advance Amount"
            rules={[{ required: true, message: 'Please enter advance amount' }]}
            className="col-span-1"
          >
            <InputNumber
              className="w-full"
              formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="totalAmount"
            label="Total Amount"
            rules={[{ required: true, message: 'Please enter total amount' }]}
            className="col-span-1"
          >
            <InputNumber
              className="w-full"
              formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="bookingDate"
            label="Booking Date"
            rules={[{ required: true, message: 'Please select booking date' }]}
            className="col-span-1"
          >
            <DatePicker
              className="w-full"
              format="YYYY-MM-DD"
              placeholder="Select booking date"
            />
          </Form.Item>

          <Form.Item
            name="paymentCompletionDate"
            label="Payment Completion Date"
            rules={[{ required: true, message: 'Please select payment completion date' }]}
            className="col-span-1"
          >
            <DatePicker
              className="w-full"
              format="YYYY-MM-DD"
              placeholder="Select payment completion date"
            />
          </Form.Item>

          <div className="col-span-1 sm:col-span-2 md:col-span-3 flex justify-end">
            <Space size={['small', 'middle']}> {/* Responsive button spacing */}
              <Button
                onClick={() => setIsModalVisible(false)}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                className="text-sm sm:text-base"
              >
                Create Booking
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default BookingCreateForm;