import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Droplets, Package, Wrench, Gauge, Beaker, Truck } from 'lucide-react';

const POWER_WASHING_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'machines', name: 'Pressure Washers', icon: Gauge },
  { id: 'chemicals', name: 'Cleaning Chemicals', icon: Beaker },
  { id: 'hoses', name: 'Hoses & Accessories', icon: Droplets },
  { id: 'tools', name: 'Tools', icon: Wrench },
  { id: 'equipment', name: 'Equipment', icon: Truck },
];

export default function PowerWashingStore() {
  return (
    <ModuleStore
      moduleId="power-washing"
      moduleName="Power Washing"
      moduleIcon={Droplets}
      accentColor="cyan"
      categories={POWER_WASHING_CATEGORIES}
    />
  );
}
