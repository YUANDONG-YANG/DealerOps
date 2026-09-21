// import React, { useEffect, useState } from 'react';
// import { Table, Spin, ConfigProvider, Select, InputNumber, Input, DatePicker } from 'antd';
// import { message } from 'antd';
// import { useTheme } from '../../components/layout/ThemeContext';
// import Card from '../../components/ui/Card';
// import { accountsService } from '../../services/api';
// import { Dayjs } from 'dayjs';
// import { motion } from 'framer-motion';
// import { InfoIcon, DollarSignIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

// const { Option } = Select;
// const { RangePicker } = DatePicker;

// // Unified interface for all profit/loss data
// interface ProfitLossItem {
//   carMakeModel: string;
//   vin: string;
//   purchasePrice: number;
//   maintenancePrice: number;
//   maintenanceDetails: string | null;
//   salePrice: number;
//   profit: number;
//   loss: number;
// }

// interface ProfitLossResponse {
//   message?: string | null;
//   profitMessage?: string | null;
//   lossMessage?: string | null;
//   netMessage?: string | null;
//   details?: ProfitLossItem[];
// }

// const UnifiedProfitLossTable: React.FC = () => {
//   const [data, setData] = useState<ProfitLossResponse | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [filterType, setFilterType] = useState<string>('yearly');
//   const [year, setYear] = useState<number>(new Date().getFullYear());
//   const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
//   const [date, setDate] = useState<Dayjs | null>(null);
//   const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
//   const [vin, setVin] = useState<string>('');
//   const { theme } = useTheme();
//   const currentYear = new Date().getFullYear();

//   const months = [
//     { value: 1, label: 'January' },
//     { value: 2, label: 'February' },
//     { value: 3, label: 'March' },
//     { value: 4, label: 'April' },
//     { value: 5, label: 'May' },
//     { value: 6, label: 'June' },
//     { value: 7, label: 'July' },
//     { value: 8, label: 'August' },
//     { value: 9, label: 'September' },
//     { value: 10, label: 'October' },
//     { value: 11, label: 'November' },
//     { value: 12, label: 'December' },
//   ];

//   useEffect(() => {
//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         let response: ProfitLossResponse | ProfitLossItem;
//         switch (filterType) {
//           case 'yearly':
//             if (!year) throw new Error('Year is required');
//             response = await accountsService.getYearlyProfitLossTable(year);
//             break;
//           case 'monthly':
//             if (!month || !year) throw new Error('Month and year are required');
//             response = await accountsService.getMonthlyProfitLoss(month, year);
//             break;
//           case 'dateRange':
//             if (!dateRange[0] || !dateRange[1]) {
//               setData(null);
//               return;
//             }
//             response = await accountsService.getProfitLossBetweenDates(
//               dateRange[0].format('YYYY-MM-DD'),
//               dateRange[1].format('YYYY-MM-DD')
//             );
//             break;
//           case 'daily':
//             if (!date) {
//               setData(null);
//               return;
//             }
//             response = await accountsService.getProfitLossOnDate(date.format('YYYY-MM-DD'));
//             break;
//           case 'vin':
//             if (!vin.trim()) {
//               setData(null);
//               return;
//             }
//             response = await accountsService.getProfitLossByVin(vin.toUpperCase());
//             break;
//           default:
//             setData(null);
//             return;
//         }
//         // Normalize VIN response to match ProfitLossResponse
//         if (filterType === 'vin') {
//           setData({ details: [response as ProfitLossItem] });
//         } else {
//           setData(response as ProfitLossResponse);
//         }
//       } catch (error) {
//         message.error('Failed to fetch profit/loss data');
//         console.error('UnifiedProfitLossTable error:', error);
//         setData(null);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, [filterType, year, month, date, dateRange, vin]);

//   const columns = [
//     {
//       title: 'Car Make & Model',
//       dataIndex: 'carMakeModel',
//       key: 'carMakeModel',
//     },
//     {
//       title: 'VIN',
//       dataIndex: 'vin',
//       key: 'vin',
//     },
//     {
//       title: 'Purchase Price',
//       dataIndex: 'purchasePrice',
//       key: 'purchasePrice',
//       render: (price: number) => `₹${price.toLocaleString('en-IN')}`,
//     },
//     {
//       title: 'Maintenance Price',
//       dataIndex: 'maintenancePrice',
//       key: 'maintenancePrice',
//       render: (price: number) => `₹${price.toLocaleString('en-IN')}`,
//     },
//     {
//       title: 'Maintenance Details',
//       dataIndex: 'maintenanceDetails',
//       key: 'maintenanceDetails',
//       render: (text: string | null) => text || '-',
//     },
//     {
//       title: 'Sale Price',
//       dataIndex: 'salePrice',
//       key: 'salePrice',
//       render: (price: number) => `₹${price.toLocaleString('en-IN')}`,
//     },
//     {
//       title: 'Profit',
//       dataIndex: 'profit',
//       key: 'profit',
//       render: (profit: number) => `₹${profit.toLocaleString('en-IN')}`,
//     },
//     {
//       title: 'Loss',
//       dataIndex: 'loss',
//       key: 'loss',
//       render: (loss: number) => `₹${loss.toLocaleString('en-IN')}`,
//     },
//   ];

//   const tableTheme = {
//     token: {
//       colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
//       colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
//       colorTextHeading: theme === 'dark' ? '#C9D6E3' : '#1C2731',
//       colorBorderSecondary: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
//       colorBgContainerHover: theme === 'dark' ? '#1A2734' : '#EEE0C9',
//       colorBgContainerSelected: theme === 'dark' ? '#1A2734' : '#ADC4CE',
//       fontSize: 14,
//       borderRadius: 8,
//     },
//     components: {
//       Table: {
//         headerBg: theme === 'dark' ? '#14212E' : '#2A4759',
//         headerColor: theme === 'dark' ? '#C9D6E3' : '#eeeeee',
//         rowHoverBg: theme === 'dark' ? '#1F2A44' : '#E6F0FA',
//         cellPaddingBlock: 16,
//         cellPaddingInline: 16,
//       },
//       Select: {
//         colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
//         colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
//         colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
//         activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
//         hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
//       },
//       InputNumber: {
//         colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
//         colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
//         colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
//         activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
//         hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
//       },
//       Input: {
//         colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
//         colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
//         colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
//         activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
//         hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
//       },
//       DatePicker: {
//         colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
//         colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
//         colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
//         activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
//         hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
//       },
//     },
//   };

//   const dataSource = data?.details?.map((item, index) => ({
//     ...item,
//     key: `${item.vin}-${index}`,
//   })) || [];

//   // Define card items for messages
//   const messageItems = [
//     {
//       title: 'Total Profit',
//       value: data?.profitMessage || 'No profit data',
//       icon: <TrendingUpIcon className="text-green-500" />,
//       bgColor: 'bg-green-100 dark:bg-green-900/40',
//       textColor: 'text-green-600 dark:text-green-400',
//     },
//     {
//       title: 'Total Loss',
//       value: data?.lossMessage || 'No loss data',
//       icon: <TrendingDownIcon className="text-red-500" />,
//       bgColor: 'bg-red-100 dark:bg-red-900/40',
//       textColor: 'text-red-600 dark:text-red-400',
//     },
//     {
//       title: 'Net Result',
//       value:
//         (filterType === 'dateRange' || filterType === 'daily')
//           ? (data?.message || 'No net data')
//           : (data?.netMessage || 'No net data'),
//       icon: <DollarSignIcon className="text-purple-500" />,
//       bgColor: 'bg-purple-100 dark:bg-purple-900/40',
//       textColor: 'text-purple-600 dark:text-purple-400',
//     },
//   ];

//   const getTitle = () => {
//     switch (filterType) {
//       case 'yearly':
//         return `Profit/Loss for ${year}`;
//       case 'monthly':
//         return `Profit/Loss for ${months[month - 1]?.label || 'Month'} ${year}`;
//       case 'dateRange':
//         return dateRange[0] && dateRange[1]
//           ? `Profit/Loss from ${dateRange[0].format('D MMMM YYYY')} to ${dateRange[1].format('D MMMM YYYY')}`
//           : 'Profit/Loss for Date Range';
//       case 'daily':
//         return date ? `Profit/Loss for ${date.format('D MMMM YYYY')}` : 'Profit/Loss for Selected Date';
//       case 'vin':
//         return vin ? `Profit/Loss for VIN: ${vin}` : 'Profit/Loss by VIN';
//       default:
//         return 'Profit/Loss Summary';
//     }
//   };

//   const handleYearChange = (value: number | null) => {
//     if (value && value >= 2010 && value <= currentYear) {
//       setYear(value);
//     } else {
//       message.error(`Please enter a year between 2010 and ${currentYear}`);
//     }
//   };

//   const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setVin(e.target.value);
//   };

//   const handleVinSearch = (value: string) => {
//     if (!value.trim()) {
//       message.error('Please enter a valid VIN');
//       setVin('');
//       return;
//     }
//     setVin(value.toUpperCase().trim());
//   };

//   return (
//     <div className="mb-6">
//       <Card
//         title={getTitle()}
//         className="mt-6"
//         glassmorphism={true}
//         header={
//           <div
//             style={{
//               display: 'flex',
//               flexDirection: 'row',
//               justifyContent: 'center',
//               alignItems: 'center',
//               gap: '16px',
//               flexWrap: 'wrap',
//               padding: '0px 16px',
//             }}
//           >
//             <Select
//               value={filterType}
//               onChange={(value) => {
//                 setFilterType(value);
//                 setData(null); // Reset data when filter changes
//               }}
//               style={{ width: '100px' }}
//               className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                 }`}
//             >
//               <Option value="yearly">Yearly</Option>
//               <Option value="monthly">Monthly</Option>
//               <Option value="dateRange">Date Range</Option>
//               <Option value="daily">Daily</Option>
//               <Option value="vin">VIN</Option>
//             </Select>
//             {filterType === 'yearly' && (
//               <>
//                 <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//                   Year
//                 </label>
//                 <InputNumber
//                   value={year}
//                   onChange={handleYearChange}
//                   min={2010}
//                   max={currentYear}
//                   style={{ width: '100px' }}
//                   className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                     }`}
//                 />
//               </>
//             )}
//             {filterType === 'monthly' && (
//               <>
//                 <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//                   Month
//                 </label>
//                 <Select
//                   value={month}
//                   onChange={(value) => setMonth(value)}
//                   style={{ width: '120px' }}
//                   className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                     }`}
//                 >
//                   {months.map((m) => (
//                     <Option key={m.value} value={m.value}>
//                       {m.label}
//                     </Option>
//                   ))}
//                 </Select>
//                 <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//                   Year
//                 </label>
//                 <InputNumber
//                   value={year}
//                   onChange={handleYearChange}
//                   min={2010}
//                   max={currentYear}
//                   style={{ width: '100px' }}
//                   className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                     }`}
//                 />
//               </>
//             )}
//             {filterType === 'dateRange' && (
//               <>
//                 <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//                   Date Range
//                 </label>
//                 <RangePicker
//                   value={dateRange}
//                   onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] || [null, null])}
//                   format="YYYY-MM-DD"
//                   style={{ width: '220px' }}
//                   className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                     }`}
//                   allowClear
//                 />
//               </>
//             )}
//             {filterType === 'daily' && (
//               <>
//                 <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//                   Date
//                 </label>
//                 <DatePicker
//                   value={date}
//                   onChange={setDate}
//                   format="YYYY-MM-DD"
//                   style={{ width: '150px' }}
//                   className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                     }`}
//                   allowClear
//                 />
//               </>
//             )}
//             {filterType === 'vin' && (
//               <>
//                 <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//                   VIN
//                 </label>
//                 <Input.Search
//                   placeholder="Enter VIN (e.g., MH12XX0001)"
//                   value={vin.toLocaleUpperCase()}
//                   onChange={handleVinChange}
//                   onSearch={handleVinSearch}
//                   style={{ width: '200px' }}
//                   className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
//                     }`}
//                   allowClear
//                 />
//               </>
//             )}
//           </div>
//         }
//       >
//         {loading ? (
//           <div style={{ textAlign: 'center', padding: '24px' }}>
//             <Spin size="large" />
//           </div>
//         ) : data?.details?.length ? (
//           <>
//             {/* Conditionally render messageItems only if filterType is not 'vin' */}
//             {filterType !== 'vin' && (
//               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
//                 {messageItems.map((item, index) => (
//                   <motion.div
//                     key={item.title}
//                     className={`${item.bgColor} rounded-lg p-4 flex items-center`}
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ delay: index * 0.1 }}
//                   >
//                     <div className="p-3 rounded-full bg-white dark:bg-gray-800 mr-4">
//                       {item.icon}
//                     </div>
//                     <div>
//                       <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
//                         {item.title}
//                       </p>
//                       <p className={`text-lg font-semibold ${item.textColor}`}>
//                         {item.value}
//                       </p>
//                     </div>
//                   </motion.div>
//                 ))}
//               </div>
//             )}
//             <ConfigProvider theme={tableTheme}>
//               <Table
//                 columns={columns}
//                 dataSource={dataSource}
//                 rowKey="key"
//                 scroll={{ x: 'max-content' }}
//               />
//             </ConfigProvider>
//           </>
//         ) : (
//           <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
//             {filterType === 'yearly' && !year
//               ? 'Please select a year.'
//               : filterType === 'monthly' && (!month || !year)
//                 ? 'Please select a month and year.'
//                 : filterType === 'dateRange' && (!dateRange[0] || !dateRange[1])
//                   ? 'Please select a date range.'
//                   : filterType === 'daily' && !date
//                     ? 'Please select a date.'
//                     : filterType === 'vin' && !vin
//                       ? 'Please enter a VIN.'
//                       : `No data available for the selected ${filterType} filter.`}
//           </p>
//         )}
//       </Card>
//     </div>
//   );
// };

// export default UnifiedProfitLossTable;

import React, { useEffect, useState } from 'react';
import { Table, Spin, ConfigProvider, Select, InputNumber, Input, DatePicker } from 'antd';
import { message } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/Card';
import { accountsService } from '../../services/api';
import { Dayjs } from 'dayjs';
import { motion } from 'framer-motion';
import { DollarSignIcon, TrendingUpIcon, TrendingDownIcon } from 'lucide-react';

const { Option } = Select;
const { RangePicker } = DatePicker;

// Unified interface for all profit/loss data
interface ProfitLossItem {
  carMakeModel: string;
  vin: string;
  purchasePrice: number;
  maintenancePrice: number;
  maintenanceDetails: string | null;
  salePrice: number;
  grossProfit: number;
  netProfit: number;
  profit: number;
  loss: number;
}

interface ProfitLossResponse {
  message?: string | null;
  profitMessage?: string | null;
  lossMessage?: string | null;
  netMessage?: string | null;
  details?: ProfitLossItem[];
}

const UnifiedProfitLossTable: React.FC = () => {
  const [data, setData] = useState<ProfitLossResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('yearly');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [date, setDate] = useState<Dayjs | null>(null);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [vin, setVin] = useState<string>('');
  const [submittedVin, setSubmittedVin] = useState<string>(''); // Track submitted VIN
  const { theme } = useTheme();
  const currentYear = new Date().getFullYear();

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let response: ProfitLossResponse | ProfitLossItem;
        switch (filterType) {
          case 'yearly':
            if (!year) throw new Error('Year is required');
            response = await accountsService.getYearlyProfitLossTable(year);
            break;
          case 'monthly':
            if (!month || !year) throw new Error('Month and year are required');
            response = await accountsService.getMonthlyProfitLoss(month, year);
            break;
          case 'dateRange':
            if (!dateRange[0] || !dateRange[1]) {
              setData(null);
              return;
            }
            response = await accountsService.getProfitLossBetweenDates(
              dateRange[0].format('YYYY-MM-DD'),
              dateRange[1].format('YYYY-MM-DD')
            );
            break;
          case 'daily':
            if (!date) {
              setData(null);
              return;
            }
            response = await accountsService.getProfitLossOnDate(date.format('YYYY-MM-DD'));
            break;
          case 'vin':
            if (!submittedVin.trim()) {
              setData(null);
              return;
            }
            response = await accountsService.getProfitLossByVin(submittedVin.toUpperCase());
            break;
          default:
            setData(null);
            return;
        }
        // Normalize VIN response to match ProfitLossResponse
        if (filterType === 'vin') {
          setData({ details: [response as ProfitLossItem] });
        } else {
          setData(response as ProfitLossResponse);
        }
      } catch (error) {
        message.error('Failed to fetch profit/loss data');
        console.error('UnifiedProfitLossTable error:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [filterType, year, month, date, dateRange, submittedVin]);

  const columns = [
    {
      title: 'Car Make & Model',
      dataIndex: 'carMakeModel',
      key: 'carMakeModel',
    },
    {
      title: 'VIN',
      dataIndex: 'vin',
      key: 'vin',
    },
    {
      title: 'Purchase Price',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      render: (price: number) => `₹${price.toLocaleString('en-IN')}`,
    },
    {
      title: 'Maintenance Price',
      dataIndex: 'maintenancePrice',
      key: 'maintenancePrice',
      render: (price: number) => `₹${price.toLocaleString('en-IN')}`,
    },
    {
      title: 'Maintenance Details',
      dataIndex: 'maintenanceDetails',
      key: 'maintenanceDetails',
      render: (text: string | null) => text || '-',
    },
    {
      title: 'Sale Price',
      dataIndex: 'salePrice',
      key: 'salePrice',
      render: (price: number) => `₹${price.toLocaleString('en-IN')}`,
    },
    {
      title: 'Profit',
      dataIndex: 'profit',
      key: 'profit',
      render: (profit: number) => `₹${profit.toLocaleString('en-IN')}`,
    },
    {
      title: 'Loss',
      dataIndex: 'loss',
      key: 'loss',
      render: (loss: number) => `₹${loss.toLocaleString('en-IN')}`,
    },
  ];

  const tableTheme = {
    token: {
      colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
      colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
      colorTextHeading: theme === 'dark' ? '#C9D6E3' : '#1C2731',
      colorBorderSecondary: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
      colorBgContainerHover: theme === 'dark' ? '#1A2734' : '#EEE0C9',
      colorBgContainerSelected: theme === 'dark' ? '#1A2734' : '#ADC4CE',
      fontSize: 14,
      borderRadius: 8,
    },
    components: {
      Table: {
        headerBg: theme === 'dark' ? '#14212E' : '#2A4759',
        headerColor: theme === 'dark' ? '#C9D6E3' : '#eeeeee',
        rowHoverBg: theme === 'dark' ? '#1F2A44' : '#E6F0FA',
        cellPaddingBlock: 16,
        cellPaddingInline: 16,
      },
      Select: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
        activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
        hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
      },
      InputNumber: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
        activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
        hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
      },
      Input: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
        activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
        hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
      },
      DatePicker: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
        activeBorderColor: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
        hoverBorderColor: theme === 'dark' ? '#6B7280' : '#A0AEC0',
      },
    },
  };

  const dataSource = data?.details?.map((item, index) => ({
    ...item,
    key: `${item.vin}-${index}`,
  })) || [];

  // // Define card items for messages
  // const messageItems = [
  //   {
  //     title: 'Total Profit',
  //     value: data?.profitMessage || 'No profit data',
  //     icon: <TrendingUpIcon className="text-green-500" />,
  //     bgColor: 'bg-green-100 dark:bg-green-900/40',
  //     textColor: 'text-green-600 dark:text-green-400',
  //   },
  //   {
  //     title: 'Total Loss',
  //     value: data?.lossMessage || 'No loss data',
  //     icon: <TrendingDownIcon className="text-red-500" />,
  //     bgColor: 'bg-red-100 dark:bg-red-900/40',
  //     textColor: 'text-red-600 dark:text-red-400',
  //   },
  //   {
  //     title: 'Net Result',
  //     value: (filterType === 'dateRange' || filterType === 'daily')
  //       ? (data?.message || 'No net data')
  //       : (data?.netMessage || 'No net data'),
  //     icon: <DollarSignIcon className="text-purple-500" />,
  //     bgColor: 'bg-purple-100 dark:bg-purple-900/40',
  //     textColor: 'text-purple-600 dark:text-purple-400',
  //   },
  // ];

  // Calculate total profit, total loss, and net result for VIN filter
  const totalProfit = data?.details?.reduce((sum, item) => sum + item.profit, 0) || 0;
  const totalLoss = data?.details?.reduce((sum, item) => sum + item.loss, 0) || 0;
  const netResult = Math.abs(totalProfit - totalLoss); // Use Math.abs to avoid negative sign

  // Define card items for messages
  const messageItems = [
    {
      title: 'Total Profit',
      value:
        filterType === 'vin'
          ? `₹${totalProfit.toLocaleString('en-IN')}`
          : data?.profitMessage || 'No profit data',
      icon: <TrendingUpIcon className="text-green-500" />,
      bgColor: 'bg-green-100 dark:bg-green-900/40',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'Total Loss',
      value:
        filterType === 'vin'
          ? `₹${totalLoss.toLocaleString('en-IN')}`
          : data?.lossMessage || 'No loss data',
      icon: <TrendingDownIcon className="text-red-500" />,
      bgColor: 'bg-red-100 dark:bg-red-900/40',
      textColor: 'text-red-600 dark:text-red-400',
    },
    {
      title: 'Net Result',
      value:
        filterType === 'dateRange' || filterType === 'daily'
          ? data?.message || 'No net data'
          : filterType === 'vin'
          ? `₹${netResult.toLocaleString('en-IN')}`
          : data?.netMessage || 'No net data',
      icon: <DollarSignIcon className="text-purple-500" />,
      bgColor: 'bg-purple-100 dark:bg-purple-900/40',
      textColor: 'text-purple-600 dark:text-purple-400',
    },
  ];
  
  const getTitle = () => {
    switch (filterType) {
      case 'yearly':
        return `Profit/Loss for ${year}`;
      case 'monthly':
        return `Profit/Loss for ${months[month - 1]?.label || 'Month'} ${year}`;
      case 'dateRange':
        return dateRange[0] && dateRange[1]
          ? `Profit/Loss from ${dateRange[0].format('D MMMM YYYY')} to ${dateRange[1].format('D MMMM YYYY')}`
          : 'Profit/Loss for Date Range';
      case 'daily':
        return date ? `Profit/Loss for ${date.format('D MMMM YYYY')}` : 'Profit/Loss for Selected Date';
      case 'vin':
        return submittedVin ? `Profit/Loss for VIN: ${submittedVin}` : 'Profit/Loss by VIN';
      default:
        return 'Profit/Loss Summary';
    }
  };

  const handleYearChange = (value: number | null) => {
    if (value && value >= 2010 && value <= currentYear) {
      setYear(value);
    } else {
      message.error(`Please enter a year between 2010 and ${currentYear}`);
    }
  };

  const handleVinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVin(e.target.value.toUpperCase());
  };

  const handleVinSearch = (value: string) => {
    const trimmedValue = value.trim().toUpperCase();
    if (!trimmedValue || trimmedValue.length < 10) {
      message.error('Please enter a valid VIN (at least 10 characters)');
      setSubmittedVin('');
      setData(null);
      return;
    }
    setSubmittedVin(trimmedValue);
  };

  return (
    <div className="mb-6">
      <Card
        title={getTitle()}
        className="mt-6"
        glassmorphism={true}
        header={
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              padding: '0px 16px',
            }}
          >
            <Select
              value={filterType}
              onChange={(value) => {
                setFilterType(value);
                setData(null); // Reset data when filter changes
                if (value !== 'vin') {
                  setVin('');
                  setSubmittedVin('');
                }
              }}
              style={{ width: '100px' }}
              className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
            >
              <Option value="yearly">Yearly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="dateRange">Date Range</Option>
              <Option value="daily">Daily</Option>
              <Option value="vin">VIN</Option>
            </Select>
            {filterType === 'yearly' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Year
                </label>
                <InputNumber
                  value={year}
                  onChange={handleYearChange}
                  min={2010}
                  max={currentYear}
                  style={{ width: '100px' }}
                  className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
                />
              </>
            )}
            {filterType === 'monthly' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Month
                </label>
                <Select
                  value={month}
                  onChange={(value) => setMonth(value)}
                  style={{ width: '120px' }}
                  className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
                >
                  {months.map((m) => (
                    <Option key={m.value} value={m.value}>
                      {m.label}
                    </Option>
                  ))}
                </Select>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Year
                </label>
                <InputNumber
                  value={year}
                  onChange={handleYearChange}
                  min={2010}
                  max={currentYear}
                  style={{ width: '100px' }}
                  className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
                />
              </>
            )}
            {filterType === 'dateRange' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Date Range
                </label>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] || [null, null])}
                  format="YYYY-MM-DD"
                  style={{ width: '220px' }}
                  className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
                  allowClear
                />
              </>
            )}
            {filterType === 'daily' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Date
                </label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  format="YYYY-MM-DD"
                  style={{ width: '150px' }}
                  className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
                  allowClear
                />
              </>
            )}
            {filterType === 'vin' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  VIN
                </label>
                <Input.Search
                  placeholder="Enter VIN (e.g., MH12XX0001)"
                  value={vin}
                  onChange={handleVinChange}
                  onSearch={handleVinSearch}
                  style={{ width: '200px' }}
                  className={`!rounded-md !border ${theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'}`}
                  allowClear
                />
              </>
            )}
          </div>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <Spin size="large" />
          </div>
        ) : data?.details?.length ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {messageItems.map((item, index) => (
                <motion.div
                  key={item.title}
                  className={`${item.bgColor} rounded-lg p-4 flex items-center`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="p-3 rounded-full bg-white dark:bg-gray-800 mr-4">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {item.title}
                    </p>
                    <p className={`text-lg font-semibold ${item.textColor}`}>
                      {item.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
            <ConfigProvider theme={tableTheme}>
              <Table
                columns={columns}
                dataSource={dataSource}
                rowKey="key"
                scroll={{ x: 'max-content' }}
              />
            </ConfigProvider>
          </>
        ) : (
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            {filterType === 'yearly' && !year
              ? 'Please select a year.'
              : filterType === 'monthly' && (!month || !year)
              ? 'Please select a month and year.'
              : filterType === 'dateRange' && (!dateRange[0] || !dateRange[1])
              ? 'Please select a date range.'
              : filterType === 'daily' && !date
              ? 'Please select a date.'
              : filterType === 'vin' && !vin
              ? 'Please enter a VIN.'
              : `No data available for the selected ${filterType} filter.`}
          </p>
        )}
      </Card>
    </div>
  );
};

export default UnifiedProfitLossTable;