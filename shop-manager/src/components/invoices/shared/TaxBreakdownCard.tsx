import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatTaxRate } from '@/utils/taxCalculations';

interface TaxBreakdownCardProps {
  laborTax: number;
  partsTax: number;
  totalTax: number;
  taxBreakdown: {
    laborTaxRate: number;
    partsTaxRate: number;
    taxDescription: string;
  };
  isCustomerTaxExempt?: boolean;
  fleetDiscount?: number;
  className?: string;
}

export function TaxBreakdownCard({
  laborTax,
  partsTax,
  totalTax,
  taxBreakdown,
  isCustomerTaxExempt,
  fleetDiscount,
  className
}: TaxBreakdownCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          Tax Breakdown
          {isCustomerTaxExempt && (
            <Badge variant="secondary" className="text-xs">
              Tax Exempt
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Labor Tax ({formatTaxRate(taxBreakdown.laborTaxRate)}):</span>
          <span>{formatCurrency(laborTax)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span>Parts Tax ({formatTaxRate(taxBreakdown.partsTaxRate)}):</span>
          <span>{formatCurrency(partsTax)}</span>
        </div>
        
        {fleetDiscount && fleetDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Fleet Discount:</span>
            <span>-{formatCurrency(fleetDiscount)}</span>
          </div>
        )}
        
        <div className="border-t pt-2">
          <div className="flex justify-between font-medium">
            <span>{taxBreakdown.taxDescription}:</span>
            <span>{formatCurrency(totalTax)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}