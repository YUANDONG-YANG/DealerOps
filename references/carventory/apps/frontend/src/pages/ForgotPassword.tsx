import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, notification } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { Car } from 'lucide-react';
import { useTheme } from '../components/layout/ThemeContext'; // Import the theme context
import Card from '../components/ui/Card';

const { Title } = Typography;

interface ForgotPasswordFormValues {
  email: string;
}

const ForgotPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const onFinish = async (values: ForgotPasswordFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.forgotPassword(values.email);

      notification.success({
        message: 'Reset Link Sent',
        description: 'A password reset link has been sent to your email.',
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}
    >
      <Card
        title='Forgot Password'
        style={{
          width: 450,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
          borderColor: theme === 'dark' ? '#303030' : '#e5e5e5',
        }}
      >
        <div className="flex flex-col items-center mb-6">
          <div
            className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
              }`}
          >
            <Car
              size={32}
              className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}
            />
          </div>
          <Title
            level={2}
            style={{
              margin: 0,
              color: theme === 'dark' ? '#ffffff' : '#000000',
            }}
          >
            Carventory
          </Title>
          <p
            className={theme === 'dark' ? 'text-gray-300 mt-1' : 'text-gray-500 mt-1'}
          >
            Admin Dashboard
          </p>
        </div>

        {error && <Alert message={error} type="error" showIcon className="mb-4" />}

        <Form
          name="forgot-password"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
  name="email"
  rules={[
    { required: true, message: 'Please input your email!' },
    { type: 'email', message: 'Please enter a valid email!' }
  ]}
>
  <Input
    placeholder="Email"
    size="large"
    className={theme === 'dark' ? 'ant-input-dark' : ''}
    style={{
      backgroundColor: theme === 'dark' ? '#2f2f2f' : '#ffffff',
      borderColor: theme === 'dark' ? '#444' : '#d9d9d9',
      color: theme === 'dark' ? '#ffffff' : '#000000',
    }}
  />
</Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className={`mt-4 ${
                theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : ''
              }`}
            >
              Send Reset Link
            </Button>
          </Form.Item>

          <Form.Item>
            <Button
              type="link"
              onClick={() => navigate('/login')}
              block
            >
              Back to Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default ForgotPassword;