import { Service } from '@/lib/api';
import ClientCarDetails from '@/components/Client/ClientCarDetail';
import { Metadata } from 'next';
import { Car, CarDetail, CarForFilterDataDTO, Dealer } from '@/lib/type';

// Extend the Car interface temporarily to include dealerId (if provided by API)
interface CarWithDealerId extends Car {
  dealerId?: number; // Add dealerId to handle dealer reference
}

export async function generateStaticParams() {
  try {
    const response = await Service.getAllExternalCars();
    console.log('generateStaticParams Response:', response); // Debug: Log raw response

    const apiCars: CarForFilterDataDTO[] = Array.isArray(response) ? response : [];
    console.log('generateStaticParams Parsed:', apiCars); // Debug: Log parsed response

    // Filter out cars with missing carId and map to params
    return apiCars
      .filter((car) => car.carId != null)
      .map((car) => {
        console.log('Mapping Car for Params:', car); // Debug: Log each car
        return {
          id: car.carId!.toString(),
        };
      });
  } catch (error) {
    console.error('Failed to fetch cars for generateStaticParams:', error);
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params; // Resolve the params Promise
  try {
    const car = await Service.getCarById(Number(id));
    console.log('getCarById Response:', car); // Debug: Log raw response

    // Ensure car is a valid Car object
    if (!car || typeof car !== 'object' || !('id' in car)) {
      throw new Error('Invalid car data');
    }

    const normalizedCar: Car = {
      id: car.id || 0,
      make: car.make || 'Unknown',
      model: car.model || 'Unknown',
      year: car.year || 0,
      imageUrl: car.imageUrl || null,
      vin: car.vin || 'N/A',
      price: car.price || 0,
      mileage: car.mileage || 0,
      fuelType: car.fuelType || 'N/A',
      transmission: car.transmission || 'N/A',
      condition: car.condition || 'N/A',
      color: car.color || 'N/A',
      odometerReading: car.odometerReading || 0,
      numberOfOwners: car.numberOfOwners || 0,
      companyName: car.companyName || 'Unknown Dealer',
      companyPhone: car.companyPhone || 'N/A',
      companyMobile: car.companyMobile || 'N/A',
      companyAddress: car.companyAddress || 'N/A',
      companyCity: car.companyCity || 'N/A',
      companyState: car.companyState || 'N/A',
      companyPostalCode: car.companyPostalCode || 'N/A',
      companyCountry: car.companyCountry || 'N/A',
      bodyType: car.bodyType || 'N/A',
      drivetrain: car.drivetrain || 'N/A',
      exteriorColor: car.exteriorColor || 'N/A',
      interiorColor: car.interiorColor || 'N/A',
      engine: car.engine || 'N/A',
      horsepower: car.horsepower || 0,
      features: car.features || [],
      description: car.description || 'No description available',
      featured: car.featured || false,
      rtoCode: car.rtoCode || 'N/A',
      carImage1Url: car.carImage1Url || null,
      carImage2Url: car.carImage2Url || null,
      carImage3Url: car.carImage3Url || null,
      carImage4Url: car.carImage4Url || null,
      carImage5Url: car.carImage5Url || null,
      carImage6Url: car.carImage6Url || null,
      carImage7Url: car.carImage7Url || null,
      carImage8Url: car.carImage8Url || null,
      carImage9Url: car.carImage9Url || null,
      carImage10Url: car.carImage10Url || null,
      carImage11Url: car.carImage11Url || null,
      carImage12Url: car.carImage12Url || null,
      carImage13Url: car.carImage13Url || null,
      carImage14Url: car.carImage14Url || null,
      carImage15Url: car.carImage15Url || null,

      engineCapacity: car.engineCapacity || undefined,
      suspensionType: car.suspensionType || undefined,
      fuelTankCapacity: car.fuelTankCapacity || undefined,
      cityMileage: car.cityMileage || undefined,
      highwayMileage: car.highwayMileage || undefined,
      length: car.length || undefined,
      width: car.width || undefined,
      height: car.height || undefined,
      groundClearance: car.groundClearance || undefined,
      wheelbase: car.wheelbase || undefined,
      bootSpace: car.bootSpace || undefined,
      frontBrakeType: car.frontBrakeType || undefined,
      rearBrakeType: car.rearBrakeType || undefined,
      tireType: car.tireType || undefined,
      wheelSize: car.wheelSize || undefined,
      airConditioning: car.airConditioning || undefined,
      airConditioningType: car.airConditioningType || undefined,
      powerSteering: car.powerSteering || undefined,
      powerWindowsType: car.powerWindowsType || undefined,
      cruiseControl: car.cruiseControl || undefined,
      centralLocking: car.centralLocking || undefined,
      infotainmentSystem: car.infotainmentSystem || undefined,
      navigationSystem: car.navigationSystem || undefined,
      sunroof: car.sunroof || undefined,
      airbags: car.airbags || undefined,
      abs: car.abs || undefined,
      ebd: car.ebd || undefined,
      tractionControl: car.tractionControl || undefined,
      rearCamera: car.rearCamera || undefined,
      parkingSensors: car.parkingSensors || undefined,
      amFmRadio: car.amFmRadio || undefined,
      auxCompatibility: car.auxCompatibility || undefined,
      usbCompatibility: car.usbCompatibility || undefined,
      bluetooth: car.bluetooth || undefined,
      antiTheftDevice: car.antiTheftDevice || undefined,
      adjustableExternalMirror: car.adjustableExternalMirror || undefined,
      adjustableSteering: car.adjustableSteering || undefined,
      batteryCondition: car.batteryCondition || undefined,
      insuranceType: car.insuranceType || undefined,
      lockSystem: car.lockSystem || undefined,
      makeYear: car.makeYear || undefined,
      registrationPlace: car.registrationPlace || undefined,
      exchangeAvailable: car.exchangeAvailable || undefined,
      financeAvailable: car.financeAvailable || undefined,
      serviceHistoryAvailable: car.serviceHistoryAvailable || undefined,
      tyreCondition: car.tyreCondition || undefined,
    };

    console.log('getCarById Normalized car:', normalizedCar); // Debug: Log normalized data

    return {
      title: `${normalizedCar.year} ${normalizedCar.make} ${normalizedCar.model} | Car Details`,
      description: `View details for this ${normalizedCar.year} ${normalizedCar.make} ${normalizedCar.model}.`,
      openGraph: {
        title: `${normalizedCar.year} ${normalizedCar.make} ${normalizedCar.model}`,
        description: `Explore this ${normalizedCar.year} ${normalizedCar.make} ${normalizedCar.model} for sale.`,
        images: normalizedCar.imageUrl ? [{ url: `${normalizedCar.imageUrl}` }] : [],
      },
    };
  } catch (error) {
    console.error('Failed to fetch car for metadata:', error);
    return {
      title: 'Car Details',
      description: 'View details for this car.',
    };
  }
}

async function fetchCarDetails(carId: number): Promise<CarDetail | null> {
  try {
    const carResponse = await Service.getCarById(carId);
    if (!carResponse) {
      throw new Error('No car data returned');
    }

    // Assume carResponse includes a dealerId field (not in current Car interface)
    const carWithDealerId = carResponse as CarWithDealerId;
    let dealer: Dealer | null = null;

    // Fetch dealer details using companyName if dealerId is not provided
    if (carWithDealerId.dealerId) {
      dealer = await Service.getDealersById(carWithDealerId.dealerId);
    } else if (carResponse.companyName) {
      // Fallback: Fetch dealer by companyName
      const dealers = await Service.getDealersByName(carResponse.companyName);
      dealer = Array.isArray(dealers) && dealers.length > 0 ? dealers[0] : null;
    }

    // If no dealer found, provide default values
    if (!dealer) {
      dealer = {
        id: 0,
        companyName: carResponse.companyName || 'Unknown Dealer',
        companyPhone: carResponse.companyPhone || 'N/A',
        companyMobile: carResponse.companyMobile || 'N/A',
        companyAddress: carResponse.companyAddress || 'N/A',
        city: carResponse.companyCity || 'N/A',
        state: carResponse.companyState || 'N/A',
        postalCode: carResponse.companyPostalCode || 'N/A',
        country: carResponse.companyCountry || 'N/A',
        yearEstablished: 0,
        companyLogoUrl: null,
        companyImageUrl: null,
        rating: null,
        reviewCount: null,
        description: '',
        carCount: null,
        specialties: [],
        hours: '',
        website: '',
        email: '',
      };
    }

    const carDetail: CarDetail = {
      car: {
        id: carResponse.id || 0,
        make: carResponse.make || 'Unknown',
        model: carResponse.model || 'Unknown',
        year: carResponse.year || 0,
        vin: carResponse.vin || 'N/A',
        price: carResponse.price || 0,
        mileage: carResponse.mileage || 0,
        fuelType: carResponse.fuelType || 'N/A',
        transmission: carResponse.transmission || 'N/A',
        condition: carResponse.condition || 'N/A',
        color: carResponse.color || 'N/A',
        odometerReading: carResponse.odometerReading || 0,
        numberOfOwners: carResponse.numberOfOwners || 0,
        imageUrl: carResponse.imageUrl || null,
        carImage1Url: carResponse.carImage1Url || null,
        carImage2Url: carResponse.carImage2Url || null,
        carImage3Url: carResponse.carImage3Url || null,
        carImage4Url: carResponse.carImage4Url || null,
        carImage5Url: carResponse.carImage5Url || null,
        carImage6Url: carResponse.carImage6Url || null,
        carImage7Url: carResponse.carImage7Url || null,
        carImage8Url: carResponse.carImage8Url || null,
        carImage9Url: carResponse.carImage9Url || null,
        carImage10Url: carResponse.carImage10Url || null,
        carImage11Url: carResponse.carImage11Url || null,
        carImage12Url: carResponse.carImage12Url || null,
        carImage13Url: carResponse.carImage13Url || null,
        carImage14Url: carResponse.carImage14Url || null,
        carImage15Url: carResponse.carImage15Url || null,
        companyName: carResponse.companyName || 'Unknown Dealer',
        companyPhone: carResponse.companyPhone || 'N/A',
        companyMobile: carResponse.companyMobile || 'N/A',
        companyAddress: carResponse.companyAddress || 'N/A',
        companyCity: carResponse.companyCity || 'N/A',
        companyState: carResponse.companyState || 'N/A',
        companyPostalCode: carResponse.companyPostalCode || 'N/A',
        companyCountry: carResponse.companyCountry || 'N/A',
        bodyType: carResponse.bodyType || 'N/A',
        drivetrain: carResponse.drivetrain || 'N/A',
        exteriorColor: carResponse.exteriorColor || 'N/A',
        interiorColor: carResponse.interiorColor || 'N/A',
        engine: carResponse.engine || 'N/A',
        horsepower: carResponse.horsepower || 0,
        features: carResponse.features || [],
        description: carResponse.description || 'No description available',
        featured: carResponse.featured || false,
        rtoCode: carResponse.rtoCode || 'N/A',
        engineCapacity: carResponse.engineCapacity || undefined,
        suspensionType: carResponse.suspensionType || undefined,
        fuelTankCapacity: carResponse.fuelTankCapacity || undefined,
        cityMileage: carResponse.cityMileage || undefined,
        highwayMileage: carResponse.highwayMileage || undefined,
        length: carResponse.length || undefined,
        width: carResponse.width || undefined,
        height: carResponse.height || undefined,
        groundClearance: carResponse.groundClearance || undefined,
        wheelbase: carResponse.wheelbase || undefined,
        bootSpace: carResponse.bootSpace || undefined,
        frontBrakeType: carResponse.frontBrakeType || undefined,
        rearBrakeType: carResponse.rearBrakeType || undefined,
        tireType: carResponse.tireType || undefined,
        wheelSize: carResponse.wheelSize || undefined,
        airConditioning: carResponse.airConditioning || undefined,
        airConditioningType: carResponse.airConditioningType || undefined,
        powerSteering: carResponse.powerSteering || undefined,
        powerWindowsType: carResponse.powerWindowsType || undefined,
        cruiseControl: carResponse.cruiseControl || undefined,
        centralLocking: carResponse.centralLocking || undefined,
        infotainmentSystem: carResponse.infotainmentSystem || undefined,
        navigationSystem: carResponse.navigationSystem || undefined,
        sunroof: carResponse.sunroof || undefined,
        airbags: carResponse.airbags || undefined,
        abs: carResponse.abs || undefined,
        ebd: carResponse.ebd || undefined,
        tractionControl: carResponse.tractionControl || undefined,
        rearCamera: carResponse.rearCamera || undefined,
        parkingSensors: carResponse.parkingSensors || undefined,
        amFmRadio: carResponse.amFmRadio || undefined,
        auxCompatibility: carResponse.auxCompatibility || undefined,
        usbCompatibility: carResponse.usbCompatibility || undefined,
        bluetooth: carResponse.bluetooth || undefined,
        antiTheftDevice: carResponse.antiTheftDevice || undefined,
        adjustableExternalMirror: carResponse.adjustableExternalMirror || undefined,
        adjustableSteering: carResponse.adjustableSteering || undefined,
        batteryCondition: carResponse.batteryCondition || undefined,
        insuranceType: carResponse.insuranceType || undefined,
        lockSystem: carResponse.lockSystem || undefined,
        makeYear: carResponse.makeYear || undefined,
        registrationPlace: carResponse.registrationPlace || undefined,
        exchangeAvailable: carResponse.exchangeAvailable || undefined,
        financeAvailable: carResponse.financeAvailable || undefined,
        serviceHistoryAvailable: carResponse.serviceHistoryAvailable || undefined,
        tyreCondition: carResponse.tyreCondition || undefined,
      },
      dealer,
      carImage: {
        imageUrl: carResponse.imageUrl || null,
        carImage1Url: carResponse.carImage1Url || null,
        carImage2Url: carResponse.carImage2Url || null,
        carImage3Url: carResponse.carImage3Url || null,
        carImage4Url: carResponse.carImage4Url || null,
        carImage5Url: carResponse.carImage5Url || null,
        carImage6Url: carResponse.carImage6Url || null,
        carImage7Url: carResponse.carImage7Url || null,
        carImage8Url: carResponse.carImage8Url || null,
        carImage9Url: carResponse.carImage9Url || null,
        carImage10Url: carResponse.carImage10Url || null,
        carImage11Url: carResponse.carImage11Url || null,
        carImage12Url: carResponse.carImage12Url || null,
        carImage13Url: carResponse.carImage13Url || null,
        carImage14Url: carResponse.carImage14Url || null,
        carImage15Url: carResponse.carImage15Url || null,
      },
      features: {
        bodyType: carResponse.bodyType || 'N/A',
        drivetrain: carResponse.drivetrain || 'N/A',
        exteriorColor: carResponse.exteriorColor || 'N/A',
        interiorColor: carResponse.interiorColor || 'N/A',
        engine: carResponse.engine || 'N/A',
        horsepower: carResponse.horsepower || 0,
        features: carResponse.features || [],
        description: carResponse.description || 'No description available',
      },
    };

    return carDetail;
  } catch (error) {
    console.error('Failed to fetch car details:', error);
    return null;
  }
}

export default async function CarDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Resolve the params Promise
  const carId = parseInt(id, 10);
  if (isNaN(carId)) {
    return <div>Invalid car ID</div>;
  }

  const carDetail = await fetchCarDetails(carId);

  if (!carDetail) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-red-600">Failed to load car details. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <ClientCarDetails carId={carId} carDetail={carDetail} />;
}