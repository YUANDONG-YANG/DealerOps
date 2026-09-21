import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Form,
  Input,
  Typography,
  Alert,
  Spin,
  Space,
  message,
} from 'antd';
import { UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { authService } from '../services/api';
import { getToken } from '../services/auth';
import { Car } from 'lucide-react';
import Card from '../components/ui/Card';
import { useTheme } from '../components/layout/ThemeContext';

const { Title, Text } = Typography;

interface UserFormValues {
  ownerName: string;
  email: string;
  password: string;
  reEnterPassword: string;
  companyPhone: string;
  companyMobile: string;
}

const CreateUser: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate('/login');
    } else {
      setLoading(false);
    }
  }, [navigate]);

  const onFinish = async (values: UserFormValues) => {
    setStatus('loading');
    setErrorMessage('');

    try {
      const userData = {
        ownerName: values.ownerName,
        email: values.email,
        password: values.password,
        reEnterPassword: values.reEnterPassword,
        companyPhone: values.companyPhone,
        companyMobile: values.companyMobile,
      };

      console.log('Creating user with data:', userData);
      const response = await authService.createUser(userData);
      console.log('Create user response:', response);
      setStatus('success');
      form.resetFields();
      message.success('User created successfully! A verification email has been sent.');
    } catch (err: any) {
      console.error('Create user error:', err);
      setStatus('error');
      setErrorMessage(err.response?.data || 'Failed to create user. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spin size="small" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center py-4 px-4 sm:px-6 h-auto ${
        theme === 'dark' ? 'bg-[#000000]' : 'bg-gray-50'
      }`} // Responsive padding
    >
      <Card
        title="Create Employee"
        className={`w-full max-w-lg sm:max-w-xl md:max-w-2xl ${ // Responsive width
          theme === 'dark' ? 'bg-[#1f1f1f] border-[#303030]' : 'bg-white border-gray-200'
        } shadow-md`} // Tailwind classes for background, border, and shadow
      >
        <div className="text-center mb-4">
          <div className="flex justify-center mb-1">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
              }`} // Responsive icon size and theme
            >
              <Car size={40}/> {/* Responsive icon size */}
            </div>
          </div>
          <Title
            level={5}
            className={`text-lg sm:text-xl mb-4 ${
              theme === 'dark' ? 'text-white' : 'text-gray-900'
            }`} // Responsive title size and theme
          >
            Carventory
          </Title>
        </div>

        {status === 'error' && (
          <Alert message={errorMessage} type="error" showIcon className="mb-4 rounded" />
        )}

        {status === 'success' && (
          <Alert
            message="User created successfully! A verification email has been sent."
            type="success"
            showIcon
            className="mb-4 rounded"
          />
        )}

        <Form
          form={form}
          name="create_user"
          onFinish={onFinish}
          layout="vertical"
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4" // Responsive grid and gap
        >
          <div className="col-span-1 sm:col-span-2">
            <Title
              level={5}
              className={`text-base sm:text-lg mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`} // Responsive title size and theme
            >
              Employee Details
            </Title>
          </div>

          {/* Row 1 */}
          <Form.Item
            name="ownerName"
            label="Full Name"
            rules={[{ required: true, message: 'Enter full name' }]}
            className="col-span-1"
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Full name"
              size="middle"
              className="rounded w-full" // Ensure full width
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Enter email' },
              { type: 'email', message: 'Invalid email' },
            ]}
            className="col-span-1"
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Email"
              size="middle"
              className="rounded w-full"
            />
          </Form.Item>

          {/* Row 2 */}
          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Enter password' }]}
            className="col-span-1"
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="middle"
              className="rounded w-full"
            />
          </Form.Item>

          <Form.Item
            name="reEnterPassword"
            label="Confirm Password"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Confirm password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
            className="col-span-1"
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm password"
              size="middle"
              className="rounded w-full"
            />
          </Form.Item>

          {/* Row 3 */}
          <Form.Item
            name="companyPhone"
            label="Phone"
            rules={[{ required: true, message: 'Enter phone number' }]}
            className="col-span-1"
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Phone number"
              size="middle"
              className="rounded w-full"
            />
          </Form.Item>

          <Form.Item
            name="companyMobile"
            label="Mobile"
            rules={[{ required: true, message: 'Enter mobile number' }]}
            className="col-span-1"
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Mobile number"
              size="middle"
              className="rounded w-full"
            />
          </Form.Item>

          <div className="col-span-1 sm:col-span-2 flex justify-end">
            <Space size={['small', 'middle']}> {/* Responsive button spacing */}
              <Button
                onClick={() => navigate('/employee')}
                size="middle"
                className={`rounded text-sm sm:text-base ${
                  theme === 'dark' ? 'text-white border-gray-600' : 'text-gray-900 border-gray-300'
                }`} // Theme-aware button styling
              >
                Cancel
              </Button>
              <Button
                htmlType="submit"
                size="middle"
                loading={status === 'loading'}
                className={`rounded text-sm sm:text-base ${
                  theme === 'dark'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`} // Fixed button styling with theme support
              >
                Create User
              </Button>
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CreateUser;