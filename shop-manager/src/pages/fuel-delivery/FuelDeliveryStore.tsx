import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Fuel, Package, Wrench, Gauge, Truck, Shield } from 'lucide-react';

const FUEL_DELIVERY_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'pumps', name: 'Pumps & Meters', icon: Gauge },
  { id: 'hoses', name: 'Hoses & Fittings', icon: Fuel },
  { id: 'safety', name: 'Safety Equipment', icon: Shield },
  { id: 'truck', name: 'Truck Equipment', icon: Truck },
  { id: 'tools', name: 'Tools', icon: Wrench },
];

export default function FuelDeliveryStore() {
  return (
    <ModuleStore
      moduleId="fuel-delivery"
      moduleName="Fuel Delivery"
      moduleIcon={Fuel}
      accentColor="orange"
      categories={FUEL_DELIVERY_CATEGORIES}
    />
  );
}
