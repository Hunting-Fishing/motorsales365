import React from 'react';
import { MobileInventoryScanner } from '@/components/inventory/MobileInventoryScanner';

export default function MobileInventory() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Inventory Scanner</h1>
        <p className="text-muted-foreground">
          Quick stock adjustments on the go
        </p>
      </div>
      
      <MobileInventoryScanner />
    </div>
  );
}
