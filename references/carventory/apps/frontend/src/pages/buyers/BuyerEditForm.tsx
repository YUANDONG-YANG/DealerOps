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
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Trash2Icon, Upload as UploadIcon, XIcon } from 'lucide-react';
import { buyersService } from '../../services/api';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';

const { Title } = Typography;

interface BuyerEdiFormProps {
  onBuyerEdited?: (buyerId: string) => void;
}

interface Buyer {
  buyerId: number;
  carId: number;
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
  image?: string;
  rcDocument?: string;
  insuranceDocument?: string;
  pucDocument?: string;
  carCreatedAt: string;
  carDeleteFlag: boolean;
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
  buyerCreatedAt: string;
  buyerDeleteFlag: boolean;
}

const BuyerEditForm: React.FC<BuyerEdiFormProps> = ({ onBuyerEdited }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [buyer, setBuyer] = useState<any>({});
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBuyerDetails(id);
    }
  }, [id]);

  const fetchBuyerDetails = async (buyerId: string) => {
    try {
      const response = await buyersService.getById(buyerId);
      if (!response.data) {
        throw new Error('Invalid buyer data received');
      }

      const buyerData: Buyer = {
        ...response.data,
        buyerId: parseInt(buyerId),
        purchaseDate: response.data.purchaseDate || null,
        status: response.data.status || 'Unknown',
        carCreatedAt: response.data.carCreatedAt || new Date().toISOString(),
        buyerCreatedAt: response.data.buyerCreatedAt || new Date().toISOString(),
        photo: response.data.photo
          ? `data:image/jpeg;base64,${response.data.photo}`
          : undefined,
        image: response.data.image
          ? `data:image/jpeg;base64,${response.data.image}`
          : undefined,
        aadharCard: response.data.aadharCard
          ? `data:application/pdf;base64,${response.data.aadharCard}`
          : undefined,
        panCard: response.data.panCard
          ? `data:application/pdf;base64,${response.data.panCard}`
          : undefined,
        addressProof: response.data.addressProof
          ? `data:application/pdf;base64,${response.data.addressProof}`
          : undefined,
        rcDocument: response.data.rcDocument
          ? `data:application/pdf;base64,${response.data.rcDocument}`
          : undefined,
        insuranceDocument: response.data.insuranceDocument
          ? `data:application/pdf;base64,${response.data.insuranceDocument}`
          : undefined,
        pucDocument: response.data.pucDocument
          ? `data:application/pdf;base64,${response.data.pucDocument}`
          : undefined,
      };

      setBuyer(buyerData);
      console.log('Buyer Details', {
        photo: buyerData.photo?.substring(0, 50),
        image: buyerData.image?.substring(0, 50),
        aadharCard: buyerData.aadharCard?.substring(0, 50),
        panCard: buyerData.panCard?.substring(0, 50),
        addressProof: buyerData.addressProof?.substring(0, 50),
        rcDocument: buyerData.rcDocument?.substring(0, 50),
        insuranceDocument: buyerData.insuranceDocument?.substring(0, 50),
        pucDocument: buyerData.pucDocument?.substring(0, 50),
      });
    } catch (error: any) {
      console.error('Error in fetchBuyerDetails:', error);
      message.error('Failed to fetch buyer details: ' + (error.message || 'Unknown error'));
      setBuyer(null);
    }
  };

  const handleEdit = async (values: any) => {
    try {
      if (values.saleDate) {
        values.saleDate = values.saleDate.format('YYYY-MM-DD');
      }

      const formData = new FormData();
      for (const key in values) {
        if (values[key] !== undefined && values[key] !== null) {
          if (['photo', 'aadharCard', 'panCard', 'addressProof'].includes(key)) {
            if (values[key] instanceof File) {
              formData.append(key, values[key]);
            }
          } else {
            formData.append(key, values[key].toString());
          }
        }
      }

      if (id) {
        await buyersService.update(id, formData);
        await fetchBuyerDetails(id);
      } else {
        throw new Error('Buyer ID is undefined');
      }

      message.success('Buyer updated successfully');
      setIsModalVisible(false);
      form.resetFields();
      if (onBuyerEdited) onBuyerEdited(id);
    } catch (error) {
      message.error('Failed to update buyer');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await buyersService.delete(id);
      message.success('Buyer deleted successfully');
      navigate('/buyers');
    } catch (error) {
      message.error('Failed to delete buyer');
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
              form.setFieldsValue({
                name: buyer.name,
                email: buyer.email,
                phone: buyer.phone,
                vin: buyer.vin,
                salePrice: buyer.salePrice,
                saleDate: buyer.saleDate ? dayjs(buyer.saleDate) : null,
                notes: buyer.notes,
                address: buyer.address,
              });
              setIsModalVisible(true);
            }}
            className="text-sm sm:text-base" // Responsive button text size
          >
            Edit
          </Button>

          <Button
            danger
            icon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalVisible(true)}
            className="text-sm sm:text-base"
          >
            Delete
          </Button>
        </Space>
      </div>

      <Modal
        title="Update New Buyer"
        open={isModalVisible}
        footer={null}
        width="90%" // Responsive width
        className="max-w-3xl" // Limit max width for larger screens
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5" // Responsive grid
        >
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
            <Title level={4} className="text-lg sm:text-xl"> {/* Responsive title size */}
              Buyer Details
            </Title>
          </div>

          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter the name' }]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[{ required: false, message: 'Please enter the email' }]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter the phone number' }]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="vin"
            label="Car VIN"
            rules={[{ required: true, message: 'Please enter the car VIN' }]}
            className="col-span-1"
          >
            <TextArea
              rows={1}
              onChange={(e) => form.setFieldsValue({ vin: e.target.value.toUpperCase() })}
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="salePrice"
            label="Sale Price"
            rules={[{ required: true, message: 'Please enter the sale price' }]}
            className="col-span-1"
          >
            <InputNumber
              className="w-full"
              formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="saleDate"
            label="Sale Date"
            rules={[{ required: true, message: 'Please select the sale date' }]}
            className="col-span-1"
          >
            <DatePicker className="w-full" />
          </Form.Item>

          <Form.Item
            name="address"
            label="Address"
            rules={[{ required: true, message: 'Please enter buyer address' }]}
            className="col-span-1 sm:col-span-2" // Span 2 columns on small screens
          >
            <TextArea rows={2} className="w-full" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Notes"
            className="col-span-1 sm:col-span-2" // Span 2 columns on small screens
          >
            <TextArea rows={2} className="w-full" />
          </Form.Item>

          <Form.Item
            name="photo"
            label="Buyer Photo (Image)"
            valuePropName="file"
            getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
            className="col-span-1"
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
            >
              <Button icon={<UploadIcon size={16} />} className="text-sm sm:text-base">
                Upload Buyer Photo
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="aadharCard"
            label="Aadhar Card (PDF)"
            valuePropName="file"
            getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
            className="col-span-1"
          >
            <Upload
              beforeUpload={() => false}
              accept="application/pdf"
              listType="text"
              maxCount={1}
            >
              <Button icon={<UploadIcon size={16} />} className="text-sm sm:text-base">
                Upload Aadhar Card
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="panCard"
            label="PAN Card (PDF)"
            valuePropName="file"
            getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
            className="col-span-1"
          >
            <Upload
              beforeUpload={() => false}
              accept="application/pdf"
              listType="text"
              maxCount={1}
            >
              <Button icon={<UploadIcon size={16} />} className="text-sm sm:text-base">
                Upload PAN Card
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="addressProof"
            label="Address Proof (PDF)"
            valuePropName="file"
            getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
            className="col-span-1"
          >
            <Upload
              beforeUpload={() => false}
              accept="application/pdf"
              listType="text"
              maxCount={1}
            >
              <Button icon={<UploadIcon size={16} />} className="text-sm sm:text-base">
                Upload Address Proof
              </Button>
            </Upload>
          </Form.Item>

          <div className="col-span-1 sm:col-span-2 md:col-span-3 flex justify-end">
            <Space size={['small', 'middle']}>
              <Button
                danger
                icon={<XIcon size={16} />}
                onClick={() => setIsModalVisible(false)}
                className="text-sm sm:text-base"
              >
                Cancel
              </Button>
              <Button type="default" htmlType="submit" className="text-sm sm:text-base">
                Update Buyer
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

export default BuyerEditForm;