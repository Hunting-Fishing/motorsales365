import React from 'react';
import { ServicePackageManager } from '@/components/inventory/predictive/ServicePackageManager';

export default function ServicePackages() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Packages</h1>
          <p className="text-muted-foreground">
            Define service templates with parts lists and usage-based intervals
          </p>
        </div>
      </div>
      
      <ServicePackageManager />
    </div>
  );
}
