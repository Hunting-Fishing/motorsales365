import React from 'react';
import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Fuel } from 'lucide-react';

export default function FuelDeliveryDeveloper() {
  return (
    <ModuleDeveloperPage
      moduleSlug="fuel_delivery"
      moduleName="Fuel Delivery"
      moduleIcon={<Fuel className="h-8 w-8 text-orange-500" />}
      backRoute="/fuel-delivery"
    />
  );
}
