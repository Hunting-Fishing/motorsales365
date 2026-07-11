
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryFormField } from '../InventoryFormField';
import { InventoryFormSelect } from '../InventoryFormSelect';
import { HierarchicalCategorySelect } from '../HierarchicalCategorySelect';

interface BasicInfoSectionProps {
  values: any;
  errors: any;
  onChange: (field: string, value: any) => void;
}

const CATEGORY_OPTIONS = [
  'Engine Parts',
  'Transmission',
  'Brakes',
  'Suspension',
  'Electrical',
  'Body Parts',
  'Interior',
  'Fluids & Chemicals',
  'Tools & Equipment',
  'Filters',
  'Belts & Hoses',
  'Other'
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'in_stock', label: 'In Stock' },
  { value: 'low_stock', label: 'Low Stock' },
  { value: 'out_of_stock', label: 'Out of Stock' },
  { value: 'discontinued', label: 'Discontinued' },
  { value: 'on_order', label: 'On Order' },
];

export function BasicInfoSection({ values, errors, onChange }: BasicInfoSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryFormField
              label="Item Name"
              name="name"
              value={values.name || ''}
              onChange={(e) => onChange('name', e.target.value)}
              error={errors.name}
              required
              placeholder="Enter item name"
            />

            <InventoryFormField
              label="SKU / Part Number"
              name="sku"
              value={values.sku || ''}
              onChange={(e) => onChange('sku', e.target.value)}
              error={errors.sku}
              placeholder="Enter SKU or part number"
            />

            <InventoryFormField
              label="Barcode"
              name="barcode"
              value={values.barcode || ''}
              onChange={(e) => onChange('barcode', e.target.value)}
              error={errors.barcode}
              placeholder="Enter barcode"
            />

            <InventoryFormField
              label="Manufacturer Part Number"
              name="partNumber"
              value={values.partNumber || ''}
              onChange={(e) => onChange('partNumber', e.target.value)}
              error={errors.partNumber}
              placeholder="Enter manufacturer part number"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HierarchicalCategorySelect
              value={values.category || ''}
              subcategoryValue={values.subcategory || ''}
              onMainCategoryChange={(value) => onChange('category', value)}
              onSubcategoryChange={(value) => onChange('subcategory', value)}
              error={errors.category}
            />

            <div>
              <InventoryFormSelect
                id="status"
                label="Status"
                value={values.status || ''}
                onValueChange={(value) => onChange('status', value)}
                options={STATUS_OPTIONS}
                error={errors.status}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryFormField
              label="Manufacturer"
              name="manufacturer"
              value={values.manufacturer || ''}
              onChange={(e) => onChange('manufacturer', e.target.value)}
              error={errors.manufacturer}
              placeholder="Enter manufacturer name"
            />

            <InventoryFormField
              label="Supplier"
              name="supplier"
              value={values.supplier || ''}
              onChange={(e) => onChange('supplier', e.target.value)}
              error={errors.supplier}
              placeholder="Enter supplier name"
            />
          </div>

          <InventoryFormField
            label="Description"
            name="description"
            value={values.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            error={errors.description}
            placeholder="Enter item description"
            as="textarea"
          />

          <InventoryFormField
            label="Vehicle Compatibility"
            name="vehicleCompatibility"
            value={values.vehicleCompatibility || ''}
            onChange={(e) => onChange('vehicleCompatibility', e.target.value)}
            error={errors.vehicleCompatibility}
            placeholder="Enter compatible vehicles (e.g., 2015-2020 Honda Civic)"
          />
        </CardContent>
      </Card>
    </div>
  );
}
