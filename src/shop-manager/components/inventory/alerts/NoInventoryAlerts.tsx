
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle } from 'lucide-react';

export function NoInventoryAlerts() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-xl font-medium">No Inventory Alerts</h3>
        <p className="text-muted-foreground mt-2">
          All inventory items are well-stocked and above their reorder points.
        </p>
      </CardContent>
    </Card>
  );
}
