import React, { useEffect, useState } from 'react';
import {
  Button,
  Typography,
  Input,
  Modal,
  Form,
  message,
  Select,
  InputNumber,
  DatePicker,
  Steps,
  Divider,
  Upload,
  Space,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, Upload as UploadIcon, Plus as PlusIcon } from 'lucide-react';
import { carsService } from '../../services/api';
import dayjs from 'dayjs';
import imageCompression from 'browser-image-compression';

const { Title } = Typography;
const { Option } = Select;
const { Step } = Steps;

interface CarEditFormProps {
  onCarEdited?: (carId: string) => void;
}

interface Car {
  carMake: string;
  carModel: string;
  carYear: number;
  carVin: string;
  carEngineNumber: string;
  carChassisNumber: string;
  carMaintainAmount: number;
  carMaintainDetails: string;
  carPrice: number;
  carMileage: number;
  carPurchasePrice: number;
  carPurchaseDate: string;
  carFuelType: string;
  carTransmission: string;
  carCondition: string;
  carColor: string;
  carStatus: string;
  carNumberOfOwners: number;
  carOdometerReading: number;
  sellerName: string;
  sellerPhone: string;
  sellerEmail: string;
  sellerAddress: string;
  carImage?: string;
  carImage1?: string;
  carImage2?: string;
  carImage3?: string;
  carImage4?: string;
  carImage5?: string;
  carImage6?: string;
  carImage7?: string;
  carImage8?: string;
  carImage9?: string;
  carImage10?: string;
  carImage11?: string;
  carImage12?: string;
  carImage13?: string;
  carImage14?: string;
  carImage15?: string;
  carRcDocument?: string;
  carInsuranceDocument?: string;
  carPucDocument?: string;
  sellerPhoto?: string;
  sellerAadharCard?: string;
  sellerPanCard?: string;
  sellerAddressProof?: string;

  // === Newly added fields ===
  carSellerId?: number;
  engineCapacity?: number;
  drivetrain?: string;
  suspensionType?: string;
  fuelTankCapacity?: number;
  cityMileage?: number;
  highwayMileage?: number;
  length?: number;
  width?: number;
  height?: number;
  groundClearance?: number;
  wheelbase?: number;
  bootSpace?: number;
  frontBrakeType?: string;
  rearBrakeType?: string;
  tireType?: string;
  wheelSize?: string;
  airConditioning?: boolean;
  airConditioningType?: string;
  powerSteering?: boolean;
  powerWindowsType?: string;
  cruiseControl?: boolean;
  centralLocking?: boolean;
  infotainmentSystem?: boolean;
  navigationSystem?: boolean;
  sunroof?: boolean;
  airbags?: number;
  abs?: boolean;
  ebd?: boolean;
  tractionControl?: boolean;
  rearCamera?: boolean;
  parkingSensors?: boolean;
  amFmRadio?: boolean;
  auxCompatibility?: boolean;
  usbCompatibility?: boolean;
  bluetooth?: boolean;
  antiTheftDevice?: boolean;
  adjustableExternalMirror?: string;
  adjustableSteering?: boolean;
  batteryCondition?: string;
  insuranceType?: string;
  lockSystem?: string;
  makeYear?: string;
  registrationPlace?: string;
  exchangeAvailable?: boolean;
  financeAvailable?: boolean;
  serviceHistoryAvailable?: boolean;
  tyreCondition?: string;
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

const CarEditForm: React.FC<CarEditFormProps> = ({ onCarEdited }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [car, setCar] = useState<Car | null>(null);
  const [additionalImages, setAdditionalImages] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [options, setOptions] = useState([
      '12 inch', '13 inch', '14 inch', '15 inch', '16 inch',
      '17 inch', '18 inch', '19 inch', '20 inch', '21 inch',
      '22 inch', '23 inch', '24 inch',
    ]);
  const baseStyle = {
    borderColor: '#1890ff',
    color: '#1890ff',
    backgroundColor: 'transparent',
  };

  const hoverStyle = {
    backgroundColor: '#1890ff',
    color: '#fff',
    borderColor: '#1890ff',
  };

  useEffect(() => {
    if (id) {
      fetchCarDetails(id);
    }
  }, [id]);

  const fetchCarDetails = async (carId: string) => {
    try {
      const response = await carsService.getById(carId);
      const carData = response.data || response;
      setCar(carData);
      // Initialize additionalImages based on existing carImage1 to carImage15
      const additionalImageFields = [];
      for (let i = 1; i <= 15; i++) {
        if (carData[`carImage${i}`]) {
          additionalImageFields.push(i - 1);
        }
      }
      setAdditionalImages(additionalImageFields);
const initialValues = {
  ...carData,
  carPurchaseDate: carData.carPurchaseDate ? dayjs(carData.carPurchaseDate) : null,
  carYear: carData.carYear || undefined,
  carPrice: carData.carPrice || undefined,
  carMileage: carData.carMileage || undefined,
  carPurchasePrice: carData.carPurchasePrice || undefined,
  carMaintainAmount: carData.carMaintainAmount || undefined,
  carOdometerReading: carData.carOdometerReading || undefined,
  carNumberOfOwners: carData.carNumberOfOwners || undefined,

  carImage: getDefaultFileList(carData.carImage, 'Main Car Image'),
  carImage1: getDefaultFileList(carData.carImage1, 'Additional Car Image 1'),
  carImage2: getDefaultFileList(carData.carImage2, 'Additional Car Image 2'),
  carImage3: getDefaultFileList(carData.carImage3, 'Additional Car Image 3'),
  carImage4: getDefaultFileList(carData.carImage4, 'Additional Car Image 4'),
  carImage5: getDefaultFileList(carData.carImage5, 'Additional Car Image 5'),
  carImage6: getDefaultFileList(carData.carImage6, 'Additional Car Image 6'),
  carImage7: getDefaultFileList(carData.carImage7, 'Additional Car Image 7'),
  carImage8: getDefaultFileList(carData.carImage8, 'Additional Car Image 8'),
  carImage9: getDefaultFileList(carData.carImage9, 'Additional Car Image 9'),
  carImage10: getDefaultFileList(carData.carImage10, 'Additional Car Image 10'),
  carImage11: getDefaultFileList(carData.carImage11, 'Additional Car Image 11'),
  carImage12: getDefaultFileList(carData.carImage12, 'Additional Car Image 12'),
  carImage13: getDefaultFileList(carData.carImage13, 'Additional Car Image 13'),
  carImage14: getDefaultFileList(carData.carImage14, 'Additional Car Image 14'),
  carImage15: getDefaultFileList(carData.carImage15, 'Additional Car Image 15'),

  carRcDocument: getDefaultFileList(carData.carRcDocument, 'RC Document'),
  carInsuranceDocument: getDefaultFileList(carData.carInsuranceDocument, 'Insurance Document'),
  carPucDocument: getDefaultFileList(carData.carPucDocument, 'PUC Document'),

  sellerPhoto: getDefaultFileList(carData.sellerPhoto, 'Seller Photo'),
  sellerAadharCard: getDefaultFileList(carData.sellerAadharCard, 'Aadhar Card'),
  sellerPanCard: getDefaultFileList(carData.sellerPanCard, 'PAN Card'),
  sellerAddressProof: getDefaultFileList(carData.sellerAddressProof, 'Address Proof'),

  // Newly added fields
  carMake: carData.carMake || '',
  carModel: carData.carModel || '',
  carVin: carData.carVin || '',
  carEngineNumber: carData.carEngineNumber || '',
  carChassisNumber: carData.carChassisNumber || '',
  carFuelType: carData.carFuelType || '',
  carTransmission: carData.carTransmission || '',
  carCondition: carData.carCondition || '',
  carColor: carData.carColor || '',
  carStatus: carData.carStatus || '',
  sellerName: carData.sellerName || '',
  sellerPhone: carData.sellerPhone || '',
  sellerEmail: carData.sellerEmail || '',
  sellerAddress: carData.sellerAddress || '',
  carSellerId: carData.carSellerId || undefined,

  engineCapacity: carData.engineCapacity || undefined,
  drivetrain: carData.drivetrain || '',
  suspensionType: carData.suspensionType || '',
  fuelTankCapacity: carData.fuelTankCapacity || undefined,
  cityMileage: carData.cityMileage || undefined,
  highwayMileage: carData.highwayMileage || undefined,
  length: carData.length || undefined,
  width: carData.width || undefined,
  height: carData.height || undefined,
  groundClearance: carData.groundClearance || undefined,
  wheelbase: carData.wheelbase || undefined,
  bootSpace: carData.bootSpace || undefined,
  frontBrakeType: carData.frontBrakeType || '',
  rearBrakeType: carData.rearBrakeType || '',
  tireType: carData.tireType || '',
  wheelSize: carData.wheelSize || '',
  airConditioning: carData.airConditioning || false,
  airConditioningType: carData.airConditioningType || '',
  powerSteering: carData.powerSteering || false,
  powerWindowsType: carData.powerWindowsType || '',
  cruiseControl: carData.cruiseControl || false,
  centralLocking: carData.centralLocking || false,
  infotainmentSystem: carData.infotainmentSystem || false,
  navigationSystem: carData.navigationSystem || false,
  sunroof: carData.sunroof || false,
  airbags: carData.airbags || undefined,
  abs: carData.abs || false,
  ebd: carData.ebd || false,
  tractionControl: carData.tractionControl || false,
  rearCamera: carData.rearCamera || false,
  parkingSensors: carData.parkingSensors || false,
  amFmRadio: carData.amFmRadio || false,
  auxCompatibility: carData.auxCompatibility || false,
  usbCompatibility: carData.usbCompatibility || false,
  bluetooth: carData.bluetooth || false,
  antiTheftDevice: carData.antiTheftDevice || false,
  adjustableExternalMirror: carData.adjustableExternalMirror || '',
  adjustableSteering: carData.adjustableSteering || false,
  batteryCondition: carData.batteryCondition || '',
  insuranceType: carData.insuranceType || '',
  lockSystem: carData.lockSystem || '',
  makeYear: carData.makeYear || '',
  registrationPlace: carData.registrationPlace || '',
  exchangeAvailable: carData.exchangeAvailable || false,
  financeAvailable: carData.financeAvailable || false,
  serviceHistoryAvailable: carData.serviceHistoryAvailable || false,
  tyreCondition: carData.tyreCondition || ''
};

      console.log('Initial form values:', initialValues); // Debug log
      form.setFieldsValue(initialValues);
    } catch (error) {
      message.error('Failed to fetch car details');
      console.error('Fetch car details error:', error);
    }
  };

  // const handleEdit = async () => {
  //   console.log('handleEdit triggered'); // Debug log
  //   setIsSubmitting(true);
  //   try {
  //     await form.validateFields();
  //     const values = form.getFieldsValue(true);
  //     console.log('Form values before submission:', values); // Debug log

  //     const formData = new FormData();
  //     const imagePromises: Promise<void>[] = [];

  //     const fileFields = [
  //       'carImage',
  //       'carRcDocument',
  //       'carInsuranceDocument',
  //       'carPucDocument',
  //       'sellerPhoto',
  //       'sellerAadharCard',
  //       'sellerPanCard',
  //       'sellerAddressProof',
  //       ...additionalImages.map((index) => `carImage${index + 1}`),
  //     ];

  //     for (const [key, value] of Object.entries(values)) {
  //       if (value !== undefined && value !== null) {
  //         if (fileFields.includes(key) && Array.isArray(value) && value.length > 0 && value[0].originFileObj) {
  //           // Compress all file uploads (images and document images)
  //           imagePromises.push(
  //             compressImage(value[0].originFileObj).then((compressedImage) => {
  //               formData.append(key, compressedImage, compressedImage.name);
  //             })
  //           );
  //         } else if (key === 'carPurchaseDate' && value) {
  //           formData.append(key, (value as any).format('YYYY-MM-DD'));
  //         } else if (typeof value === 'string' || typeof value === 'number') {
  //           formData.append(key, value.toString());
  //         }
  //       }
  //     }

  //     await Promise.all(imagePromises);
  //     console.log('FormData entries:', [...formData.entries()]); // Debug log

  //     if (id) {
  //       await carsService.update(id, formData);
  //       await fetchCarDetails(id);
  //       message.success('Car updated successfully');
  //       setIsModalVisible(false);
  //       setAdditionalImages([]);
  //       setCurrentStep(0);
  //       if (onCarEdited) onCarEdited(id);
  //     } else {
  //       throw new Error('Car ID is undefined');
  //     }
  //   } catch (error: any) {
  //     message.error(`Failed to update car: ${error.message || 'Unknown error'}`);
  //     console.error('Update car error:', error);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };

  const handleEdit = async () => {
  console.log('handleEdit triggered'); // Debug log
  setIsSubmitting(true);
  try {
    await form.validateFields();
    const formValues = form.getFieldsValue(true);
    console.log('Form values before submission:', formValues); // Debug log

    const formData = new FormData();
    const imagePromises: Promise<void>[] = [];

    // Define all possible fields, including file fields
    const fileFields = [
      'carImage',
      'carRcDocument',
      'carInsuranceDocument',
      'carPucDocument',
      'sellerPhoto',
      'sellerAadharCard',
      'sellerPanCard',
      'sellerAddressProof',
      ...additionalImages.map((index) => `carImage${index + 1}`),
    ];

    // Merge form values with original car data to preserve unchanged values
    const mergedValues = { ...car, ...formValues };

    for (const [key, value] of Object.entries(mergedValues)) {
      // Skip undefined or null values, but ensure original car data is considered
      if (value !== undefined && value !== null) {
        if (fileFields.includes(key)) {
          // Handle file fields
          if (Array.isArray(formValues[key]) && formValues[key].length > 0 && formValues[key][0].originFileObj) {
            // New file uploaded, compress and append
            imagePromises.push(
              compressImage(formValues[key][0].originFileObj).then((compressedImage) => {
                formData.append(key, compressedImage, compressedImage.name);
              })
            );
          } else if (car?.[key as keyof Car]) {
            // No new file uploaded, append the existing URL from car data
            formData.append(key, car[key as keyof Car] as string);
          }
        } else if (key === 'carPurchaseDate' && value) {
          // Handle date field
          formData.append(key, (value as any).format('YYYY-MM-DD'));
        } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          // Handle text, number, and boolean fields
          formData.append(key, value.toString());
        }
      }
    }

    await Promise.all(imagePromises);
    console.log('FormData entries:', [...formData.entries()]); // Debug log

    if (id) {
      await carsService.update(id, formData);
      await fetchCarDetails(id);
      message.success('Car updated successfully');
      setIsModalVisible(false);
      setAdditionalImages([]);
      setCurrentStep(0);
      if (onCarEdited) onCarEdited(id);
    } else {
      throw new Error('Car ID is undefined');
    }
  } catch (error: any) {
    message.error(`Failed to update car: ${error.message || 'Unknown error'}`);
    console.error('Update car error:', error);
  } finally {
    setIsSubmitting(false);
  }
};

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await carsService.delete(id);
      message.success('Car deleted successfully');
      navigate('/cars');
    } catch (error: any) {
      message.error(`Failed to delete car: ${error.message || 'Unknown error'}`);
      console.error('Delete car error:', error);
    } finally {
      setIsSubmitting(false);
      setIsDeleteModalVisible(false);
    }
  };

  const addImageField = () => {
    if (additionalImages.length < 15) {
      setAdditionalImages([...additionalImages, additionalImages.length]);
    } else {
      message.warning('Maximum 15 additional images allowed');
    }
  };

  const nextStep = async () => {
    try {
      await form.validateFields(getFieldsForStep(currentStep));
      console.log('Moving to step', currentStep + 1); // Debug log
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.log('Validation error in step', currentStep, error);
      message.error('Please fill in all required fields');
    }
  };

  const prevStep = () => {
    console.log('Moving to step', currentStep - 1); // Debug log
    setCurrentStep(currentStep - 1);
  };

  const getFieldsForStep = (step: number) => {
    switch (step) {
      case 0:
        return [
          'carMake',
          'carModel',
          'carYear',
          'carVin',
          'carEngineNumber',
          'carChassisNumber',
          'carPrice',
          'carMileage',
          'carPurchasePrice',
          'carPurchaseDate',
          'carMaintainAmount',
          'carMaintainDetails',
          'carFuelType',
          'carTransmission',
          'carCondition',
          'carColor',
          'carStatus',
          'carOdometerReading',
          'carNumberOfOwners',
        ];
      case 1:
        return [
          'engineCapacity',
          'drivetrain',
          'suspensionType',
          'fuelTankCapacity',
          'cityMileage',
          'highwayMileage',
          'length',
          'width',
          'height',
          'groundClearance',
          'wheelbase',
          'bootSpace',
          'frontBrakeType',
          'rearBrakeType',
          'tireType',
          'wheelSize',
          'airConditioning',
          'airConditioningType',
          'powerSteering',
          'powerWindowsType',
          'cruiseControl',
          'centralLocking',
          'infotainmentSystem',
          'navigationSystem',
          'sunroof',
          'airbags',
          'abs',
          'ebd',
          'tractionControl',
          'rearCamera',
          'parkingSensors',
          'amFmRadio',
          'auxCompatibility',
          'usbCompatibility',
          'bluetooth',
          'antiTheftDevice',
          'adjustableExternal',
          'adjustableSteering',
          'batteryCondition',
          'insuranceType',
          'lockSystem',
          'makeYear',
          'registrationPlace',
          'exchangeAvailable',
          'financeAvailable',
          'serviceHistoryAvailable',
          'tyreCondition',
        ];
      case 2:
        return ['sellerName', 'sellerPhone', 'sellerEmail', 'sellerAddress'];
      case 3:
        return [
          'carImage',
          'carRcDocument',
          'carInsuranceDocument',
          'carPucDocument',
          'sellerPhoto',
          'sellerAadharCard',
          'sellerPanCard',
          'sellerAddressProof',
        ];
      default:
        return [];
    }
  };

  const getDefaultFileList = (url: string | undefined, name: string) => {
    if (!url || typeof url !== 'string' || !url.trim()) {
      return [];
    }
    try {
      new URL(url);
      return [{ uid: `-${name.replace(/\s+/g, '-')}`, name, status: 'done' as const, url }];
    } catch {
      console.warn(`Invalid URL for ${name}:`, url);
      return [];
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission on Enter key
    }
  };

  const steps = [
    {
      title: 'Car Details',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Form.Item
            name="carMake"
            label="Make"
            rules={[{ required: true, message: 'Please enter car company' }]}
          >
            <Select showSearch allowClear placeholder="Select car make">
              <Option value="any">any</Option>
              <Option value="Maruti Suzuki">Maruti Suzuki</Option>
              <Option value="Tata Motors">Tata Motors</Option>
              <Option value="Mahindra">Mahindra</Option>
              <Option value="Hyundai">Hyundai</Option>
              <Option value="Kia">Kia</Option>
              <Option value="Honda">Honda</Option>
              <Option value="Toyota">Toyota</Option>
              <Option value="Renault">Renault</Option>
              <Option value="Volkswagen">Volkswagen</Option>
              <Option value="Skoda">Skoda</Option>
              <Option value="MG">MG</Option>
              <Option value="Nissan">Nissan</Option>
              <Option value="Jeep">Jeep</Option>
              <Option value="Citroën">Citroën</Option>
              <Option value="BMW">BMW</Option>
              <Option value="Mercedes">Mercedes</Option>
              <Option value="Audi">Audi</Option>
              <Option value="Volvo">Volvo</Option>
              <Option value="Lexus">Lexus</Option>
              <Option value="Jaguar">Jaguar</Option>
              <Option value="Land">Land</Option>
              <Option value="Mini">Mini</Option>
              <Option value="Porsche">Porsche</Option>
              <Option value="Maserati">Maserati</Option>
              <Option value="Lamborghini">Lamborghini</Option>
              <Option value="Ferrari">Ferrari</Option>
              <Option value="Rolls">Rolls</Option>
              <Option value="Bentley">Bentley</Option>
              <Option value="Aston">Aston</Option>
              <Option value="BYD">BYD</Option>
              <Option value="Tesla">Tesla</Option>
              <Option value="Ford">Ford</Option>
              <Option value="Chevrolet">Chevrolet</Option>
              <Option value="Fiat">Fiat</Option>
              <Option value="Datsun">Datsun</Option>
              <Option value="Isuzu">Isuzu</Option>
            </Select>
          </Form.Item>


          <Form.Item
            name="carModel"
            label="Model"
            rules={[{ required: true, message: 'Please enter car model' }]}
          >
            <Input onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="carYear"
            label="Year"
            rules={[{ required: true, message: 'Please enter car year' }]}
          >
            <InputNumber min={1900} max={2025} className="w-full" onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="carVin"
            label="VIN (Plate Number)"
            rules={[{ required: true, message: 'Please enter VIN' }]}
          >
            <Input
              onChange={(e) => form.setFieldsValue({ carVin: e.target.value.toUpperCase() })}
              onKeyDown={handleKeyDown}
            />
          </Form.Item>

          <Form.Item name="carEngineNumber" label="Engine Number">
            <Input
              onChange={(e) => form.setFieldsValue({ carEngineNumber: e.target.value.toUpperCase() })}
              onKeyDown={handleKeyDown}
            />
          </Form.Item>

          <Form.Item name="carChassisNumber" label="Chassis Number">
            <Input
              onChange={(e) => form.setFieldsValue({ carChassisNumber: e.target.value.toUpperCase() })}
              onKeyDown={handleKeyDown}
            />
          </Form.Item>

          <Form.Item
            name="carPrice"
            label="Sale Price"
            rules={[{ required: true, message: 'Please enter price' }]}
          >
            <InputNumber
              formatter={(value) => `₹ ${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/₹\s?|(,*)/g, '') || ''}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </Form.Item>

          <Form.Item name="carMileage" label="Mileage">
            <InputNumber className="w-full" onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="carPurchasePrice"
            label="Purchase Price"
            rules={[{ required: true, message: 'Please enter purchase price' }]}
          >
            <InputNumber
              formatter={(value) => `₹ ${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/₹\s?|(,*)/g, '') || ''}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </Form.Item>

          <Form.Item
            name="carPurchaseDate"
            label="Purchase Date"
            rules={[{ required: true, message: 'Please select purchase date' }]}
          >
            <DatePicker className="w-full" onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item name="carMaintainAmount" label="Maintenance Amount">
            <InputNumber
              formatter={(value) => `₹ ${value || ''}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value?.replace(/₹\s?|(,*)/g, '') || ''}
              className="w-full"
              onKeyDown={handleKeyDown}
            />
          </Form.Item>

          <Form.Item name="carMaintainDetails" label="Maintenance Details">
            <Input.TextArea rows={2} onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="carFuelType"
            label="Fuel Type"
            rules={[{ required: true, message: 'Please select fuel type' }]}
          >
            <Select onKeyDown={handleKeyDown}>
              <Option value="Petrol">Petrol</Option>
              <Option value="Petrol & CNG">Petrol + CNG</Option>
              <Option value="Diesel">Diesel</Option>
              <Option value="Electric">Electric</Option>
              <Option value="Hybrid">Hybrid</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="carTransmission"
            label="Transmission"
            rules={[{ required: true, message: 'Please select transmission' }]}
          >
            <Select onKeyDown={handleKeyDown}>
              <Option value="Automatic">Automatic</Option>
              <Option value="Manual">Manual</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="carCondition"
            label="Condition"
            rules={[{ required: true, message: 'Please select condition' }]}
          >
            <Select onKeyDown={handleKeyDown}>
              <Option value="Excellent">Excellent</Option>
              <Option value="Good">Good</Option>
              <Option value="Fair">Fair</Option>
              <Option value="Poor">Poor</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="carColor"
            label="Color"
            rules={[{ required: true, message: 'Please enter color' }]}
          >
            <Input onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="carStatus"
            label="Status"
            rules={[{ required: true, message: 'Please select status' }]}
          >
            <Select onKeyDown={handleKeyDown}>
              <Option value="Available">Available</Option>
              <Option value="Sold">Sold</Option>
              <Option value="Maintenance">Maintenance</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="carOdometerReading"
            label="Odometer Reading (Km)"
            rules={[{ required: true, message: 'Please enter odometer reading' }]}
          >
            <InputNumber min={0} className="w-full" onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="carNumberOfOwners"
            label="Number of Owners"
            rules={[{ required: true, message: 'Please enter number of owners' }]}
          >
            <InputNumber min={1} className="w-full" onKeyDown={handleKeyDown} />
          </Form.Item>
        </div>
      ),
    },
    {
      title: 'Car Features',
      content: (
        <div className="space-y-6">
          {/* === Performance === */}
          <h2 className="text-lg font-semibold text-blue-600">Performance</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="engineCapacity"
              label="Engine Capacity (cc)"
              rules={[{ required: false, message: 'Please enter engine capacity' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="drivetrain"
              label="Drivetrain"
              rules={[{ required: false, message: 'Please select drivetrain' }]}
            >
              <Select>
                <Option value="FWD">FWD</Option>
                <Option value="RWD">RWD</Option>
                <Option value="AWD">AWD</Option>
                <Option value="4WD">4WD</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="suspensionType"
              label="Suspension Type"
              rules={[{ required: false }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="fuelTankCapacity"
              label="Fuel Tank Capacity (liters)"
              rules={[{ required: false, message: 'Please enter fuel tank capacity' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="cityMileage"
              label="City Mileage (km/l)"
              rules={[{ required: false, message: 'Please enter city mileage' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="highwayMileage"
              label="Highway Mileage (km/l)"
              rules={[{ required: false, message: 'Please enter highway mileage' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          {/* === Dimensions === */}
          <h2 className="text-lg font-semibold text-blue-600">Dimensions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="length"
              label="Length (mm)"
              rules={[{ required: false, message: 'Please enter length' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="width"
              label="Width (mm)"
              rules={[{ required: false, message: 'Please enter width' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="height"
              label="Height (mm)"
              rules={[{ required: false, message: 'Please enter height' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="groundClearance"
              label="Ground Clearance (mm)"
              rules={[{ required: false, message: 'Please enter ground clearance' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="wheelbase"
              label="Wheelbase (mm)"
              rules={[{ required: false, message: 'Please enter wheelbase' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="bootSpace"
              label="Boot Space (liters)"
              rules={[{ required: false, message: 'Please enter boot space' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
          </div>

          {/* === Brakes & Tires === */}
          <h2 className="text-lg font-semibold text-blue-600">Brakes & Tires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="frontBrakeType"
              label="Front Brake Type"
              rules={[{ required: false, message: 'Please select front brake type' }]}
            >
              <Select>
                <Option value="Disc">Disc</Option>
                <Option value="Drum">Drum</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="rearBrakeType"
              label="Rear Brake Type"
              rules={[{ required: false, message: 'Please select rear brake type' }]}
            >
              <Select>
                <Option value="Disc">Disc</Option>
                <Option value="Drum">Drum</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="tireType"
              label="Tire Type"
              rules={[{ required: false, message: 'Please select tire type' }]}
            >
              <Select>
                <Option value="Tubeless">Tubeless</Option>
                <Option value="Radial">Radial</Option>
                <Option value="Bias Ply">Bias Ply</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="wheelSize"
              label="Wheel Size"
              rules={[{ required: false, message: 'Please select or enter wheel size' }]}
            >
              <Select
                showSearch
                allowClear
                placeholder="Select or type wheel size"
                value={form.getFieldValue('wheelSize')}
                onChange={(value) => {
                  form.setFieldsValue({ wheelSize: value });
                }}
                onSearch={(value) => setCustomValue(value)}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ padding: 8, borderTop: '1px solid #eee' }}>
                      <Input
                        placeholder="Enter custom size (e.g., 19.5 inch)"
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        onPressEnter={() => {
                          if (customValue && !options.includes(customValue)) {
                            setOptions((prev) => [...prev, customValue]);
                            form.setFieldsValue({ wheelSize: customValue });
                            setCustomValue('');
                          }
                        }}
                      />
                    </div>
                  </>
                )}
              >
                {options.map((size) => (
                  <Option key={size} value={size}>
                    {size}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </div>

          {/* === Comfort Features === */}
          <h2 className="text-lg font-semibold text-blue-600">Comfort Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="airConditioning"
              label="Air Conditioning"
              rules={[{ required: false, message: 'Please select air conditioning' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="airConditioningType"
              label="Air Conditioning Type"
              rules={[{ required: false }]}
            >
              <Select allowClear>
                <Option value="Manual">Manual</Option>
                <Option value="Automatic">Automatic</Option>
                <Option value="Dual Zone">Dual Zone</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="powerSteering"
              label="Power Steering"
              rules={[{ required: false, message: 'Please select power steering' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="powerWindowsType"
              label="Power Windows Type"
              rules={[{ required: false, message: 'Please select power windows type' }]}
            >
              <Select>
                <Option value="Front Only">Front Only</Option>
                <Option value="All">All</Option>
                <Option value="None">None</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="cruiseControl"
              label="Cruise Control"
              rules={[{ required: false, message: 'Please select cruise control' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="centralLocking"
              label="Central Locking"
              rules={[{ required: false, message: 'Please select central locking' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
          </div>

          {/* === Infotainment === */}
          <h2 className="text-lg font-semibold text-blue-600">Infotainment</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="infotainmentSystem"
              label="Infotainment System"
              rules={[{ required: false, message: 'Please select infotainment system' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="navigationSystem"
              label="Navigation System"
              rules={[{ required: false, message: 'Please select navigation system' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="amFmRadio"
              label="AM/FM Radio"
              rules={[{ required: false, message: 'Please select AM/FM radio' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="auxCompatibility"
              label="AUX Compatibility"
              rules={[{ required: false, message: 'Please select AUX compatibility' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="usbCompatibility"
              label="USB Compatibility"
              rules={[{ required: false, message: 'Please select USB compatibility' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="bluetooth"
              label="Bluetooth"
              rules={[{ required: false, message: 'Please select Bluetooth' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
          </div>

          {/* === Safety Features === */}
          <h2 className="text-lg font-semibold text-blue-600">Safety Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="airbags"
              label="Airbags"
              rules={[{ required: false, message: 'Please enter number of airbags' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item
              name="abs"
              label="ABS"
              rules={[{ required: false, message: 'Please select ABS' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="ebd"
              label="EBD"
              rules={[{ required: false, message: 'Please select EBD' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="tractionControl"
              label="Traction Control"
              rules={[{ required: false, message: 'Please select traction control' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="rearCamera"
              label="Rear Camera"
              rules={[{ required: false, message: 'Please select rear camera' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="parkingSensors"
              label="Parking Sensors"
              rules={[{ required: false, message: 'Please select parking sensors' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="antiTheftDevice"
              label="Anti-Theft Device"
              rules={[{ required: false, message: 'Please select anti-theft device' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
          </div>

          {/* === Miscellaneous / Additional Info === */}
          <h2 className="text-lg font-semibold text-blue-600">Additional Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Form.Item
              name="adjustableExternalMirror"
              label="Adjustable External Mirror"
              rules={[{ required: false, message: 'Please select adjustable external mirror' }]}
            >
              <Select>
                <Option value="Manual">Manual</Option>
                <Option value="Electric">Electric</Option>
                <Option value="Electric with Turn Indicators">Electric with Turn Indicators</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="adjustableSteering"
              label="Adjustable Steering"
              rules={[{ required: false, message: 'Please select adjustable steering' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="batteryCondition"
              label="Battery Condition"
              rules={[{ required: false, message: 'Please select battery condition' }]}
            >
              <Select>
                <Option value="New">New</Option>
                <Option value="Good">Good</Option>
                <Option value="Needs Replacement">Needs Replacement</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="insuranceType"
              label="Insurance Type"
              rules={[{ required: false, message: 'Please select insurance type' }]}
            >
              <Select>
                <Option value="Comprehensive">Comprehensive</Option>
                <Option value="Third-Party">Third-Party</Option>
                <Option value="Zero Depreciation">Zero Depreciation</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="lockSystem"
              label="Lock System"
              rules={[{ required: false, message: 'Please select lock system' }]}
            >
              <Select>
                <Option value="Manual">Manual</Option>
                <Option value="Central">Central</Option>
                <Option value="Remote">Remote</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="makeYear"
              label="Make Year"
              rules={[{ required: false, message: 'Please enter make year' }]}
            >
              <InputNumber min={1900} max={2025} className="w-full" />
            </Form.Item>
            <Form.Item
              name="registrationPlace"
              label="Registration Place"
              rules={[{ required: false, message: 'Please enter registration place' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="exchangeAvailable"
              label="Exchange Available"
              rules={[{ required: false, message: 'Please select exchange availability' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="financeAvailable"
              label="Finance Available"
              rules={[{ required: false, message: 'Please select finance availability' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="serviceHistoryAvailable"
              label="Service History Available"
              rules={[{ required: false, message: 'Please select service history availability' }]}
            >
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="tyreCondition"
              label="Tyre Condition"
              rules={[{ required: false, message: 'Please select tyre condition' }]}
            >
              <Select>
                <Option value="New">New</Option>
                <Option value="Good">Good</Option>
                <Option value="Worn">Worn</Option>
              </Select>
            </Form.Item>
          </div>
        </div>
      ),
    },
    {
      title: 'Seller Details',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Form.Item
            name="sellerName"
            label="Seller Name"
            rules={[{ required: true, message: 'Please enter seller name' }]}
          >
            <Input onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="sellerPhone"
            label="Seller Phone"
            rules={[{ required: true, message: 'Please enter seller phone' }]}
          >
            <Input onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="sellerEmail"
            label="Seller Email"
            rules={[{ type: 'email', message: 'Please enter a valid email' }]}
          >
            <Input onKeyDown={handleKeyDown} />
          </Form.Item>

          <Form.Item
            name="sellerAddress"
            label="Seller Address"
            rules={[{ required: true, message: 'Please enter seller address' }]}
            className="sm:col-span-3"
          >
            <Input.TextArea rows={2} onKeyDown={handleKeyDown} />
          </Form.Item>
        </div>
      ),
    },
    {
      title: 'Documents',
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-3">
            <Divider orientation="left">Car Documents</Divider>
          </div>

          <Form.Item
            name="carImage"
            label="Main Car Image"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload main car image' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.carImage, 'Main Car Image')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload Main Car Image
              </Button>
            </Upload>
          </Form.Item>

          {additionalImages.map((index) => (
            <Form.Item
              key={`carImage${index + 1}`}
              name={`carImage${index + 1}`}
              label={`Additional Car Image ${index + 1}`}
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
              rules={[{ required: false, message: `Please upload additional car image ${index + 1}` }]}
            >
              <Upload
                beforeUpload={() => false}
                accept="image/*"
                listType="picture"
                maxCount={1}
                // defaultFileList={getDefaultFileList(car?.[`carImage${index + 1}` as keyof Car], `Additional Car Image ${index + 1}`)}
                defaultFileList={getDefaultFileList(
                  typeof car?.[`carImage${index + 1}` as keyof Car] === 'string'
                    ? car?.[`carImage${index + 1}` as keyof Car] as string
                    : undefined,
                  `Additional Car Image ${index + 1}`
                )}
                className="w-full"
              >
                <Button icon={<UploadIcon size={16} />} className="w-full">
                  Upload Image {index + 1}
                </Button>
              </Upload>
            </Form.Item>
          ))}

          <Form.Item className="sm:col-span-3">
            <Button
              icon={<PlusIcon size={16} />}
              onClick={addImageField}
              disabled={additionalImages.length >= 15}
              className="w-full"
            >
              Add More Images
            </Button>
          </Form.Item>

          <Form.Item
            name="carRcDocument"
            label="RC Document (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload RC document' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.carRcDocument, 'RC Document')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload RC Document
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="carInsuranceDocument"
            label="Insurance Document (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload insurance document' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.carInsuranceDocument, 'Insurance Document')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload Insurance Document
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="carPucDocument"
            label="PUC Document (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload PUC document' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.carPucDocument, 'PUC Document')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload PUC Document
              </Button>
            </Upload>
          </Form.Item>

          <div className="sm:col-span-3">
            <Divider orientation="left">Seller Documents</Divider>
          </div>

          <Form.Item
            name="sellerPhoto"
            label="Seller Photo (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload seller photo' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.sellerPhoto, 'Seller Photo')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload Seller Photo
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="sellerAadharCard"
            label="Seller Aadhar Card (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload Aadhar card' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.sellerAadharCard, 'Aadhar Card')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload Aadhar Card
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="sellerPanCard"
            label="Seller PAN Card (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload PAN card' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.sellerPanCard, 'PAN Card')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload PAN Card
              </Button>
            </Upload>
          </Form.Item>

          <Form.Item
            name="sellerAddressProof"
            label="Seller Address Proof (Image)"
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e?.fileList) ? e.fileList : [])}
            rules={[{ required: false, message: 'Please upload address proof' }]}
          >
            <Upload
              beforeUpload={() => false}
              accept="image/*"
              listType="picture"
              maxCount={1}
              defaultFileList={getDefaultFileList(car?.sellerAddressProof, 'Address Proof')}
              className="w-full"
            >
              <Button icon={<UploadIcon size={16} />} className="w-full">
                Upload Address Proof
              </Button>
            </Upload>
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <div className="mb-6 px-4 sm:px-0">
      <style>
        {`
          .ant-modal {
            width: 90vw !important;
            max-width: 800px !important;
          }
          .ant-form-item {
            margin-bottom: 16px !important;
          }
          .ant-btn {
            padding: 8px 16px;
          }
          .ant-upload {
            width: 100%;
          }
          .ant-form-item-label {
            padding-bottom: 4px !important;
          }
          .ant-input, .ant-select, .ant-picker, .ant-input-number {
            width: 100% !important;
          }
          .step-content {
            max-height: none;
            overflow-y: hidden;
            padding: 16px 0;
          }
          .ant-steps {
            margin-bottom: 24px;
          }
        `}
      </style>
      <div className="flex justify-end mb-4">
        <Space>
          <Button
            icon={<Edit size={16} />}
            type="primary"
            ghost
            onClick={() => {
              if (car) {
                const initialValues = {
                  ...car,
                  carPurchaseDate: car.carPurchaseDate ? dayjs(car.carPurchaseDate) : null,
                  carImage: getDefaultFileList(car.carImage, 'Main Car Image'),
                  carImage1: getDefaultFileList(car.carImage1, 'Additional Car Image 1'),
                  carImage2: getDefaultFileList(car.carImage2, 'Additional Car Image 2'),
                  carImage3: getDefaultFileList(car.carImage3, 'Additional Car Image 3'),
                  carImage4: getDefaultFileList(car.carImage4, 'Additional Car Image 4'),
                  carImage5: getDefaultFileList(car.carImage5, 'Additional Car Image 5'),
                  carImage6: getDefaultFileList(car.carImage6, 'Additional Car Image 6'),
                  carImage7: getDefaultFileList(car.carImage7, 'Additional Car Image 7'),
                  carImage8: getDefaultFileList(car.carImage8, 'Additional Car Image 8'),
                  carImage9: getDefaultFileList(car.carImage9, 'Additional Car Image 9'),
                  carImage10: getDefaultFileList(car.carImage10, 'Additional Car Image 10'),
                  carImage11: getDefaultFileList(car.carImage11, 'Additional Car Image 11'),
                  carImage12: getDefaultFileList(car.carImage12, 'Additional Car Image 12'),
                  carImage13: getDefaultFileList(car.carImage13, 'Additional Car Image 13'),
                  carImage14: getDefaultFileList(car.carImage14, 'Additional Car Image 14'),
                  carImage15: getDefaultFileList(car.carImage15, 'Additional Car Image 15'),
                  carRcDocument: getDefaultFileList(car.carRcDocument, 'RC Document'),
                  carInsuranceDocument: getDefaultFileList(car.carInsuranceDocument, 'Insurance Document'),
                  carPucDocument: getDefaultFileList(car.carPucDocument, 'PUC Document'),
                  sellerPhoto: getDefaultFileList(car.sellerPhoto, 'Seller Photo'),
                  sellerAadharCard: getDefaultFileList(car.sellerAadharCard, 'Aadhar Card'),
                  sellerPanCard: getDefaultFileList(car.sellerPanCard, 'PAN Card'),
                  sellerAddressProof: getDefaultFileList(car.sellerAddressProof, 'Address Proof'),
                };
                console.log('Setting form values on edit click:', initialValues); // Debug log
                form.setFieldsValue(initialValues);
              }
              setIsModalVisible(true);
            }}
            disabled={!car}
            style={isHovered ? { ...baseStyle, ...hoverStyle } : baseStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            Edit
          </Button>
          <Button
            danger
            icon={<Trash2 size={16} />}
            onClick={() => setIsDeleteModalVisible(true)}
            disabled={!car}
          >
            Delete
          </Button>
        </Space>
      </div>

      <Modal
        title="Edit Car"
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setCurrentStep(0);
          setAdditionalImages([]);
          form.resetFields();
        }}
        footer={null}
        width="90%"
        className="top-10"
      >
        <Steps current={currentStep} className="mb-6">
          {steps.map((item) => (
            <Step key={item.title} title={item.title} />
          ))}
        </Steps>
        <Form
          form={form}
          layout="vertical"
          className="step-content"
          onKeyDown={handleKeyDown}
        >
          {steps[currentStep].content}
          <div className="flex justify-between mt-6">
            <Button
              onClick={prevStep}
              disabled={currentStep === 0}
              className="w-[120px]"
            >
              Previous
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button
                type="primary"
                onClick={nextStep}
                className="w-[120px] bg-blue-500 hover:bg-blue-600"
                htmlType="button"
              >
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleEdit}
                loading={isSubmitting}
                className="w-[120px] bg-blue-500 hover:bg-blue-600"
              >
                Update Car
              </Button>
            )}
          </div>
        </Form>
      </Modal>

      <Modal
        title="Delete Confirmation"
        open={isDeleteModalVisible}
        footer={null}
        width={400}
        onCancel={() => setIsDeleteModalVisible(false)}
      >
        <p>Are you sure you want to delete this car?</p>
        <div className="mt-6 flex justify-end">
          <Space>
            <Button onClick={() => setIsDeleteModalVisible(false)}>
              Cancel
            </Button>
            <Button
              danger
              icon={<Trash2 size={16} />}
              onClick={handleDelete}
              loading={isSubmitting}
            >
              Delete
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default CarEditForm;