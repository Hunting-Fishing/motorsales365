import React from 'react';
import { ModuleDeveloperPage } from '@/components/developer/ModuleDeveloperPage';
import { Target } from 'lucide-react';

export default function GunsmithDeveloper() {
  return (
    <ModuleDeveloperPage
      moduleSlug="gunsmith"
      moduleName="Gunsmith"
      moduleIcon={<Target className="h-8 w-8 text-amber-500" />}
      backRoute="/gunsmith"
    />
  );
}
