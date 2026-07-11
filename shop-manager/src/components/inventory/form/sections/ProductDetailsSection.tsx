
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryFormField } from '../InventoryFormField';
import { Checkbox } from '@/components/ui/checkbox';

interface ProductDetailsSectionProps {
  values: any;
  errors: any;
  onChange: (field: string, value: any) => void;
}

export function ProductDetailsSection({ values, errors, onChange }: ProductDetailsSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryFormField
              label="Weight (lbs)"
              name="weight"
              type="number"
              value={values.weight || ''}
              onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)}
              error={errors.weight}
              min="0"
              step="0.1"
              placeholder="30.0"
              description="Product weight in pounds"
            />

            <InventoryFormField
              label="Dimensions"
              name="dimensions"
              value={values.dimensions || ''}
              onChange={(e) => onChange('dimensions', e.target.value)}
              error={errors.dimensions}
              placeholder="12x8x6 inches"
              description="Length x Width x Height"
            />

            <InventoryFormField
              label="Color"
              name="color"
              value={values.color || ''}
              onChange={(e) => onChange('color', e.target.value)}
              error={errors.color}
              placeholder="Black"
              description="Product color"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryFormField
              label="Material"
              name="material"
              value={values.material || ''}
              onChange={(e) => onChange('material', e.target.value)}
              error={errors.material}
              placeholder="Steel, Aluminum, etc."
              description="Primary material"
            />

            <InventoryFormField
              label="Model Year"
              name="modelYear"
              value={values.modelYear || ''}
              onChange={(e) => onChange('modelYear', e.target.value)}
              error={errors.modelYear}
              placeholder="2023"
              description="Applicable model year"
            />

            <InventoryFormField
              label="OEM Part Number"
              name="oemPartNumber"
              value={values.oemPartNumber || ''}
              onChange={(e) => onChange('oemPartNumber', e.target.value)}
              error={errors.oemPartNumber}
              placeholder="OEM-12345"
              description="Original equipment manufacturer part number"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryFormField
              label="Warranty Period"
              name="warrantyPeriod"
              value={values.warrantyPeriod || ''}
              onChange={(e) => onChange('warrantyPeriod', e.target.value)}
              error={errors.warrantyPeriod}
              placeholder="12 months"
              description="Warranty coverage period"
            />

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="universalPart"
                checked={values.universalPart || false}
                onCheckedChange={(checked) => onChange('universalPart', checked)}
              />
              <label htmlFor="universalPart" className="text-sm font-medium">
                Universal Part (fits multiple vehicles)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
