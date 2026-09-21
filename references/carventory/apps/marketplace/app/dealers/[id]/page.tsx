import { Service } from '@/lib/api';
import { Dealer, Car } from '@/lib/type';
import DealerProfileClient from '@/components/Client/DealerProfileClient';

interface DealerWithCars extends Dealer {
  cars: Car[];
}

export async function generateStaticParams() {
  try {
    const dealers = await Service.getAllDealers();
    if (!Array.isArray(dealers)) {
      console.error('getAllDealers did not return an array:', dealers);
      return [];
    }
    return dealers.map((dealer: Dealer) => ({
      id: dealer.id.toString(),
    }));
  } catch (error) {
    console.error('Failed to fetch dealers for static params:', error);
    return [];
  }
}

async function fetchDealer(dealerId: number): Promise<DealerWithCars | null> {
  try {
    // Fetch dealer details
    const dealerResponse = await Service.getDealersById(dealerId);
    if (!dealerResponse) {
      throw new Error('No dealer data returned');
    }

    // Fetch cars for the dealer
    const carsResponse = await Service.getDealerCars(dealerId);

    const dealer: DealerWithCars = {
      ...dealerResponse,
      cars: Array.isArray(carsResponse)
        ? carsResponse.map((car: Car) => ({
            ...car,
            image: car.imageUrl || null,
            dealer: car.companyName,
            location: `${car.companyCity}, ${car.companyState}`,
            featured: car.featured || false,
            rtoCode: car.rtoCode || 'N/A',
          }))
        : [],
    };

    return dealer;
  } catch (error) {
    console.error('Failed to fetch dealer:', error);
    return null;
  }
}

export default async function DealerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dealerId = parseInt(id);
  if (isNaN(dealerId)) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-red-600">Invalid dealer ID.</p>
        </div>
      </div>
    );
  }

  const dealer = await fetchDealer(dealerId);

  if (!dealer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-red-600">Failed to load dealer information. Please try again later.</p>
        </div>
      </div>
    );
  }

  return <DealerProfileClient dealer={dealer} />;
}