import React from 'react';
import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Car } from 'lucide-react';

export default function AutomotiveDeveloper() {
  return (
    <ModuleDeveloperPage
      moduleSlug="automotive"
      moduleName="Automotive Repair"
      moduleIcon={<Car className="h-8 w-8 text-blue-500" />}
      backRoute="/automotive"
    />
  );
}
