import React from 'react';
import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Droplet } from 'lucide-react';

export default function WaterDeliveryDeveloper() {
  return (
    <ModuleDeveloperPage
      moduleSlug="water-delivery"
      moduleName="Water Delivery"
      moduleIcon={<Droplet className="h-8 w-8 text-cyan-500" />}
      backRoute="/water-delivery"
    />
  );
}
