import { ModuleStore, StoreCategory } from '@/components/store/ModuleStore';
import { Car, Package, Wrench, Cog, Gauge, Shield } from 'lucide-react';

const AUTOMOTIVE_CATEGORIES: StoreCategory[] = [
  { id: 'all', name: 'All Products', icon: Package },
  { id: 'tools', name: 'Hand Tools', icon: Wrench },
  { id: 'diagnostic', name: 'Diagnostic Equipment', icon: Gauge },
  { id: 'parts', name: 'Parts & Supplies', icon: Cog },
  { id: 'safety', name: 'Safety Equipment', icon: Shield },
];

export default function AutomotiveStore() {
  return (
    <ModuleStore
      moduleId="automotive"
      moduleName="Automotive"
      moduleIcon={Car}
      accentColor="blue"
      categories={AUTOMOTIVE_CATEGORIES}
    />
  );
}
