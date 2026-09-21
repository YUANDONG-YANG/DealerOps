import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/layout/ThemeContext';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './router/ProtectedRoute';
import CarDashboard from './pages/CarDashboard';
import CarDetailsTable from './pages/cars/CarDetailsTable';
import SellerDashboard from './pages/SellerDashboard';
import BuyersDashboard from './pages/BuyersDashboard';
import BuyerDetailsTable from './pages/buyers/BuyerDetailsTable';
import InquiryDashboard from './pages/inquiryDashboard';
import InquiryDetailsTable from './pages/inquiry/InquiryDetailsTable';
import BookingDashboard from './pages/BookingDashboard';
import BookingDetailsTable from './pages/bookings/BookingDetailsTable';
import DealershipDashboard from './pages/DealershipDashboard';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeDetails from './pages/employee/EmployeeDetails';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/EmailVerification';
import CreateUser from './pages/CreateUser';
import AccountsDashboard from './pages/AccountsDashboard';


function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="cars" element={<CarDashboard />} />
              <Route path="cars/:id" element={<CarDetailsTable />} />
              <Route path="sellers" element={<SellerDashboard />} />
              <Route path="buyers" element={<BuyersDashboard />} />
              <Route path="buyers/:id" element={<BuyerDetailsTable />} />
              <Route path="inquiries" element={<InquiryDashboard />} />
              <Route path="inquiries/:id" element={<InquiryDetailsTable />} />
              <Route path="bookings" element={<BookingDashboard />} />
              <Route path="bookings/:id" element={<BookingDetailsTable />} />
              <Route path="dealership" element={<DealershipDashboard />} />
              <Route path="employee" element={<EmployeeDashboard />} />
              <Route path="employee/:id" element={<EmployeeDetails />} />
              <Route path="accounts" element={<AccountsDashboard />} />
              <Route path="*" element={<Navigate to="/" replace />} />
              <Route path="/create-user/" element={<CreateUser />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;