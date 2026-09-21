'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Service } from '@/lib/api';
import { Checkbox } from "@/components/ui/checkbox";
import { CarCardProps } from '@/lib/type';

const FilterSidebar = ({ onFilterChange, onResetFilters }: { onFilterChange: (filteredCars: CarCardProps[]) => void, onResetFilters: () => void }) => {
  const [priceRange, setPriceRange] = useState([10000, 2000000]);
  const [yearRange, setYearRange] = useState([2010, 2025]);
  const [mileageRange, setMileageRange] = useState([0, 200000]);
  const [state, setState] = useState('Maharashtra');
  const [city, setCity] = useState('Pune');
  const [make, setMake] = useState('any');
  const [model, setModel] = useState('');
  const [fuelType, setFuelType] = useState('any');
  const [transmission, setTransmission] = useState('any');
  const [isApplying, setIsApplying] = useState(false);

  const makes = [
    { name: 'any', logo: null },
    { name: 'Maruti Suzuki', logo: 'https://www.carlogos.org/car-logos/suzuki-logo.png' },
    { name: 'Tata Motors', logo: 'https://www.carlogos.org/car-logos/tata-logo.png' },
    { name: 'Mahindra', logo: 'https://www.carlogos.org/car-logos/mahindra-logo.png' },
    { name: 'Hyundai', logo: 'https://www.carlogos.org/car-logos/hyundai-logo.png' },
    { name: 'Kia', logo: 'https://www.carlogos.org/car-logos/kia-logo.png' },
    { name: 'Honda', logo: 'https://www.carlogos.org/car-logos/honda-logo.png' },
    { name: 'Toyota', logo: 'https://www.carlogos.org/car-logos/toyota-logo.png' },
    { name: 'Renault', logo: 'https://www.carlogos.org/car-logos/renault-logo.png' },
    { name: 'Volkswagen', logo: 'https://www.carlogos.org/car-logos/volkswagen-logo.png' },
    { name: 'Skoda', logo: 'https://www.carlogos.org/car-logos/skoda-logo.png' },
    { name: 'MG', logo: 'https://www.carlogos.org/car-logos/mg-logo.png' },
    { name: 'Nissan', logo: 'https://www.carlogos.org/car-logos/nissan-logo.png' },
    { name: 'Jeep', logo: 'https://www.carlogos.org/car-logos/jeep-logo.png' },
    { name: 'Citroën', logo: 'https://www.carlogos.org/car-logos/citroen-logo.png' },
    { name: 'BMW', logo: 'https://www.carlogos.org/car-logos/bmw-logo.png' },
    { name: 'Mercedes-Benz', logo: 'https://www.carlogos.org/car-logos/mercedes-benz-logo.png' },
    { name: 'Audi', logo: 'https://www.carlogos.org/car-logos/audi-logo.png' },
    { name: 'Volvo', logo: 'https://www.carlogos.org/car-logos/volvo-logo.png' },
    { name: 'Lexus', logo: 'https://www.carlogos.org/car-logos/lexus-logo.png' },
    { name: 'Jaguar', logo: 'https://www.carlogos.org/car-logos/jaguar-logo.png' },
    { name: 'Land Rover', logo: 'https://www.carlogos.org/car-logos/land-rover-logo.png' },
    { name: 'Mini', logo: 'https://www.carlogos.org/car-logos/mini-logo.png' },
    { name: 'Porsche', logo: 'https://www.carlogos.org/car-logos/porsche-logo.png' },
    { name: 'Maserati', logo: 'https://www.carlogos.org/car-logos/maserati-logo.png' },
    { name: 'Lamborghini', logo: 'https://www.carlogos.org/car-logos/lamborghini-logo.png' },
    { name: 'Ferrari', logo: 'https://www.carlogos.org/car-logos/ferrari-logo.png' },
    { name: 'Rolls-Royce', logo: 'https://www.carlogos.org/car-logos/rolls-royce-logo.png' },
    { name: 'Bentley', logo: 'https://www.carlogos.org/car-logos/bentley-logo.png' },
    { name: 'Aston Martin', logo: 'https://www.carlogos.org/car-logos/aston-martin-logo.png' },
    { name: 'BYD', logo: 'https://www.carlogos.org/car-logos/byd-logo.png' },
    { name: 'Tesla', logo: 'https://www.carlogos.org/car-logos/tesla-logo.png' },
    { name: 'Ford', logo: 'https://www.carlogos.org/car-logos/ford-logo.png' },
    { name: 'Chevrolet', logo: 'https://www.carlogos.org/car-logos/chevrolet-logo.png' },
    { name: 'Fiat', logo: 'https://www.carlogos.org/car-logos/fiat-logo.png' },
    { name: 'Datsun', logo: 'https://www.carlogos.org/car-logos/datsun-logo.png' },
    { name: 'Isuzu', logo: 'https://www.carlogos.org/car-logos/isuzu-logo.png' },
  ];

  const states = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  const stateDivisions: Record<string, string[]> = {
    "Maharashtra": ["Konkan", "Pune", "Nashik", "Aurangabad", "Amravati", "Nagpur"],
    "Uttar Pradesh": ["Lucknow", "Kanpur", "Bareilly", "Agra", "Meerut", "Varanasi", "Gorakhpur", "Prayagraj", "Jhansi", "Chitrakoot", "Ayodhya", "Devipatan", "Moradabad", "Saharanpur", "Aligarh", "Basti", "Azamgarh", "Mirzapur"],
    "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Ujjain", "Gwalior", "Chhindwara", "Sagar", "Rewa", "Shahdol", "Narmadapuram"],
    "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Trichy", "Vellore"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Bikaner", "Ajmer", "Kota", "Bharatpur"],
  };

  const mileageOptions = [
    { label: '0 – 25,000 km', value: [0, 25000] },
    { label: '25,001 – 50,000 km', value: [25001, 50000] },
    { label: '50,001 – 75,000 km', value: [50001, 75000] },
    { label: '75,001 – 100,000 km', value: [75001, 100000] },
    { label: '100,001+ km', value: [100001, 200000] },
  ];

  const [selectedMileageRanges, setSelectedMileageRanges] = useState<number[][]>([]);

  const fuelTypes = ['any', 'Petrol', 'Diesel', 'Hybrid', 'Electric', 'CNG', 'Plug-in Hybrid', 'LPG', 'Flex Fuel'];
  const transmissions = ['any', 'Manual', 'Automatic', 'CVT', 'Semi-Automatic', 'AMT', 'DCT', 'iMT'];

  const applyFilters = async () => {
    setIsApplying(true);
    try {
      const filter = {
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        make: make === 'any' ? undefined : make,
        model: model.trim() || undefined,
        fuelType: fuelType === 'any' ? undefined : fuelType,
        transmission: transmission === 'any' ? undefined : transmission,
        minYear: yearRange[0],
        maxYear: yearRange[1],
        mileageRanges: selectedMileageRanges.length ? selectedMileageRanges : undefined,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
      };

      console.log('Filter Payload:', filter);
      const response = await Service.getCarsByFilters(filter);
      console.log('API Response:', response);

      const apiCars = Array.isArray(response) ? response : [];
      console.log('Parsed Cars:', apiCars);

      const mappedCars: CarCardProps[] = apiCars.map((car: any) => ({
        car: {
          id: car.carId ?? 0,
          make: car.carMake || 'Unknown',
          model: car.carModel || 'Unknown',
          year: car.carYear || 0,
          price: car.carPrice || 0,
          mileage: car.carOdometerReading || 0,
          fuelType: car.carFuelType || 'N/A',
          transmission: car.carTransmission || 'N/A',
          imageUrl: car.carImageUrl || null,
          rtoCode: car.rtoCode || 'N/A',
          dealer: car.companyName || 'Unknown Dealer',
          location: car.location || 'N/A',
          featured: car.featured || false,
        },
      }));

      onFilterChange(mappedCars);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      onFilterChange([]);
    } finally {
      setIsApplying(false);
    }
  };

  const resetFilters = () => {
    setPriceRange([10000, 2000000]);
    setYearRange([2010, 2025]);
    setMileageRange([0, 200000]);
    setState('');
    setCity('');
    setMake('any');
    setModel('');
    setFuelType('any');
    setTransmission('any');
    setSelectedMileageRanges([]);
    onResetFilters();
  };

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Filter Cars</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Price Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Price Range: ${priceRange[0].toLocaleString()} - ${priceRange[1].toLocaleString()}
          </Label>
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={5000}
            max={2000000}
            step={5000}
            className="w-full"
          />
        </div>

        <Separator />

        {/* State Dropdown */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">State</Label>
          <Select value={state} onValueChange={(value) => {
            setState(value);
            setCity('');
          }}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a state" />
            </SelectTrigger>
            <SelectContent>
              {states.map((st) => (
                <SelectItem key={st} value={st}>
                  {st}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Division Dropdown */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Division</Label>
          <Select
            value={city}
            onValueChange={setCity}
            disabled={!state || !stateDivisions[state]}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={!state ? "Select a state first" : "Select a division"} />
            </SelectTrigger>
            <SelectContent>
              {stateDivisions[state]?.map((div) => (
                <SelectItem key={div} value={div}>
                  {div}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Make */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Label className="text-sm font-medium">Make</Label>
          </div>
          <Select value={make} onValueChange={setMake}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select make" />
            </SelectTrigger>
            <SelectContent>
              {makes.map((item) => (
                <SelectItem key={item.name} value={item.name}>
                  <div className="flex items-center space-x-2">
                    {item.logo && (
                      <img
                        src={item.logo}
                        alt={`${item.name} Logo`}
                        className="h-[1em] w-auto inline-block align-middle"
                      />
                    )}
                    <span>{item.name === 'any' ? 'Any' : item.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Model */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Model</Label>
          <Input
            type="text"
            placeholder="Enter model (e.g., Swift)"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Year Range */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Year: {yearRange[0]} - {yearRange[1]}
          </Label>
          <Slider
            value={yearRange}
            onValueChange={setYearRange}
            min={2010}
            max={2025}
            step={1}
            className="w-full"
          />
        </div>

        <Separator />

        {/* Odometer Multi-Select */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Odometer (km)</Label>
          <div className="flex flex-col gap-2">
            {mileageOptions.map((option, index) => {
              const isSelected = selectedMileageRanges.some(
                (r) => r[0] === option.value[0] && r[1] === option.value[1]
              );

              return (
                <div key={index} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mileage-${index}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedMileageRanges([...selectedMileageRanges, option.value]);
                      } else {
                        setSelectedMileageRanges(
                          selectedMileageRanges.filter(
                            (r) => !(r[0] === option.value[0] && r[1] === option.value[1])
                          )
                        );
                      }
                    }}
                  />
                  <Label htmlFor={`mileage-${index}`} className="text-sm cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Fuel Type */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Fuel Type</Label>
          <Select value={fuelType} onValueChange={setFuelType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select fuel type" />
            </SelectTrigger>
            <SelectContent>
              {fuelTypes.map((fuel) => (
                <SelectItem key={fuel} value={fuel}>
                  {fuel === 'any' ? 'Any' : fuel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Transmission */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Transmission</Label>
          <Select value={transmission} onValueChange={setTransmission}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select transmission" />
            </SelectTrigger>
            <SelectContent>
              {transmissions.map((transmission) => (
                <SelectItem key={transmission} value={transmission}>
                  {transmission === 'any' ? 'Any' : transmission}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="pt-4 space-y-2">
          <Button className="w-full" onClick={applyFilters} disabled={isApplying}>
            {isApplying ? 'Applying...' : 'Apply Filters'}
          </Button>
          <Button variant="outline" className="w-full" onClick={resetFilters}>Reset All</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FilterSidebar;