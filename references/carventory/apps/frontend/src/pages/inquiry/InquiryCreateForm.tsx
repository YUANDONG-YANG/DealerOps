import React, { useState } from 'react';
import {
  Button,
  Typography,
  Input,
  Space,
  Modal,
  Form,
  message,
  Select,
  InputNumber,
  DatePicker,
} from 'antd';
import { inquiriesService } from '../../services/api';
import { PlusIcon } from 'lucide-react';

const { Title } = Typography;
const { Option } = Select;

interface InquiryCreateFormProps {
  onInquiryCreated?: () => void;
}

const InquiryCreateForm: React.FC<InquiryCreateFormProps> = ({ onInquiryCreated }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();

  const handleCreate = async (values: any) => {
    try {
      if (values.inquiryDate) {
        values.inquiryDate = values.inquiryDate.format('YYYY-MM-DD');
      }
      await inquiriesService.create(values);
      message.success('Inquiry created successfully');
      setIsModalVisible(false);
      form.resetFields();
      if (onInquiryCreated) {
        onInquiryCreated();
      }
    } catch (error) {
      message.error('Failed to create inquiry');
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
          Add Inquiry
        </Button>
      </div>
      <Modal
        title="Add New Inquiry"
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
              Car Inquiry
            </Title>
          </div>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter name' }]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter phone' }]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: false, message: 'Please enter email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: 'Please enter address' }]}
            className="col-span-1 sm:col-span-2" // Span 2 columns on small screens
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="carVin"
            label="Car VIN"
            rules={[
              {
                validator: async (_, value) => {
                  const requiredCar = form.getFieldValue('customerRequiredCar');
                  if (!value && !requiredCar) {
                    return Promise.reject('Car VIN or Required Car must be filled');
                  }
                  return Promise.resolve();
                },
              },
            ]}
            className="col-span-1"
          >
            <Input
              onChange={(e) => form.setFieldsValue({ carVin: e.target.value.toUpperCase() })}
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="customerRequiredCar"
            label="Required Car"
            rules={[
              {
                validator: async (_, value) => {
                  const carVin = form.getFieldValue('carVin');
                  if (!value && !carVin) {
                    return Promise.reject('Required Car or Car VIN must be filled');
                  }
                  return Promise.resolve();
                },
              },
            ]}
            className="col-span-1"
          >
            <Input className="w-full" />
          </Form.Item>

          <Form.Item
            name="fuelType"
            label="Fuel Type"
            rules={[{ required: true, message: 'Please select fuel type' }]}
            className="col-span-1"
          >
            <Select className="w-full">
              <Option value="Petrol">Petrol</Option>
              <Option value="Diesel">Diesel</Option>
              <Option value="Electric">Electric</Option>
              <Option value="Hybrid">Hybrid</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="budget"
            label="Budget"
            rules={[{ required: true, message: 'Please enter budget' }]}
            className="col-span-1"
          >
            <InputNumber
              className="w-full"
              formatter={(value) => `₹ ${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/₹\s?|(,*)/g, '') || ''}
            />
          </Form.Item>

          <Form.Item
            name="inquiryDate"
            label="Inquiry Date"
            rules={[{ required: true, message: 'Please select inquiry date' }]}
            className="col-span-1"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="message"
            label="Message"
            rules={[{ required: false, message: 'Please enter message' }]}
            className="col-span-1 sm:col-span-2 md:col-span-3" // Span full width on larger screens
          >
            <Input.TextArea rows={4} className="w-full" />
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
                Create Inquiry
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default InquiryCreateForm;