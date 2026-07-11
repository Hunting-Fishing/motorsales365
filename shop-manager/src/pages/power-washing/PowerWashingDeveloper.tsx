import React from 'react';
import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Droplets } from 'lucide-react';

export default function PowerWashingDeveloper() {
  return (
    <ModuleDeveloperPage
      moduleSlug="power-washing"
      moduleName="Power Washing"
      moduleIcon={<Droplets className="h-8 w-8 text-cyan-500" />}
      backRoute="/power-washing"
    />
  );
}
