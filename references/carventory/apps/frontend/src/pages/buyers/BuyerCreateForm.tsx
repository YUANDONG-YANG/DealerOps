import React, { useState, useEffect } from 'react';
import {
    Button,
    Typography,
    Input,
    Space,
    Modal,
    Form,
    message,
    InputNumber,
    DatePicker,
    Upload,
    Select,
} from 'antd';
import { buyersService, employeeService } from '../../services/api';
import { PlusIcon, UploadIcon } from 'lucide-react';
import TextArea from 'antd/es/input/TextArea';
import imageCompression from 'browser-image-compression';

const { Title } = Typography;
const { Option } = Select;

interface BuyerCreateFormProps {
    onBuyerCreated?: () => void;
}

interface Employee {
    id: number;
    ownerName: string;
    email: string;
    role: string;
    userPhone: string;
    userMobile: string;
    username: string;
}

const MAX_IMAGE_SIZE_MB = 20; // 20MB for images
const TARGET_IMAGE_SIZE_KB = 100; // Target size for compression

/**
 * Compresses an image file to under ~100KB if possible
 * @param file - The image file to compress
 * @returns A compressed File object
 */
const compressImage = async (file: File): Promise<File> => {
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        message.error(`Image file size exceeds ${MAX_IMAGE_SIZE_MB}MB limit`);
        return file;
    }

    try {
        const options = {
            maxSizeMB: TARGET_IMAGE_SIZE_KB / 1024,
            maxWidthOrHeight: 1024,
            useWebWorker: true,
            initialQuality: 0.8,
            maxIteration: 5,
            fileType: 'image/jpeg',
        };

        let compressedFile = await imageCompression(file, options);
        if (compressedFile.size > TARGET_IMAGE_SIZE_KB * 1024) {
            compressedFile = await imageCompression(file, {
                ...options,
                initialQuality: 0.6,
            });
        }
        return compressedFile;
    } catch (err) {
        console.error('Image compression failed:', err);
        message.error('Image compression failed. Uploading original file.');
        return file;
    }
};

const BuyerCreateForm: React.FC<BuyerCreateFormProps> = ({ onBuyerCreated }) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);


    // Fetch employees when component mounts or modal opens
    useEffect(() => {
        const fetchEmployees = async () => {
            try {
                setLoading(true);
                const response = await employeeService.getAll();
                setEmployees(response.data || []);
            } catch (error) {
                message.error('Failed to fetch employees');
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        if (isModalVisible) {
            fetchEmployees();
        }
    }, [isModalVisible]);

    // File validation function
    const validateImageFile = (file: File) => {
        const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
        if (!validImageTypes.includes(file.type)) {
            message.error(`${file.name} is not a valid image file. Please upload an image (JPEG, PNG, GIF, BMP, or WEBP).`);
            return false;
        }
        return true;
    };

    const handleCreate = async (values: any) => {
        try {
            // Format the date
            if (values.saleDate) {
                values.saleDate = values.saleDate.format('YYYY-MM-DD');
            }

            // Create FormData for file uploads
            const formData = new FormData();
            const fileFields = ['photo', 'aadharCard', 'panCard', 'addressProof'];
            const imagePromises: Promise<void>[] = [];

            for (const key in values) {
                if (values[key] !== undefined && values[key] !== null) {
                    if (fileFields.includes(key)) {
                        if (values[key] instanceof File && values[key].size > 0) {
                            if (validateImageFile(values[key])) {
                                // Compress valid image files
                                imagePromises.push(
                                    compressImage(values[key]).then(compressedImage => {
                                        formData.append(key, compressedImage, compressedImage.name);
                                    })
                                );
                            }
                        }
                    } else if (key === 'car') {
                        formData.append('carVin', values[key].vin);
                    } else {
                        formData.append(key, values[key].toString());
                    }
                }
            }

            // Ensure soldByUserId is appended
            if (values.soldByUserId) {
                formData.append('soldByUserId', values.soldByUserId.toString());
            }

            // Wait for all image compressions to complete
            await Promise.all(imagePromises);

            await buyersService.create(formData);
            message.success('Buyer created successfully');
            setIsModalVisible(false);
            form.resetFields();
            if (onBuyerCreated) {
                onBuyerCreated();
            }
        } catch (error: any) {
            message.error(error.response?.data?.message || 'Failed to create buyer');
            console.error(error);
        }
        finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mb-6">
            <div className="mt-6">
                <Button
                    icon={<PlusIcon size={16} />}
                    onClick={() => setIsModalVisible(true)}
                >
                    Add Buyer
                </Button>
            </div>
            <Modal
                title="Add New Buyer"
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                width={800}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreate}
                    className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                >
                    <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3">
                        <Title level={4}>Buyer Details</Title>
                    </div>

                    <Form.Item
                        name="name"
                        label="Name"
                        rules={[{ required: true, message: 'Please enter the name' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[{ required: false, message: 'Please enter the email' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="Phone"
                        rules={[{ required: true, message: 'Please enter the phone number' }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        name={['car', 'vin']}
                        label="Car VIN"
                        rules={[{ required: true, message: 'Please enter the car VIN' }]}
                    >
                        <Input onChange={(e) => form.setFieldsValue({ car: { vin: e.target.value.toUpperCase() } })} />
                    </Form.Item>

                    <Form.Item
                        name="salePrice"
                        label="Sale Price"
                        rules={[{ required: true, message: 'Please enter the sale price' }]}
                    >
                        <InputNumber
                            style={{ width: '100%' }}
                            formatter={value => `₹ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value!.replace(/₹\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Form.Item
                        name="saleDate"
                        label="Sale Date"
                        rules={[{ required: true, message: 'Please select the sale date' }]}
                    >
                        <DatePicker style={{ width: '100%' }} />
                    </Form.Item>

                    <Form.Item
                        name="address"
                        label="Address"
                        className="md:col-span-2"
                        rules={[{ required: true, message: 'Please enter buyer address' }]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Form.Item
                        name="notes"
                        label="Notes"
                        className="md:col-span-2"
                    >
                        <TextArea rows={2} />
                    </Form.Item>

                    <Form.Item
                        name="soldByUserId"
                        label="Assign Employee"
                        rules={[{ required: true, message: 'Please select an employee' }]}
                    >
                        <Select
                            showSearch
                            placeholder="Select Employee"
                            optionFilterProp="children"
                            loading={loading}
                            filterOption={(input, option) =>
                                (option?.children as unknown as string)?.toLowerCase().includes(input.toLowerCase())
                            }
                        >
                            {employees.map((employee) => (
                                <Option key={employee.id} value={employee.id}>
                                    {employee.ownerName} ({employee.role})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="photo"
                        label="Buyer Photo (Image)"
                        valuePropName="file"
                        getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
                    >
                        <Upload
                            beforeUpload={(file) => {
                                const isValidImage = validateImageFile(file);
                                return isValidImage ? false : Upload.LIST_IGNORE;
                            }}
                            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
                            listType="picture"
                            maxCount={1}
                        >
                            <Button icon={<UploadIcon size={16} />}>Upload Buyer Photo</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        name="aadharCard"
                        label="Aadhar Card (Image)"
                        valuePropName="file"
                        getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
                    >
                        <Upload
                            beforeUpload={(file) => {
                                const isValidImage = validateImageFile(file);
                                return isValidImage ? false : Upload.LIST_IGNORE;
                            }}
                            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
                            listType="picture"
                            maxCount={1}
                        >
                            <Button icon={<UploadIcon size={16} />}>Upload Aadhar Photo</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        name="panCard"
                        label="PAN Card (Image)"
                        valuePropName="file"
                        getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
                    >
                        <Upload
                            beforeUpload={(file) => {
                                const isValidImage = validateImageFile(file);
                                return isValidImage ? false : Upload.LIST_IGNORE;
                            }}
                            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
                            listType="picture"
                            maxCount={1}
                        >
                            <Button icon={<UploadIcon size={16} />}>Upload Pan Card Photo</Button>
                        </Upload>
                    </Form.Item>

                    <Form.Item
                        name="addressProof"
                        label="Address Proof (Image)"
                        valuePropName="file"
                        getValueFromEvent={(e) => (e.fileList ? e.fileList[0]?.originFileObj : null)}
                    >
                        <Upload
                            beforeUpload={(file) => {
                                const isValidImage = validateImageFile(file);
                                return isValidImage ? false : Upload.LIST_IGNORE;
                            }}
                            accept="image/jpeg,image/png,image/gif,image/bmp,image/webp"
                            listType="picture"
                            maxCount={1}
                        >
                            <Button icon={<UploadIcon size={16} />}>Upload Address Proof Photo</Button>
                        </Upload>
                    </Form.Item>

                    <div className="col-span-1 sm:col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>Cancel</Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={isSubmitting}
                                className="w-[120px] bg-blue-500 hover:bg-blue-600"
                                onClick={() => setIsSubmitting(true)}
                            >
                                Submit
                            </Button>
                        </Space>
                    </div>
                </Form>

            </Modal>
        </div>
    );
};

export default BuyerCreateForm;