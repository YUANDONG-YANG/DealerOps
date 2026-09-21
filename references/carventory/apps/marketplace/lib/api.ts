import axios, { AxiosResponse } from 'axios';
import { Car, Dealer, CarForFilterDataDTO } from '@/lib/type';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080/open-api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    console.log(`[Request] ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
    });
    return config;
  },
  (error) => {
    console.error('[Request Error]', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;
    if (response) {
      console.error(`[Response Error] ${response.status} ${response.config.url}`, response.data);
    } else {
      console.error('[Network or CORS Error]', error.message);
    }
    return Promise.reject(error);
  }
);

export const Service = {
  getAllExternalCars: async (): Promise<CarForFilterDataDTO[]> => {
    try {
      const response: AxiosResponse<CarForFilterDataDTO[] | { data: CarForFilterDataDTO[] }> = await api.get('/cars');
      // Handle both direct array and { data: array } responses
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    } catch (error) {
      console.error('Error fetching all cars:', error);
      throw error;
    }
  },

  getCarById: async (id: number): Promise<Car> => {
    try {
      const response: AxiosResponse<Car> = await api.get(`/cars/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllCarsByCity: async (city: string): Promise<Car[]> => {
    try {
      const response: AxiosResponse<Car[]> = await api.get(`/cars/city/${city}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getAllDealers: async (): Promise<Dealer[]> => {
    try {
      const response: AxiosResponse<Dealer[]> = await api.get('/companies');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDealersById: async (id: number): Promise<Dealer> => {
    try {
      const response: AxiosResponse<Dealer> = await api.get(`/companies/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDealerCars: async (id: number): Promise<Car[]> => {
    try {
      const response: AxiosResponse<Car[]> = await api.get(`/cars/company/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getCarsByFilters: async (filter: {
    state?: string;
    city?: string;
    make?: string;
    model?: string;
    fuelType?: string;
    transmission?: string;
    minYear?: number;
    maxYear?: number;
    minMileage?: number;
    maxMileage?: number;
    minPrice?: number;
    maxPrice?: number;
    mileageRanges?: number[][];
  }): Promise<CarForFilterDataDTO[]> => {
    try {
      const response: AxiosResponse<CarForFilterDataDTO[] | { data: CarForFilterDataDTO[] }> = await api.post('/cars/filter', filter);
      // Handle both direct array and { data: array } responses
      return Array.isArray(response.data) ? response.data : response.data.data || [];
    } catch (error) {
      console.error('Error fetching filtered cars:', error);
      throw error;
    }
  },

  getDealersByName: async (dealerName: string): Promise<Dealer[]> => {
    try {
      const response: AxiosResponse<Dealer[]> = await api.get(`/dealers/name/${encodeURIComponent(dealerName)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getDealersByLocation: async (location: string): Promise<Dealer[]> => {
    try {
      const response: AxiosResponse<Dealer[]> = await api.get(`/dealers/location/${encodeURIComponent(location)}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};