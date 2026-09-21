import React, { useState } from 'react';
import { Button, Select, InputNumber, DatePicker, ConfigProvider, message } from 'antd';
import { useTheme } from '../../components/layout/ThemeContext';
import Card from '../../components/ui/CardTable';
import { accountsService } from '../../services/api';
import dayjs, { Dayjs } from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

const ExportReportsTable: React.FC = () => {
  const [exportType, setExportType] = useState<string>('yearly');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [loading, setLoading] = useState<boolean>(false);
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

  const handleExport = async () => {
    setLoading(true);
    try {
      let response: Blob;
      let filename: string;

      switch (exportType) {
        case 'yearly':
          if (!year) throw new Error('Year is required');
          response = (await accountsService.exportYearlyProfitLossPdf(year)).data;
          filename = `Profit_Loss_Yearly_${year}.pdf`;
          break;
        case 'monthly':
          if (!month || !year) throw new Error('Month and year are required');
          response = (await accountsService.exportMonthlyProfitLossPdf(year, month)).data;
          filename = `Profit_Loss_Monthly_${months[month - 1].label}_${year}.pdf`;
          break;
        case 'dateRange':
          if (!dateRange[0] || !dateRange[1]) throw new Error('Date range is required');
          response = (await accountsService.exportProfitLossBetweenDates(
            dateRange[0].format('YYYY-MM-DD'),
            dateRange[1].format('YYYY-MM-DD')
          )).data;
          filename = `Profit_Loss_${dateRange[0].format('YYYY-MM-DD')}_to_${dateRange[1].format('YYYY-MM-DD')}.pdf`;
          break;
        default:
          throw new Error('Invalid export type');
      }

      // Create a URL for the blob and trigger download
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      message.error('Failed to export PDF');
      console.error('ExportReportsTable error:', error);
    } finally {
      setLoading(false);
    }
  };

  const tableTheme = {
    token: {
      colorBgContainer: theme === 'dark' ? '#0B1118' : '#F8FAFC',
      colorText: theme === 'dark' ? '#C9D6E3' : '#221C30',
      colorBorderSecondary: theme === 'dark' ? '#2F3B4A' : '#BCCCDC',
      fontSize: 14,
      borderRadius: 8,
    },
    components: {
      Select: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
      },
      InputNumber: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
      },
      DatePicker: {
        colorBgContainer: theme === 'dark' ? '#1A202C' : '#FFFFFF',
        colorText: theme === 'dark' ? '#C9D6E3' : '#1A202C',
        colorBorder: theme === 'dark' ? '#4A4A5C' : '#CCCCCC',
      },
      Button: {
        colorPrimary: theme === 'dark' ? '#5A90FF' : '#2B6CB0',
        colorPrimaryHover: theme === 'dark' ? '#6BA3FF' : '#3B82F6',
      },
    },
  };

  return (
    <div className="mb-6">
      <Card
        title="Export Profit/Loss Reports"
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
              padding: '8px 16px',
            }}
          >
            <Select
              value={exportType}
              onChange={setExportType}
              style={{ width: '120px' }}
              className={`!rounded-md !border ${
                theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
              }`}
            >
              <Option value="yearly">Yearly</Option>
              <Option value="monthly">Monthly</Option>
              <Option value="dateRange">Date Range</Option>
            </Select>
            {exportType === 'yearly' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Year
                </label>
                <InputNumber
                  value={year}
                  onChange={(value) => setYear(value || currentYear)}
                  min={2010}
                  max={currentYear}
                  style={{ width: '100px' }}
                  className={`!rounded-md !border ${
                    theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
                  }`}
                />
              </>
            )}
            {exportType === 'monthly' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Month
                </label>
                <Select
                  value={month}
                  onChange={(value) => setMonth(value)}
                  style={{ width: '120px' }}
                  className={`!rounded-md !border ${
                    theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
                  }`}
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
                  onChange={(value) => setYear(value || currentYear)}
                  min={2010}
                  max={currentYear}
                  style={{ width: '100px' }}
                  className={`!rounded-md !border ${
                    theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
                  }`}
                />
              </>
            )}
            {exportType === 'dateRange' && (
              <>
                <label className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                  Date Range
                </label>
                <RangePicker
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null])}
                  format="YYYY-MM-DD"
                  style={{ width: '220px' }}
                  className={`!rounded-md !border ${
                    theme === 'dark' ? '!bg-gray-800 !text-white !border-gray-600' : '!bg-white !text-black !border-gray-300'
                  }`}
                  allowClear
                />
              </>
            )}
            <Button
              type="primary"
              onClick={handleExport}
              loading={loading}
              className={`!rounded-md ${
                theme === 'dark' ? '!bg-blue-600 !text-white' : '!bg-blue-500 !text-white'
              }`}
            >
              Export PDF
            </Button>
          </div>
        }
      >
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
          Select the report type and parameters above to export the profit/loss report as a PDF.
        </p>
      </Card>
    </div>
  );
};

export default ExportReportsTable;