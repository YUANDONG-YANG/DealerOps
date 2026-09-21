import axios from 'axios';
import { getToken } from './auth';

// Create axios instance with base URL
const api = axios.create({
  baseURL: 'https://carventory.duckdns.org/api',
  headers: {
    'Content-Type': 'application/json',
  },
});



// Add request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    console.log('Sending request:', {
      url: config.url,
      method: config.method,
      headers: config.headers,
      token: token ? 'Present' : 'Missing'
    });
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handlingnp
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);


    export const accountsService = {
      // Calculate total profit or loss
      calculateProfitOrLoss: () =>
        api.get('/accounts/total-profit').then((res) => res.data),

      // Get profit/loss by VIN
      getProfitLossByVin: (vin: string) =>
        api.get(`/accounts/vin/${vin}`).then((res) => res.data),

      // Get profit/loss for a specific date
      getProfitLossOnDate: (date: string) =>
        api.get(`/accounts/on/${date}`).then((res) => res.data),

      // Get profit/loss between dates
      getProfitLossBetweenDates: (startDate: string, endDate: string) =>
        api.get(`/accounts/from/${startDate}/to/${endDate}`).then((res) => res.data),

      // Get monthly profit/loss
      getMonthlyProfitLoss: (month: number, year: number) =>
        api.get(`/accounts/monthly/${month}/${year}`).then((res) => res.data),

      // Get yearly profit/loss summary
      getYearlyProfitLossSummary: (year: number) =>
        api.get(`/accounts/yearly/${year}`).then((res) => res.data),

      // Get yearly profit/loss for table
      getYearlyProfitLossTable: (year: number) =>
        api.get(`/accounts/yearly/${year}`).then((res) => res.data),

      // Get top-performing cars
      getTopPerformingCars: () =>
        api.get('/accounts/top-performing').then((res) => res.data),

      // Get worst-performing cars
      getWorstPerformingCars: () =>
        api.get('/accounts/worst-performing').then((res) => res.data),

      // Get quarterly profit/loss
      getQuarterlyProfitLoss: (year: number) =>
        api.get(`/accounts/quarterly/${year}`).then((res) => res.data),

      // Get total ROI
      getROIForAllSales: () =>
        api.get('/accounts/roi/total').then((res) => res.data),

      // Get ROI by year
      getROIByYear: (year: number) =>
        api.get(`/accounts/roi/year/${year}`).then((res) => res.data),

      // Get ROI by month
      getROIByMonth: (month: number, year: number) =>
        api.get(`/accounts/roi/monthly/${month}/${year}`).then((res) => res.data),

      // Get unsold cars cost
      getUnsoldCarsCost: () =>
        api.get('/accounts/unsold-cost').then((res) => res.data),

      // Export yearly profit/loss PDF
      exportYearlyProfitLossPdf: (year: number) =>
        api.get(`/accounts/yearly/pdf/${year}`, { responseType: 'blob' }),

      // Export monthly profit/loss PDF
      exportMonthlyProfitLossPdf: (year: number, month: number) =>
        api.get(`/accounts/monthly/pdf/${year}/${month}`, { responseType: 'blob' }),

      // Export profit/loss between dates PDF
      exportProfitLossBetweenDates: (fromDate: string, toDate: string) =>
        api.get(`/accounts/from-to/pdf/from/${fromDate}/to/${toDate}`, {
          responseType: 'blob',
        }),

      // Get total purchase price
      getTotalPurchasePrice: () =>
        api.get('/accounts/total-purchase-price').then((res) => res.data),

      // Get total sale price
      getTotalSalePrice: () =>
        api.get('/accounts/total-sale-price').then((res) => res.data),

      // Get user sales count for this month
      getUserSalesThisMonth: () =>
        api.get('/accounts/user-sales-count').then((res) => res.data),

      getMonthlySoldCarCount: () =>
    api.get('/cars/sold-count').then((res) => res.data),

       getCarsByPurchaseDate: () => 
        api.get('/cars/sorted-by-purchase-date').then((res) => res.data),
      
    };

export const carsService = {
  // Fetch all cars
  getAll: () => api.get('/cars'),

  // Get car and seller details by car ID
  getById: (id: string) => api.get(`/cars/${id}`), // Matches @GetMapping("/{id}")

  // Find car by VIN
  getByVin: (vin: string) => api.get(`/cars/vin/${vin}`), // Matches @GetMapping("/vin/{vin}")

  // Search cars by make or model keyword
  search: (keyword: string) => api.get(`/cars/search/${keyword}`), // Matches @GetMapping("/search/{keyword}")

  // Create new car
  create: (data: any) => api.post('/cars', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },

  }),


  getDetailsPdf: (id: string) =>
    api.get(`/cars/details/${id}`, { responseType: 'blob' }),
  // Update existing car
  update: (id: string, data: any) => api.put(`/cars/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }), // Matches @PutMapping("/{carId}")

  // Soft delete car
  delete: (id: string) => api.delete(`/cars/${id}`),
};

// Bookings services
export const bookingsService = {
  getAll: (params?: { page?: number; size?: number; search?: string }) =>
    api.get('/bookings/all', { params }),
  getById: (id: string) => api.get(`/bookings/${id}`),
  getByAllBookedCar: () => api.get('/bookings/booked'),
  create: (data: any) => api.post('/bookings/book', data),
  update: (id: string, data: any) => api.put(`/bookings/${id}`, data),
  delete: (id: string) => api.delete(`/bookings/${id}`),

  // Get bookings by buyer name
  getByBuyerName: (name: string) => api.get(`/bookings/buyer/${name}`),

  // Get bookings by buyer phone
  getByBuyerPhone: (phone: string) => api.get(`/bookings/phone/${phone}`),

  // Get bookings by car VIN
  getByCarVin: (vin: string) => api.get(`/bookings/vin/${vin}`),
};

// Other services remain unchanged
// Other services remain unchanged
export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  register: (formData: FormData) =>
    api.post('/users/register', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  hasUsers: () => api.get('/users/has-users'),

  getUserInfo: () => api.get('users/me'),

  forgotPassword: (email: string) =>
    api.post('/users/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string, confirmPassword: string) =>
    api.post('/users/reset-password', { token, newPassword, confirmPassword }),

  verifyEmail: (token: string) =>
    api.post('/users/verify-email', token, {
      headers: {
        'Content-Type': 'text/plain',
      },
    }),

  createUser: (userData: {
    ownerName: string;
    email: string;
    password: string;
    reEnterPassword: string;
    companyPhone: string;
    companyMobile: string;
  }) => api.post('/users/create', userData),
};

export const buyersService = {


  //   getByPhone: (phone: string) => api.get(`/buyers/phone/${phone}`),
  // getByName: (name: string) => api.get(`/buyers/name/${name}`),
  // getByEmail: (email: string) => api.get(`/buyers/email/${email}`),
  // getByVin: (vin: string) => api.get(`/buyers/vin/${vin}`),
  // findByCarMakeOrModel: (searchTerm: string) => api.get(`/buyers/make-model/${searchTerm}`),
  getAll: () => api.get('/buyers'),
  getById: (id: string) => api.get(`/buyers/${id}`),
  getByPhone: (phone: string) => api.get(`/buyers/phone/${phone}`).then((res) => res.data),
  getByName: (name: string) => api.get(`/buyers/name/${name}`).then((res) => res.data),
  getByEmail: (email: string) => api.get(`/buyers/email/${email}`).then((res) => res.data),
  getByVin: (vin: string) => api.get(`/buyers/vin/${vin}`).then((res) => res.data),
  findByCarMakeOrModel: (searchTerm: string) => api.get(`/buyers/make-model/${searchTerm}`).then((res) => res.data),
  create: (data: any) => api.post('/buyers', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  update: (id: string, data: any) => api.put(`/buyers/${id}`, data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  delete: (id: string) => api.delete(`/buyers/${id}`),
  downloadInvoice: (buyerId: string) =>
    api.get(`/invoices/buyer/${buyerId}`, { responseType: 'blob' }),
};

export const sellersService = {
  getAll: (params?: { page?: number; size?: number; search?: string }) =>
    api.get('/sellers', { params }),
  getById: (id: string) => api.get(`/sellers/${id}`),
  create: (data: any) => api.post('/sellers', data),
  update: (id: string, data: any) => api.put(`/sellers/${id}`, data),
  delete: (id: string) => api.delete(`/sellers/${id}`),

  // Get seller by VIN
  getByVin: (vin: string) => api.get(`/sellers/vin/${vin}`),

  // Get sellers by phone
  getByPhone: (phone: string) => api.get(`/sellers/phone/${phone}`),

  // Get sellers by name
  getByName: (name: string) => api.get(`/sellers/name/${name}`),

  // Get sellers by car make or model keyword
  getByCarMakeOrModel: (keyword: string) => api.get(`/sellers/make-model/${keyword}`),
};

export const inquiriesService = {
  getAll: (params?: any) => api.get('/inquiries', { params }),
  getById: (id: string) => api.get(`/inquiries/${id}`),
  create: (data: any) => api.post('/inquiries', data),
  update: (id: string, data: any) => api.put(`/inquiries/${id}`, data),
  delete: (id: string) => api.delete(`/inquiries/${id}`),
  respond: (id: string, response: string) =>
    api.post(`/inquiries/${id}/respond`, { response }),

  // Get inquiries by required car model
  getByCustomerRequiredCar: (model: string) =>
    api.get(`/inquiries/required-car/${model}`),

  // Get inquiries by car VIN
  getInquiriesByCarVin: (vin: string) =>
    api.get(`/inquiries/vin/${vin}`),

  // Update customer inquiry
  updateCustomerInquiry: (id: string, inquiryDTO: any) =>
    api.put(`/inquiries/${id}`, inquiryDTO),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/status'),
};

export const dealershipService = {

  getCompanyDetails: () => api.get('company/company-details')
}

export const employeeService = {
  // Create a new user
  create: (userDTO: any) => api.post('/users/create', userDTO),

  // Update user by ID
  update: (userId: number, userDTO: any) => api.put(`/users/${userId}`, userDTO),

  // Soft delete user by ID
  delete: (userId: number) => api.delete(`/users/delete/${userId}`),

  // Get all users
  getAll: () => api.get('/users/all'),

  // Get user by ID
  getById: (userId: number) => api.get(`/users/${userId}`),

  // Change password
  changePassword: (changePasswordDTO: any) => api.post('/users/change-password', changePasswordDTO),

  // Forgot password
  forgotPassword: (forgotPasswordDTO: any) => api.post('/users/forgot-password', forgotPasswordDTO),

  // Reset password
  resetPassword: (resetPasswordDTO: any) => api.post('/users/reset-password', resetPasswordDTO),

  // Check if any users exist
  hasUsers: () => api.get('/users/has-users'),

  // Get current user info
  getMyInfo: () => api.get('/users/me'),
}

export const notificationsService = {
  // Get bookings with payment due today
  getPaymentDueToday: () => api.get('/notifications/payment-due-today').then(res => res.data),

  // Get cars older than 30 days
  getCarsOlderThan30Days: () => api.get('/notifications/older-than-30-days').then(res => res.data),

  // Get buyers with anniversary today
  getAnniversaryBuyers: () => api.get('/notifications/anniversary/buyers').then(res => res.data),
}

export default api;