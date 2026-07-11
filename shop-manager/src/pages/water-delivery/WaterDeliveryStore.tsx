import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Droplets, Package, Cog, Wrench, Gauge } from 'lucide-react';

const WATER_DELIVERY_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'tanks', name: 'Tanks & Containers', icon: Droplets },
  { id: 'pumps', name: 'Pumps & Hoses', icon: Cog },
  { id: 'meters', name: 'Meters & Gauges', icon: Gauge },
  { id: 'tools', name: 'Tools', icon: Wrench },
  { id: 'equipment', name: 'Equipment', icon: Package },
];

export default function WaterDeliveryStore() {
  return (
    <ModuleStore
      moduleId="water-delivery"
      moduleName="Water Delivery"
      moduleIcon={Droplets}
      accentColor="cyan"
      categories={WATER_DELIVERY_CATEGORIES}
    />
  );
}
