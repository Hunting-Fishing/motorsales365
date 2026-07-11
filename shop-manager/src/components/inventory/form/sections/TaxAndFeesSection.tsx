
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InventoryFormField } from '../InventoryFormField';
import { Checkbox } from '@/components/ui/checkbox';

interface TaxAndFeesSectionProps {
  values: any;
  errors: any;
  onChange: (field: string, value: any) => void;
}

export function TaxAndFeesSection({ values, errors, onChange }: TaxAndFeesSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tax & Fees</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InventoryFormField
              label="Tax Rate (%)"
              name="taxRate"
              type="number"
              value={values.taxRate || ''}
              onChange={(e) => onChange('taxRate', parseFloat(e.target.value) || 0)}
              error={errors.taxRate}
              min="0"
              max="100"
              step="0.1"
              placeholder="8.5"
              description="Sales tax rate percentage"
            />

            <InventoryFormField
              label="Environmental Fee"
              name="environmentalFee"
              type="number"
              value={values.environmentalFee || ''}
              onChange={(e) => onChange('environmentalFee', parseFloat(e.target.value) || 0)}
              error={errors.environmentalFee}
              min="0"
              step="0.01"
              placeholder="5.00"
              description="Environmental disposal fee"
            />

            <InventoryFormField
              label="Core Charge"
              name="coreCharge"
              type="number"
              value={values.coreCharge || ''}
              onChange={(e) => onChange('coreCharge', parseFloat(e.target.value) || 0)}
              error={errors.coreCharge}
              min="0"
              step="0.01"
              placeholder="25.00"
              description="Refundable core charge"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InventoryFormField
              label="Hazmat Fee"
              name="hazmatFee"
              type="number"
              value={values.hazmatFee || ''}
              onChange={(e) => onChange('hazmatFee', parseFloat(e.target.value) || 0)}
              error={errors.hazmatFee}
              min="0"
              step="0.01"
              placeholder="15.00"
              description="Hazardous materials handling fee"
            />

            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="taxExempt"
                checked={values.taxExempt || false}
                onCheckedChange={(checked) => onChange('taxExempt', checked)}
              />
              <label htmlFor="taxExempt" className="text-sm font-medium">
                Tax Exempt Item
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
