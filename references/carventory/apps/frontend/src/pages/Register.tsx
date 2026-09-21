import React, { useState } from 'react';
import { Form, Input, Button, Typography, Alert, notification, InputNumber, Collapse, Row, Col, Upload, Select } from 'antd';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import { Car, User, Mail, Lock, Home, Phone, Globe, Upload as UploadIcon } from 'lucide-react';
import { useTheme } from '../components/layout/ThemeContext';
import Card from '../components/ui/Card';

const { Title, Text } = Typography;
const { Panel } = Collapse;
const { TextArea } = Input;
const { Option } = Select;

interface RegisterFormValues {
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  yearEstablished: number;
  companyPhone: string;
  companyMobile: string;
  companyAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  companyLogo: any;
  companyImage: any;
  description: string;
  specialties: string;
  hours: string;
  website: string;
}

const Register: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [form] = Form.useForm();

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  const timeRanges = [
    'Closed',
    '8:00 AM-4:00 PM',
    '8:00 AM-5:00 PM',
    '8:00 AM-6:00 PM',
    '9:00 AM-5:00 PM',
    '9:00 AM-6:00 PM',
    '9:00 AM-7:00 PM',
    '10:00 AM-4:00 PM',
    '10:00 AM-5:00 PM',
    '10:00 AM-6:00 PM',
  ];

  const onFinish = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('ownerName', values.ownerName);
      formData.append('email', values.email);
      formData.append('password', values.password);
      formData.append('reEnterPassword', values.confirmPassword);
      formData.append('role', 'Admin');
      formData.append('companyName', values.companyName);
      formData.append('yearEstablished', values.yearEstablished.toString());
      formData.append('companyPhone', values.companyPhone);
      formData.append('companyMobile', values.companyMobile);
      formData.append('companyAddress', values.companyAddress);
      formData.append('city', values.city);
      formData.append('state', values.state);
      formData.append('postalCode', values.postalCode);
      formData.append('country', values.country);
      if (values.companyLogo?.[0]?.originFileObj) {
        formData.append('companyLogo', values.companyLogo[0].originFileObj);
      }
      if (values.companyImage?.[0]?.originFileObj) {
        formData.append('companyImage', values.companyImage[0].originFileObj);
      }
      formData.append('description', values.description);
      formData.append('specialties', values.specialties);
      formData.append('hours', values.hours);
      formData.append('website', values.website);

      const response = await authService.register(formData);

      if (response.data === 'Verification email sent successfully') {
        notification.success({
          message: 'Registration Successful',
          description: 'Please check your email to verify your account.',
        });
        navigate('/verify-email-confirmation');
      } else {
        setError('Unexpected response from server');
      }
    } catch (err: any) {
      const errorMessage =
        err.response?.data ||
        'Registration failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
        theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-gray-100'
      }`}
    >
      <Card
        title="Register"
        style={{
          width: 800,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
          borderColor: theme === 'dark' ? '#303030' : '#e5e5e5',
        }}
        className="mt-6"
        glassmorphism={true}
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${
                theme === 'dark' ? 'bg-blue-900' : 'bg-blue-100'
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
              marginBottom: 0,
              color: theme === 'dark' ? '#ffffff' : '#000000',
            }}
          >
            Carventory
          </Title>
          <Text
            type="secondary"
            style={{ color: theme === 'dark' ? '#d1d5db' : undefined }}
          >
            Create Your Admin Account
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-6 rounded"
            style={{
              backgroundColor: theme === 'dark' ? '#2f2f2f' : undefined,
              borderColor: theme === 'dark' ? '#444' : undefined,
              color: theme === 'dark' ? '#ffffff' : undefined,
            }}
          />
        )}

        <Form
          form={form}
          name="register"
          onFinish={onFinish}
          layout="vertical"
          scrollToFirstError
        >
          <Collapse
            defaultActiveKey={['owner', 'company', 'address']}
            bordered={false}
            className="mb-6"
            expandIconPosition="right"
            style={{
              backgroundColor: theme === 'dark' ? '#1f1f1f' : '#ffffff',
            }}
          >
            {/* Owner Information */}
            <Panel
              header={
                <Text strong style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  Owner Information
                </Text>
              }
              key="owner"
              className={`rounded ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="ownerName"
                    rules={[{ required: true, message: 'Please input your name!' }]}
                  >
                    <Input
                      prefix={
                        <User
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Owner Name"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    rules={[
                      { required: true, message: 'Please input your email!' },
                      { type: 'email', message: 'Please enter a valid email!' },
                    ]}
                  >
                    <Input
                      prefix={
                        <Mail
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Email"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="password"
                    rules={[
                      { required: true, message: 'Please input your password!' },
                      { min: 6, message: 'Password must be at least 6 characters!' },
                    ]}
                  >
                    <Input.Password
                      prefix={
                        <Lock
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Password"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="confirmPassword"
                    dependencies={['password']}
                    rules={[
                      { required: true, message: 'Please confirm your password!' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('password') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('Passwords do not match!'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      prefix={
                        <Lock
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Confirm Password"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>

            {/* Company Information */}
            <Panel
              header={
                <Text strong style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  Company Information
                </Text>
              }
              key="company"
              className={`rounded mt-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="companyName"
                    rules={[{ required: true, message: 'Please input your company name!' }]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Company Name"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="yearEstablished"
                    rules={[{ required: true, message: 'Please input the year established!' }]}
                  >
                    <InputNumber
                      placeholder="Year Established"
                      size="large"
                      min={1900}
                      max={new Date().getFullYear()}
                      style={{ width: '100%' }}
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="companyPhone"
                    rules={[{ required: true, message: 'Please input your company phone!' }]}
                  >
                    <Input
                      prefix={
                        <Phone
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Company Phone"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="companyMobile"
                    rules={[{ required: true, message: 'Please input your company mobile!' }]}
                  >
                    <Input
                      prefix={
                        <Phone
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Company Mobile"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="companyLogo"
                    label="Company Logo"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => e?.fileList || []}
                    rules={[{ required: true, message: 'Please upload company logo!' }]}
                  >
                    <Upload
                      beforeUpload={() => false}
                      accept="image/*"
                      listType="picture"
                      maxCount={1}
                      className="w-full"
                    >
                      <Button
                        icon={<UploadIcon size={16} />}
                        className={`w-full ${theme === 'dark' ? 'ant-btn-dark' : ''}`}
                      >
                        Upload Company Logo
                      </Button>
                    </Upload>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="companyImage"
                    label="Company Image"
                    valuePropName="fileList"
                    getValueFromEvent={(e) => e?.fileList || []}
                    rules={[{ required: true, message: 'Please upload company image!' }]}
                  >
                    <Upload
                      beforeUpload={() => false}
                      accept="image/*"
                      listType="picture"
                      maxCount={1}
                      className="w-full"
                    >
                      <Button
                        icon={<UploadIcon size={16} />}
                        className={`w-full ${theme === 'dark' ? 'ant-btn-dark' : ''}`}
                      >
                        Upload Company Image
                      </Button>
                    </Upload>
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="description"
                    rules={[{ required: true, message: 'Please input your company description!' }]}
                  >
                    <TextArea
                      placeholder="Company Description"
                      size="large"
                      rows={4}
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="specialties"
                    rules={[{ required: true, message: 'Please input your company specialties!' }]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Specialties (comma-separated)"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="hours"
                    rules={[{ required: true, message: 'Please select your company hours!' }]}
                  >
                    <Row gutter={[8, 8]}>
                      <Col xs={24} sm={12}>
                        <Form.Item name="selectedDays" noStyle>
                          <Select
                            mode="multiple"
                            placeholder="Select Days"
                            size="large"
                            className={`rounded ${theme === 'dark' ? 'ant-select-dark' : ''}`}
                            style={{ width: '100%' }}
                            onChange={(selectedDays: string[]) => {
                              const timeRange = form.getFieldValue('selectedTimeRange') || 'Closed';
                              const formattedHours = selectedDays.length
                                ? `${selectedDays.join(', ')}: ${timeRange}`
                                : '';
                              form.setFieldsValue({ hours: formattedHours });
                            }}
                          >
                            {daysOfWeek.map((day) => (
                              <Option key={day} value={day}>
                                {day}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item name="selectedTimeRange" noStyle>
                          <Select
                            placeholder="Select Time Range"
                            size="large"
                            className={`rounded ${theme === 'dark' ? 'ant-select-dark' : ''}`}
                            style={{ width: '100%' }}
                            onChange={(timeRange: string) => {
                              const selectedDays = form.getFieldValue('selectedDays') || [];
                              const formattedHours = selectedDays.length
                                ? `${selectedDays.join(', ')}: ${timeRange}`
                                : '';
                              form.setFieldsValue({ hours: formattedHours });
                            }}
                          >
                            {timeRanges.map((range) => (
                              <Option key={range} value={range}>
                                {range}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item name="hours" hidden>
                      <Input />
                    </Form.Item>
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="website"
                    rules={[
                      { required: true, message: 'Please input your company website!' },
                      { type: 'url', message: 'Please enter a valid URL!' },
                    ]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Website (e.g., https://example.com)"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>

            {/* Address Information */}
            <Panel
              header={
                <Text strong style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                  Address Information
                </Text>
              }
              key="address"
              className={`rounded mt-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="companyAddress"
                    rules={[{ required: true, message: 'Please input your company address!' }]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Company Address"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="city"
                    rules={[{ required: true, message: 'Please input your city!' }]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="City"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="state"
                    rules={[{ required: true, message: 'Please input your state!' }]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="State"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="postalCode"
                    rules={[{ required: true, message: 'Please input your postal code!' }]}
                  >
                    <Input
                      prefix={
                        <Home
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Postal Code"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="country"
                    rules={[{ required: true, message: 'Please input your country!' }]}
                  >
                    <Input
                      prefix={
                        <Globe
                          size={16}
                          className={theme === 'dark' ? 'text-gray-300' : 'text-gray-400'}
                        />
                      }
                      placeholder="Country"
                      size="large"
                      className={`rounded ${theme === 'dark' ? 'ant-input-dark' : ''}`}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          </Collapse>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              size="large"
              block
              className={`rounded ${theme === 'dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              Register
            </Button>
          </Form.Item>

          <div className="text-center mt-4">
            <Text style={{ color: theme === 'dark' ? '#d1d5db' : '#000000' }}>
              Already have an account?{' '}
              <a
                href="/login"
                className={theme === 'dark' ? 'text-blue-400 hover:underline' : 'text-blue-600 hover:underline'}
              >
                Sign in
              </a>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Register;