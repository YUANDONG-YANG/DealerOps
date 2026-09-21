export interface Car {
  id: number;
  make: string;
  model: string;
  year: number;
  vin: string;
  price: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  condition: string;
  color: string;
  odometerReading: number;
  numberOfOwners: number;
  imageUrl: string | null;
  carImage1Url?: string | null;
  carImage2Url?: string | null;
  carImage3Url?: string | null;
  carImage4Url?: string | null;
  carImage5Url?: string | null;
  carImage6Url?: string | null;
  carImage7Url?: string | null;
  carImage8Url?: string | null;
  carImage9Url?: string | null;
  carImage10Url?: string | null;
  carImage11Url?: string | null;
  carImage12Url?: string | null;
  carImage13Url?: string | null;
  carImage14Url?: string | null;
  carImage15Url?: string | null;
  companyName: string;
  companyPhone: string;
  companyMobile: string;
  companyAddress: string;
  companyCity: string;
  companyState: string;
  companyPostalCode: string;
  companyCountry: string;
  bodyType?: string;
  drivetrain?: string;
  exteriorColor?: string;
  interiorColor?: string;
  engine?: string;
  horsepower?: number;
  features?: string[];
  description?: string;
  featured?: boolean;
  rtoCode?: string;
  engineCapacity?: number;
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
  adjustableExternalMirror?: boolean;
  adjustableSteering?: boolean;
  batteryCondition?: string;
  insuranceType?: string;
  lockSystem?: string;
  makeYear?: number;
  registrationPlace?: string;
  exchangeAvailable?: boolean;
  financeAvailable?: boolean;
  serviceHistoryAvailable?: boolean;
  tyreCondition?: string;
}

export interface Dealer {
  id: number;
  companyName: string;
  companyPhone: string;
  companyMobile: string;
  companyAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  yearEstablished: number;
  companyLogoUrl: string | null;
  companyImageUrl: string | null;
  rating: number | null;
  reviewCount: number | null;
  description: string;
  carCount: number | null;
  specialties: string[];
  hours: string;
  website: string;
  email: string;
}

export interface ExtraCarFeatures {
  bodyType: string;
  drivetrain: string;
  exteriorColor: string;
  interiorColor: string;
  engine: string;
  horsepower: number;
  features: string[];
  description: string;
}

export interface CarImage {
  imageUrl: string | null;
  carImage1Url?: string | null;
  carImage2Url?: string | null;
  carImage3Url?: string | null;
  carImage4Url?: string | null;
  carImage5Url?: string | null;
  carImage6Url?: string | null;
  carImage7Url?: string | null;
  carImage8Url?: string | null;
  carImage9Url?: string | null;
  carImage10Url?: string | null;
  carImage11Url?: string | null;
  carImage12Url?: string | null;
  carImage13Url?: string | null;
  carImage14Url?: string | null;
  carImage15Url?: string | null;
}

export interface CarDetail {
  car: Car;
  dealer: Dealer;
  carImage: CarImage;
  features: ExtraCarFeatures;
}

export interface CarForFilterDataDTO {
  carId?: number;
  carMake?: string;
  carModel?: string;
  carYear?: number;
  carPrice?: number;
  carMileage?: number;
  carFuelType?: string;
  carTransmission?: string;
  carOdometerReading?: number;
  carNumberOfOwners?: number;
  carImageUrl?: string | null;
  rtoCode?: string;
  location?: string;
  companyName?: string;
}

export interface CarCardProps {
  car: {
    id: number;
    make: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    fuelType: string;
    transmission: string;
    imageUrl: string | null;
    rtoCode: string;
    dealer: string;
    location: string;
    featured: boolean;
  };
}