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
import { bookingsService } from '../../services/api';
import dayjs from 'dayjs';
import TextArea from 'antd/es/input/TextArea';

const { Title } = Typography;

interface BookingEdiFormProps {
  onBookingEdited?: (bookingId: string) => void;
}

interface Car {
  make: string;
  model: string;
  year: number;
  vin: string;
  engineNumber: string;
  chassisNumber: string;
  maintainAmount: number;
  maintainDetails: string;
  price: number;
  mileage: number;
  purchasePrice: number;
  purchaseDate: string;
  fuelType: string;
  transmission: string;
  condition: string;
  color: string;
  status: string;
  numberOfOwners: number;
  odometerReading: number;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  sellerAddress: string;
  image?: string;
  rcDocument?: string;
  insuranceDocument?: string;
  pucDocument?: string;
  sellerPhoto?: string;
  sellerAadharCard?: string;
  sellerPanCard?: string;
  sellerAddressProof?: string;
}

interface Booking {
  id: number;
  carVin: string;
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
  photo?: string;
  aadharCard?: string;
  panCard?: string;
  addressProof?: string;
}

const BookingEditForm: React.FC<BookingEdiFormProps> = ({ onBookingEdited }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  useEffect(() => {
    if (id) {
      fetchBookingDetails(id);
    }
  }, [id]);

  const fetchBookingDetails = async (bookingId: string) => {
    try {
      setLoading(true);
      const response = await bookingsService.getById(bookingId);
      setBooking(response.data);
      console.log('Booking Details', response.data);
    } catch (error) {
      message.error('Failed to fetch Booking details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (values: any) => {
    try {
      if (values.bookingDate) {
        values.bookingDate = values.bookingDate.format('YYYY-MM-DD');
      }
      if (values.paymentCompletionDate) {
        values.paymentCompletionDate = values.paymentCompletionDate.format('YYYY-MM-DD');
      }

      if (id) {
        await bookingsService.update(id, values);
        await fetchBookingDetails(id);
        if (onBookingEdited) onBookingEdited(id);
      } else {
        throw new Error('Booking ID is undefined');
      }

      message.success('Booking updated successfully');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Failed to update booking');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      await bookingsService.delete(id);
      message.success('Booking deleted successfully');
      navigate('/bookings');
    } catch (error) {
      message.error('Failed to delete booking');
      console.error(error);
    }
  };

  // Helper to convert file URLs to fileList for Upload component
  const createFileList = (url?: string, name?: string) => {
    if (!url) return [];
    return [
      {
        uid: '-1',
        name: name || 'file',
        status: 'done',
        url,
      },
    ];
  };

  return (
    <div className="p-4 sm:p-6"> {/* Added responsive padding */}
      <div className="flex justify-end mb-4">
        <Space size={['small', 'middle']}> {/* Responsive button spacing */}
          <Button
            icon={<Edit size={16} />}
            onClick={() => {
              if (booking) {
                form.setFieldsValue({
                  ...booking,
                  bookingDate: booking.bookingDate ? dayjs(booking.bookingDate) : null,
                  paymentCompletionDate: booking.paymentCompletionDate
                    ? dayjs(booking.paymentCompletionDate)
                    : null,
                });
              }
              setIsModalVisible(true);
            }}
            disabled={loading || !booking}
            className="text-sm sm:text-base" // Responsive button text size
          >
            Edit
          </Button>
          <Button
            danger
            icon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalVisible(true)}
            disabled={loading || !booking}
            className="text-sm sm:text-base"
          >
            Delete
          </Button>
        </Space>
      </div>
      <Modal
        title="Update Booking" // Corrected title to "Update Booking"
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
            carVin: booking?.car.vin,
            buyerName: booking?.buyerName,
            buyerPhone: booking?.buyerPhone,
            buyerEmail: booking?.buyerEmail,
            advanceAmount: booking?.advanceAmount,
            totalAmount: booking?.totalAmount,
            bookingDate: booking?.bookingDate ? dayjs(booking.bookingDate) : null,
            paymentCompletionDate: booking?.paymentCompletionDate
              ? dayjs(booking.paymentCompletionDate)
              : null,
            status: booking?.status,
          }}
        >
          <div className="col-span-1 sm:col-span-2 md:col-span-3">
            <Title level={4} className="text-lg sm:text-xl"> {/* Responsive title size */}
              Booking Details
            </Title>
          </div>

          <Form.Item
            name="buyerName"
            label="Name"
            rules={[{ required: true, message: 'Please enter the name' }]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="buyerEmail"
            label="Email"
            rules={[
              { required: false, message: 'Please enter the email' },
              { type: 'email', message: 'Please enter a valid email' },
            ]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="buyerPhone"
            label="Phone"
            rules={[{ required: true, message: 'Please enter the phone number' }]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="carVin"
            label="Car VIN"
            rules={[{ required: true, message: 'Please enter the car VIN' }]}
            className="col-span-1"
          >
            <TextArea
              rows={1}
              onChange={(e) => form.setFieldsValue({ carVin: e.target.value.toUpperCase() })}
              className="w-full"
            />
          </Form.Item>

          <Form.Item
            name="totalAmount"
            label="Total Amount" // Corrected label to "Total Amount"
            rules={[{ required: true, message: 'Please enter the total amount' }]}
            className="col-span-1"
          >
            <InputNumber
              className="w-full"
              formatter={(value) => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value!.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>

          <Form.Item
            name="advanceAmount"
            label="Advance Amount"
            rules={[{ required: true, message: 'Please enter the advance amount' }]}
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
            rules={[{ required: true, message: 'Please select the booking date' }]}
            className="col-span-1"
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="paymentCompletionDate"
            label="Payment Completion Date"
            rules={[{ required: false, message: 'Please select the payment completion date' }]} // Made optional to match original
            className="col-span-1"
          >
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            name="status"
            label="Status"
            rules={[{ required: true, message: 'Please enter the status' }]}
            className="col-span-1"
          >
            <TextArea rows={1} className="w-full" />
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
              <Button htmlType="submit" className="text-sm sm:text-base">
                Update Booking
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
          Are you sure you want to delete this Booking? {/* Corrected to "Booking" */}
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

export default BookingEditForm;