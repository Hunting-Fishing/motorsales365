
import React from "react";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTaxSettings } from "@/hooks/useTaxSettings";
import { useShopId } from "@/hooks/useShopId";
import { calculateTax } from "@/utils/taxCalculations";

interface WorkOrderSummaryProps {
  form: any;
  total: number;
}

export function WorkOrderSummary({ form, total }: WorkOrderSummaryProps) {
  const { shopId } = useShopId();
  const { taxSettings } = useTaxSettings(shopId || undefined);
  
  // Calculate tax using centralized tax system
  const taxCalculation = calculateTax({
    laborAmount: total * 0.6, // Estimate 60% labor
    partsAmount: total * 0.4,  // Estimate 40% parts
    taxSettings
  });
  
  const tax = taxCalculation.totalTax;
  const grandTotal = taxCalculation.grandTotal;

  return (
    <div>
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg font-bold">Work Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Notes Section */}
          <div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-semibold">Technician Notes & Recommendations</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter technician notes, recommendations, and other important details" 
                      className="h-32 bg-white"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Totals Section */}
          <div className="bg-slate-50 rounded-lg p-5">
            <h3 className="font-bold text-slate-800 mb-4 text-center">
              Order Summary
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Parts & Labor Subtotal:</span>
                <span className="font-medium">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{taxCalculation.taxBreakdown.taxDescription} ({((taxCalculation.taxBreakdown.laborTaxRate + taxCalculation.taxBreakdown.partsTaxRate) / 2).toFixed(2)}%):</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <div className="border-t border-slate-300 my-2 pt-2 flex justify-between font-bold">
                <span>Grand Total:</span>
                <span className="text-xl">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-dashed border-slate-300">
              <div className="text-sm text-center text-slate-600">
                I hereby authorize the repair work described along with necessary materials and grant permission to operate the vehicle for the purpose of testing and inspection.
              </div>
              <div className="mt-4 pt-4 border-t border-slate-300">
                <div className="text-xs mb-1">Customer Signature:</div>
                <div className="h-10 bg-white border border-slate-300 rounded"></div>
                <div className="flex justify-between mt-1 text-xs text-slate-500">
                  <span>Date: {new Date().toLocaleDateString()}</span>
                  <span>Time: {new Date().toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </div>
  );
}
