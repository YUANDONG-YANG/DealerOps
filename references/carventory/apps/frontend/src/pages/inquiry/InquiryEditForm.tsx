import React, { useEffect, useState } from 'react';
import {
  Button,
  Typography,
  Space,
  Modal,
  Form,
  message,
  InputNumber,
  DatePicker,
  Upload,
  Input,
  Select,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Trash2Icon, Upload as UploadIcon, XIcon } from 'lucide-react';
import { inquiriesService } from '../../services/api';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';

const { Title } = Typography;

interface InquiryEdiFormProps {
  onInquiryEdited?: (inquiryId: string) => void;
}

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
  fuelType: string;
  transmission: string;
  condition: string;
  color: string;
  status: string;
  imageUrl: string | null;
  rcDocument: string | null;
  insuranceDocument: string | null;
  pucDocument: string | null;
  createdAt: string;
  deleteFlag: boolean;
}

interface Inquiry {
  id: number;
  car: Car | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerRequiredCar: string;
  fuelType: string;
  budget: number;
  inquiryDate: string | null;
  message: string;
  inquiryStatus: string;
  createdAt: string | null;
  deleteFlag: boolean;
}

const InquiryEditForm: React.FC<InquiryEdiFormProps> = ({ onInquiryEdited }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [Inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchInquiryDetails(id);
    }
  }, [id]);

  const fetchInquiryDetails = async (InquiryId: string) => {
    try {
      setLoading(true);
      const response = await inquiriesService.getById(InquiryId);
      setInquiry(response.data);
      console.log("Inquiry Details", response.data);
    } catch (error) {
      message.error('Failed to fetch Inquiry details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (values: any) => {
    try {
      if (values.inquiryDate) {
        values.inquiryDate = values.inquiryDate.format('YYYY-MM-DD');
      }

      if (id) {
        await inquiriesService.update(id, values);
        await fetchInquiryDetails(id);
        if (onInquiryEdited) onInquiryEdited(id);
      } else {
        throw new Error('Inquiry ID is undefined');
      }

      message.success('Inquiry updated successfully');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to update inquiry');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await inquiriesService.delete(id);
      message.success('Inquiry deleted successfully');
      navigate('/inquiries');
    } catch (error) {
      message.error('Failed to delete inquiry');
      console.error(error);
    }
  };

  return (
    <div className="p-4 sm:p-6"> {/* Added responsive padding */}
      <div className="flex justify-end mb-4">
        <Space size={['small', 'middle']}> {/* Responsive button spacing */}
          <Button
            icon={<Edit size={16} />}
            onClick={() => {
              if (Inquiry) {
                form.setFieldsValue({
                  ...Inquiry,
                  inquiryDate: Inquiry.inquiryDate ? dayjs(Inquiry.inquiryDate) : null,
                });
              }
              setIsModalVisible(true);
            }}
            disabled={loading || !Inquiry}
            className="text-sm sm:text-base" // Responsive button text size
          >
            Edit
          </Button>
          <Button
            danger
            icon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalVisible(true)}
            disabled={loading || !Inquiry}
            className="text-sm sm:text-base"
          >
            Delete
          </Button>
        </Space>
      </div>
      <Modal
        title="Update Inquiry"
        open={isModalVisible}
        footer={null}
        width="90%" // Responsive width
        className="max-w-3xl" // Limit max width for larger screens
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5" // Responsive grid
          initialValues={{
            name: Inquiry?.name,
            email: Inquiry?.email,
            phone: Inquiry?.phone,
            address: Inquiry?.address,
            customerRequiredCar: Inquiry?.customerRequiredCar,
            fuelType: Inquiry?.fuelType,
            budget: Inquiry?.budget,
            inquiryDate: Inquiry?.inquiryDate ? dayjs(Inquiry.inquiryDate) : null,
            message: Inquiry?.message,
            inquiryStatus: Inquiry?.inquiryStatus,
            carVin: Inquiry?.car?.vin,
          }}
        >
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
            <Title level={4} className="text-lg sm:text-xl"> {/* Responsive title size */}
              Inquiry Details
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
              <Select.Option value="Petrol">Petrol</Select.Option>
              <Select.Option value="Diesel">Diesel</Select.Option>
              <Select.Option value="Electric">Electric</Select.Option>
              <Select.Option value="Hybrid">Hybrid</Select.Option>
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

          <Form.Item
            name="inquiryStatus"
            label="Inquiry Status"
            rules={[{ required: false, message: 'Please select inquiry status' }]}
            className="col-span-1"
          >
            <Select className="w-full">
              <Select.Option value="Pending">Pending</Select.Option>
              <Select.Option value="Completed">Completed</Select.Option>
            </Select>
          </Form.Item>

          <div className="col-span-1 sm:col-span-2 md:col-span-3 flex justify-end">
            <Space size={['small', 'middle']}> {/* Responsive button spacing */}
              <Button
                danger
                icon={<XIcon size={16} />}
                onClick={() => {
                  setIsModalVisible(false);
                  form.resetFields();
                }}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button
                htmlType="submit"
                className="text-sm sm:text-base"
              >
                Update Inquiry
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Confirmation"
        open={isDeleteModalVisible}
        footer={null}
        width="90%" // Responsive width
        className="max-w-md" // Limit max width
        onCancel={() => setIsDeleteModalVisible(false)}
      >
        <p className="text-sm sm:text-base"> {/* Responsive text size */}
          Are you sure you want to delete this Inquiry?
        </p>
        <div className="mt-6 flex justify-end">
          <Button
            danger
            icon={<Trash2Icon size={16} />}
            onClick={handleDelete}
            className="text-sm sm:text-base"
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default InquiryEditForm;