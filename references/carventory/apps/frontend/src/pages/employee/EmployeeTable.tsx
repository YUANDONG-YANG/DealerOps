import React, { useEffect, useState, ReactNode } from 'react';
import { Table, Spin, ConfigProvider, Button, Dropdown, Form, Modal, message, Select, Input, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Eye, MoreHorizontal, Edit, Trash2, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../../components/layout/ThemeContext';
import { employeeService } from '../../services/api';

const { Title } = Typography;

// Types
interface Employee {
  id: number;
  ownerName: string;
  email: string;
  role: string;
  userPhone: string;
  userMobile: string;
  username: string;
  active: boolean;
}

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  glassmorphism?: boolean;
  extra?: ReactNode;
  style?: React.CSSProperties;
}

interface EmployeeEditFormProps {
  employee: Employee | null;
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  deleteVisible: boolean;
  onDeleteCancel: () => void;
}

// Card Component
const Card: React.FC<CardProps> = ({
  title,
  extra,
  children,
  className = '',
  glassmorphism = false,
  style,
}) => {
  const { theme } = useTheme();

  const baseClasses = 'rounded-xl overflow-hidden shadow-sm';
  const glassmorphismClasses = glassmorphism
    ? 'bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-white/20 dark:border-gray-700/30'
    : theme === 'dark'
      ? 'bg-gray-800 border border-gray-700'
      : 'bg-white border border-gray-100';

  return (
    <motion.div
      className={`${baseClasses} ${glassmorphismClasses} ${className}`}
      style={style}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {(title || extra) && (
        <div
          className={`px-5 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'} flex items-center justify-between`}
        >
          {title && (
            <h2
              className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}
            >
              {title}
            </h2>
          )}
          {extra && <div>{extra}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </motion.div>
  );
};

// EmployeeEditForm Component
const EmployeeEditForm: React.FC<EmployeeEditFormProps> = ({
  employee,
  visible,
  onCancel,
  onSuccess,
  deleteVisible,
  onDeleteCancel,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleEdit = async (values: any) => {
    if (!employee?.id) {
      message.error('No employee ID provided');
      return;
    }

    try {
      setLoading(true);
      await employeeService.update(employee.id, values);
      message.success('Employee updated successfully');
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('Update employee error:', error);
      message.error('Failed to update employee');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!employee?.id) {
      message.error('No employee ID provided');
      return;
    }

    try {
      setLoading(true);
      await employeeService.delete(employee.id);
      message.success('Employee deleted successfully');
      onSuccess();
      onDeleteCancel(); // Close the delete modal
    } catch (error) {
      console.error('Delete employee error:', error);
      message.error('Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  // Set form values when employee changes
  React.useEffect(() => {
    if (employee) {
      form.setFieldsValue({
        ownerName: employee.ownerName,
        companyPhone: employee.userPhone,
        companyMobile: employee.userMobile,
        username: employee.username,
        isActive: employee.active,
      });
    } else {
      form.resetFields();
    }
  }, [employee, form]);

  return (
    <>
      <Modal
        title="Update Employee"
        open={visible}
        footer={null}
        width={800}
        onCancel={onCancel}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleEdit}
          className="grid grid-cols-3 gap-4"
        >
          <div className="col-span-3">
            <Title level={4}>Employee Details</Title>
          </div>

          <Form.Item
            name="ownerName"
            label="Name"
            rules={[{ required: true, message: 'Please enter the name' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="companyPhone"
            label="Phone"
            rules={[{ required: false, message: 'Please enter the phone number' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="companyMobile"
            label="Mobile"
            rules={[{ required: false, message: 'Please enter the mobile number' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="isActive"
            label="Status"
            rules={[{ required: true, message: 'Please select active status' }]}
          >
            <Select
              options={[
                { label: 'Active', value: true },
                { label: 'Inactive', value: false },
              ]}
              style={{ width: '100%' }}
              placeholder="Select status"
            />
          </Form.Item>

          <div className="col-span-3 flex justify-end">
            <Space>
              <Button danger icon={<X size={16} />} onClick={onCancel}>
                Cancel
              </Button>
              <Button htmlType="submit" loading={loading}>
                Update Employee
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Confirmation"
        open={deleteVisible}
        footer={null}
        width={400}
        onCancel={onDeleteCancel}
      >
        <p>Are you sure you want to delete this employee?</p>
        <div className="mt-6 flex justify-end">
          <Space>
            <Button onClick={onDeleteCancel}>
              Cancel
            </Button>
            {/* <Button
              danger
              icon={<Trash2 size={16} />}
              onClick={handleDelete}
              loading={loading}
            >
              Delete
            </Button> */}
          </Space>
        </div>
      </Modal>
    </>
  );
};

// ActionsCell Component
const ActionsCell: React.FC<{
  record: Employee;
  navigate: (path: string) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}> = ({ record, navigate, onEdit, onDelete }) => {
  return (
    <Dropdown
      menu={{
        items: [
          {
            key: 'edit',
            label: 'Edit',
            icon: <Edit size={14} />,
            onClick: () => onEdit(record),
          }
          // {
          //   key: 'delete',
          //   label: 'Delete',
          //   icon: <Trash2 size={14} />,
          //   danger: true,
          //   onClick: () => onDelete(record),
          // },
        ],
      }}
      trigger={['click']}
    >
      <Button type="text" icon={<MoreHorizontal size={16} />} />
    </Dropdown>
  );
};

// Table Configuration
const getTableColumns = (
  navigate: (path: string) => void,
  onEdit: (employee: Employee) => void,
  onDelete: (employee: Employee) => void,
) => [
  { title: 'Name', dataIndex: 'ownerName', key: 'ownerName' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Role', dataIndex: 'role', key: 'role' },
  { title: 'Phone', dataIndex: 'userPhone', key: 'userPhone' },
  { title: 'Mobile', dataIndex: 'userMobile', key: 'userMobile' },
  {
    title: 'Actions',
    key: 'actions',
    render: (_: any, record: Employee) => (
      <ActionsCell
        record={record}
        navigate={navigate}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    ),
  },
];

const getTableTheme = (theme: string) => ({
  token: {
    colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
    colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
    colorTextHeading: theme === 'dark' ? '#C9D6E3' : '#1C2731',
    colorBorderSecondary: theme === 'dark' ? '#2F3F4A' : '#BCCCDC',
    colorBgContainerHover: theme === 'dark' ? '#1A2734' : '#EEE0C9',
    colorBgContainerSelected: theme === 'dark' ? '#1A2734' : '#ADC4CE',
    fontSize: 14,
    borderRadius: 8,
  },
  components: {
    Table: {
      headerBg: theme === 'dark' ? '#14212E' : '#2A4759',
      headerColor: theme === 'dark' ? '#C9D6E3' : '#eeeeee',
      rowHoverBg: theme === 'dark' ? '#2F3F4A' : '#D9EAFD',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Button: {
      colorPrimary: theme === 'dark' ? '#66B2FF' : undefined,
      colorPrimaryHover: theme === 'dark' ? '#5D9CEC' : undefined,
    },
  },
});

// Main Component
const EmployeeTable: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editVisible, setEditVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const { theme } = useTheme();
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeService.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      message.error('Failed to fetch employees');
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditVisible(true);
  };

  const handleDelete = (employee: Employee) => {
    setSelectedEmployee(employee);
    setDeleteVisible(true);
  };

  const dataSource = employees.map((employee) => ({
    ...employee,
    key: employee.id.toString(),
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="mb-6">
      <Card
        title="Employee List"
        className="mt-6"
        glassmorphism={true}
        extra={
          <Button type="primary" onClick={() => navigate('/create-user')}>
            Add Employee
          </Button>
        }
      >
        <ConfigProvider theme={getTableTheme(theme)}>
          <Table
            columns={getTableColumns(navigate, handleEdit, handleDelete)}
            dataSource={dataSource}
            rowKey="id"
            loading={loading}
            scroll={{ x: 'max-content' }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
            }}
          />
        </ConfigProvider>
      </Card>
      <EmployeeEditForm
        employee={selectedEmployee}
        visible={editVisible}
        onCancel={() => {
          setEditVisible(false);
          setSelectedEmployee(null);
        }}
        onSuccess={() => {
          setEditVisible(false);
          setDeleteVisible(false); // Ensure delete modal is closed
          setSelectedEmployee(null);
          fetchEmployees();
        }}
        deleteVisible={deleteVisible}
        onDeleteCancel={() => {
          setDeleteVisible(false);
          setSelectedEmployee(null);
        }}
      />
    </div>
  );
};

export default EmployeeTable;