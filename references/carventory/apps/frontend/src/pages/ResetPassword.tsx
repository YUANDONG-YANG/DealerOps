import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, notification } from 'antd';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/api';
import { Car } from 'lucide-react';

const { Title } = Typography;

interface ResetPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}

const ResetPassword: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const onFinish = async (values: ResetPasswordFormValues) => {
    if (!token) {
      setError('Invalid or missing token');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await authService.resetPassword(token, values.newPassword, values.confirmPassword);

      notification.success({
        message: 'Password Reset Successful',
        description: 'Your password has been updated. Please login.',
      });
      navigate('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card style={{ width: 400, boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }}>
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
            <Car size={32} className="text-blue-600" />
          </div>
          <Title level={2} style={{ margin: 0 }}>Carventory</Title>
          <p className="text-gray-500 mt-1">Reset Password</p>
        </div>

        {error && <Alert message={error} type="error" showIcon className="mb-4" />}

        <Form
          name="reset-password"
          onFinish={onFinish}
          layout="vertical"
        >
          <Form.Item
            name="newPassword"
            rules={[{ required: true, message: 'Please input your new password!' }, { min: 8, message: 'Password must be at least 8 characters!' }]}
          >
            <Input.Password placeholder="New Password" size="large" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            rules={[{ required: true, message: 'Please confirm your password!' }, ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('Passwords do not match!'));
              },
            })]}
          >
            <Input.Password placeholder="Confirm Password" size="large" />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className="mt-4"
            >
              Reset Password
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

export default ResetPassword;