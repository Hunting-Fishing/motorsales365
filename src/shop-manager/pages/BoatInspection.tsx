import React from 'react';
import { BoatInspectionForm } from '@/components/inspections/boat/BoatInspectionForm';

export default function BoatInspection() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Marine Vessel Inspection</h1>
        <p className="text-muted-foreground mt-2">
          Complete mechanical inspection with interactive photo annotation
        </p>
      </div>

      <BoatInspectionForm />
    </div>
  );
}
