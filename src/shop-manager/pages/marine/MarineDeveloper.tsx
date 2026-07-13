import React from 'react';
import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Anchor } from 'lucide-react';

export default function MarineDeveloper() {
  return (
    <ModuleDeveloperPage
      moduleSlug="marine"
      moduleName="Marine Services"
      moduleIcon={<Anchor className="h-8 w-8 text-teal-500" />}
      backRoute="/marine-services"
    />
  );
}
