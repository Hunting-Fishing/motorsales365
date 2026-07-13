
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryFormField } from '../InventoryFormField';
import { InventoryFormSelect } from '../InventoryFormSelect';

interface InventoryManagementSectionProps {
  values: any;
  errors: any;
  onChange: (field: string, value: any) => void;
  measurementUnits: string[];
}

const STOCK_LEVEL_OPTIONS = [
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'on_order', label: 'On Order' },
];

export function InventoryManagementSection({ values, errors, onChange, measurementUnits }: InventoryManagementSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inventory Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryFormField
              label="Current Quantity"
              name="quantity"
              type="number"
              value={values.quantity || 0}
              onChange={(e) => onChange('quantity', parseInt(e.target.value) || 0)}
              error={errors.quantity}
              min="0"
              placeholder="0"
            />

            <InventoryFormField
              label="Reorder Point"
              name="reorder_point"
              type="number"
              value={values.reorder_point || 0}
              onChange={(e) => onChange('reorder_point', parseInt(e.target.value) || 0)}
              error={errors.reorder_point}
              min="0"
              placeholder="5"
              description="Minimum quantity before reordering"
            />

            <InventoryFormSelect
              id="measurement_unit"
              label="Measurement Unit"
              value={values.measurementUnit || ''}
              onValueChange={(value) => onChange('measurementUnit', value)}
              options={measurementUnits}
              error={errors.measurementUnit}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryFormField
              label="Location"
              name="location"
              value={values.location || ''}
              onChange={(e) => onChange('location', e.target.value)}
              error={errors.location}
              placeholder="Shelf A1, Bin 5"
            />

            <InventoryFormField
              label="On Hold"
              name="onHold"
              type="number"
              value={values.onHold || 0}
              onChange={(e) => onChange('onHold', parseInt(e.target.value) || 0)}
              error={errors.onHold}
              min="0"
              placeholder="0"
              description="Quantity reserved/on hold"
            />

            <InventoryFormField
              label="On Order"
              name="onOrder"
              type="number"
              value={values.onOrder || 0}
              onChange={(e) => onChange('onOrder', parseInt(e.target.value) || 0)}
              error={errors.onOrder}
              min="0"
              placeholder="0"
              description="Quantity currently on order"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryFormField
              label="Minimum Stock Level"
              name="minStockLevel"
              type="number"
              value={values.minStockLevel || 0}
              onChange={(e) => onChange('minStockLevel', parseInt(e.target.value) || 0)}
              error={errors.minStockLevel}
              min="0"
              placeholder="1"
            />

            <InventoryFormField
              label="Maximum Stock Level"
              name="maxStockLevel"
              type="number"
              value={values.maxStockLevel || 0}
              onChange={(e) => onChange('maxStockLevel', parseInt(e.target.value) || 0)}
              error={errors.maxStockLevel}
              min="0"
              placeholder="100"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
