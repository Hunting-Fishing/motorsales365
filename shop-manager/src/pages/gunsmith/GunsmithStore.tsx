import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Crosshair, Package, Wrench, Cog, Shield, Gauge } from 'lucide-react';

const GUNSMITH_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'tools', name: 'Gunsmithing Tools', icon: Wrench },
  { id: 'parts', name: 'Parts & Components', icon: Cog },
  { id: 'cleaning', name: 'Cleaning Supplies', icon: Shield },
  { id: 'equipment', name: 'Shop Equipment', icon: Gauge },
];

export default function GunsmithStore() {
  return (
    <ModuleStore
      moduleId="gunsmith"
      moduleName="Gunsmith"
      moduleIcon={Crosshair}
      accentColor="red"
      categories={GUNSMITH_CATEGORIES}
    />
  );
}
