
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkOrderJobLine } from '@/types/jobLine';
import { WorkOrderPart } from '@/types/workOrderPart';
import { Customer } from '@/types/customer';
import { useWorkOrderTaxCalculations } from '@/hooks/useWorkOrderTaxCalculations';
import { Calculator, DollarSign, TrendingUp, Receipt, ShieldCheck } from 'lucide-react';

interface WorkOrderTotalsProps {
  jobLines: WorkOrderJobLine[];
  allParts: WorkOrderPart[];
  customer?: Customer | null;
}

export function WorkOrderTotals({ jobLines, allParts, customer }: WorkOrderTotalsProps) {
  const taxCalculations = useWorkOrderTaxCalculations({
    jobLines,
    parts: allParts,
    customer
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  return (
    <Card className="modern-card gradient-border group hover:shadow-lg transition-all duration-300">
      <CardHeader className="pb-4 bg-gradient-subtle rounded-t-lg">
        <CardTitle className="section-title flex items-center gap-3 font-heading text-foreground">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 backdrop-blur-sm">
        {/* Tax Exemption Status */}
        {taxCalculations.isCustomerTaxExempt && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">
              Tax Exempt Customer
              {taxCalculations.customerTaxExemptionId && (
                <span className="ml-1 text-xs">
                  (#{taxCalculations.customerTaxExemptionId})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Parts & Labor Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground font-body">Parts Subtotal:</span>
            </div>
            <span className="font-semibold text-foreground font-body">{formatCurrency(taxCalculations.partsAmount)}</span>
          </div>
          
          <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-subtle border hover:shadow-md transition-all duration-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground font-body">Labor Subtotal:</span>
            </div>
            <span className="font-semibold text-foreground font-body">{formatCurrency(taxCalculations.laborAmount)}</span>
          </div>
        </div>

        <div className="border-t border-muted/30 pt-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-muted-foreground font-body">Subtotal:</span>
            <span className="font-semibold text-foreground font-body">{formatCurrency(taxCalculations.subtotal)}</span>
          </div>
          
          {/* Tax Breakdown */}
          {taxCalculations.totalTax > 0 ? (
            <>
              {taxCalculations.laborTax > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground font-body">
                    Labor Tax ({taxCalculations.taxBreakdown.laborTaxRate}%):
                  </span>
                  <span className="font-semibold text-foreground font-body">{formatCurrency(taxCalculations.laborTax)}</span>
                </div>
              )}
              {taxCalculations.partsTax > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-muted-foreground font-body">
                    Parts Tax ({taxCalculations.taxBreakdown.partsTaxRate}%):
                  </span>
                  <span className="font-semibold text-foreground font-body">{formatCurrency(taxCalculations.partsTax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground font-body">
                  Total Tax:
                </span>
                <span className="font-semibold text-foreground font-body">{formatCurrency(taxCalculations.totalTax)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground font-body">
                {taxCalculations.taxBreakdown.taxDescription}:
              </span>
              <span className="font-semibold text-foreground font-body">$0.00</span>
            </div>
          )}
        </div>

        <div className="border-t border-muted/30 pt-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <span className="text-lg font-bold text-foreground font-heading">Total:</span>
            </div>
            <span className="text-xl font-bold text-primary font-heading gradient-text">
              {formatCurrency(taxCalculations.grandTotal)}
            </span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="pt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-center p-2 rounded bg-muted/20">
              <div className="font-semibold text-foreground">{allParts.length}</div>
              <div className="text-muted-foreground">Parts</div>
            </div>
            <div className="text-center p-2 rounded bg-muted/20">
              <div className="font-semibold text-foreground">{jobLines.length}</div>
              <div className="text-muted-foreground">Services</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
