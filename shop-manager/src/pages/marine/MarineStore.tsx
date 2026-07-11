import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Anchor, Package, Wrench, Compass, Ship, Gauge } from 'lucide-react';

const MARINE_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'tools', name: 'Marine Tools', icon: Wrench },
  { id: 'parts', name: 'Boat Parts', icon: Ship },
  { id: 'navigation', name: 'Navigation Equipment', icon: Compass },
  { id: 'safety', name: 'Safety Gear', icon: Gauge },
];

export default function MarineStore() {
  return (
    <ModuleStore
      moduleId="marine-services"
      moduleName="Marine Services"
      moduleIcon={Anchor}
      accentColor="green"
      categories={MARINE_CATEGORIES}
    />
  );
}
