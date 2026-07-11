import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Container, Package, Cog, Wrench, Gauge, Truck } from 'lucide-react';

const SEPTIC_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'pumps', name: 'Pumps & Hoses', icon: Cog },
  { id: 'tanks', name: 'Tanks & Lids', icon: Container },
  { id: 'tools', name: 'Tools & Safety', icon: Wrench },
  { id: 'meters', name: 'Meters & Gauges', icon: Gauge },
  { id: 'truck', name: 'Truck Equipment', icon: Truck },
];

export default function SepticStore() {
  return (
    <ModuleStore
      moduleId="septic"
      moduleName="Septic Services"
      moduleIcon={Container}
      accentColor="stone"
      categories={SEPTIC_CATEGORIES}
    />
  );
}
