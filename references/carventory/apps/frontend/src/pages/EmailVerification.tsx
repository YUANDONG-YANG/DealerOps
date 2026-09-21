import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Typography, Alert, Button, Spin } from 'antd';
import { authService } from '../services/api';
import { Car } from 'lucide-react';
import { useTheme } from '../components/layout/ThemeContext'; // Import the theme context
import Card from '../components/ui/Card';
const { Title, Text } = Typography;

const VerifyEmail: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');
  const hasVerified = useRef(false); // Prevent duplicate requests
  const { theme } = useTheme(); // Use theme context

  useEffect(() => {
    const verify = async () => {
      if (hasVerified.current) {
        console.log('Verification already attempted, skipping');
        return;
      }

      const token = searchParams.get('token');
      if (!token) {
        console.error('No token provided in URL');
        setStatus('error');
        setMessage('Invalid or missing verification token');
        return;
      }

      hasVerified.current = true;
      try {
        console.log('Sending verification request for token:', token);
        const response = await authService.verifyEmail(token);
        console.log('Verification response:', response);
        if (response.data === 'Email verified successfully' || response.data === 'Email already verified') {
          setStatus('success');
          setMessage('Your email has been verified! You can now log in.');
        } else {
          console.error('Unexpected response:', response.data);
          setStatus('error');
          setMessage('Unexpected response from server');
        }
      } catch (err: any) {
        console.error('Verification error:', err);
        const errorMessage =
          err.response?.status === 403
            ? 'Verification request blocked. Please try again or check if already verified.'
            : err.response?.data || 'Email verification failed. Please try again.';
        setStatus('error');
        setMessage(errorMessage);
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
        }`}
    >
      <Card
        title='Email Verification'
        style={{
          width: 450,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
          borderColor: theme === 'dark' ? '#303030' : '#e5e5e5',
        }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="flex justify-center mb-4">
            <div
              className={`flex items-center justify-center w-16 h-16 rounded-full mb-4 ${theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
                }`}
            >
              <Car
                size={32}
                className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}
              />
            </div>
          </div>
          <Title
            level={3}
            style={{
              margin: 0,
              color: theme === 'dark' ? '#ffffff' : '#000000',
            }}
          >
            Carventory
          </Title>
        </div>

        {status === 'loading' && (
          <div className="text-center">
            <Spin size="large" />
            <Text className="block mt-4">Verifying your email...</Text>
          </div>
        )}

        {status === 'success' && (
          <>
            <Alert message={message} type="success" showIcon className="mb-6 rounded" />
            <Button
              type="primary"
              size="large"
              block
              className="rounded bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Alert message={message} type="error" showIcon className="mb-6 rounded" />
            <Button
              type="primary"
              size="large"
              block
              className="rounded bg-blue-600 hover:bg-blue-700"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </>
        )}
      </Card>
    </div>
  );
};

export default VerifyEmail;