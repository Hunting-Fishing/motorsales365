import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, Trash2 } from 'lucide-react';
import { UltimateAddPartDialog } from '@/components/work-orders/parts/UltimateAddPartDialog';
import { WorkOrderJobLine } from '@/types/jobLine';
import { formatCurrency } from '@/utils/formatters';

interface ComprehensiveQuotePart {
  id?: string;
  name: string;
  part_number: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Advanced pricing fields from work order parts
  supplierCost?: number;
  markupPercentage?: number;
  customerPrice?: number;
  supplierSuggestedRetail?: number;
  // Classification and metadata
  part_type?: string;
  category?: string;
  status?: string;
  // Tax and charges
  isTaxable?: boolean;
  coreChargeAmount?: number;
  coreChargeApplied?: boolean;
  // Supplier and inventory
  supplierName?: string;
  supplierOrderRef?: string;
  invoiceNumber?: string;
  poLine?: string;
  inventoryItemId?: string;
  isStockItem?: boolean;
  // Warranty and installation
  warrantyDuration?: string;
  warrantyExpiryDate?: string;
  installDate?: string;
  installedBy?: string;
  estimatedArrivalDate?: string;
  // Notes
  notes?: string;
  notesInternal?: string;
}

interface ComprehensiveQuotePartsSelectorProps {
  selectedParts: ComprehensiveQuotePart[];
  onPartsChange: (parts: ComprehensiveQuotePart[]) => void;
  quoteId?: string;
}

export function ComprehensiveQuotePartsSelector({ 
  selectedParts, 
  onPartsChange, 
  quoteId 
}: ComprehensiveQuotePartsSelectorProps) {
  const [isAddPartOpen, setIsAddPartOpen] = useState(false);

  // Empty job lines for quotes - parts are managed via selectedParts prop
  const jobLines: WorkOrderJobLine[] = [];

  const handlePartAdded = async () => {
    // For now, this is a placeholder
    // In the future, this would be integrated with quote parts database operations
    console.log('Part added to quote via comprehensive form');
    // Close the dialog
    setIsAddPartOpen(false);
  };

  const removePart = (index: number) => {
    const updatedParts = selectedParts.filter((_, i) => i !== index);
    onPartsChange(updatedParts);
  };

  const totalPartsValue = selectedParts.reduce((sum, part) => {
    return sum + (part.total_price || (part.quantity * part.unit_price));
  }, 0);

  const totalProfitMargin = selectedParts.reduce((sum, part) => {
    if (part.supplierCost && part.customerPrice) {
      const profit = part.customerPrice - part.supplierCost;
      return sum + (profit * part.quantity);
    }
    return sum;
  }, 0);

  const averageMarkup = selectedParts.length > 0 
    ? selectedParts.reduce((sum, part) => sum + (part.markupPercentage || 0), 0) / selectedParts.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Add Parts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Parts & Materials
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{selectedParts.length} items</span>
              <span className="font-medium">{formatCurrency(totalPartsValue)}</span>
              {averageMarkup > 0 && (
                <span className="text-green-600">Avg {averageMarkup.toFixed(1)}% markup</span>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setIsAddPartOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Part with Full Details
          </Button>
          
          {totalProfitMargin > 0 && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-green-800">Total Profit Margin: </span>
                <span className="text-green-700">{formatCurrency(totalProfitMargin)}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Parts List */}
      {selectedParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Parts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedParts.map((part, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{part.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Part #: {part.part_number}
                        {part.category && ` • Category: ${part.category}`}
                        {part.part_type && ` • Type: ${part.part_type}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePart(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Quantity:</span>
                      <div className="font-medium">{part.quantity}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit Price:</span>
                      <div className="font-medium">{formatCurrency(part.unit_price)}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <div className="font-medium">{formatCurrency(part.total_price || (part.quantity * part.unit_price))}</div>
                    </div>
                    {part.markupPercentage && (
                      <div>
                        <span className="text-muted-foreground">Markup:</span>
                        <div className="font-medium text-green-600">{part.markupPercentage.toFixed(1)}%</div>
                      </div>
                    )}
                  </div>

                  {/* Advanced pricing information */}
                  {(part.supplierCost || part.customerPrice || part.supplierName) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {part.supplierCost && (
                          <div>
                            <span className="text-muted-foreground">Supplier Cost:</span>
                            <div className="font-medium">{formatCurrency(part.supplierCost)}</div>
                          </div>
                        )}
                        {part.customerPrice && (
                          <div>
                            <span className="text-muted-foreground">Customer Price:</span>
                            <div className="font-medium">{formatCurrency(part.customerPrice)}</div>
                          </div>
                        )}
                        {part.supplierName && (
                          <div>
                            <span className="text-muted-foreground">Supplier:</span>
                            <div className="font-medium">{part.supplierName}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Warranty and core charge information */}
                  {(part.warrantyDuration || part.coreChargeApplied) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {part.warrantyDuration && (
                          <div>
                            <span className="text-muted-foreground">Warranty:</span>
                            <div className="font-medium">{part.warrantyDuration}</div>
                          </div>
                        )}
                        {part.coreChargeApplied && part.coreChargeAmount && (
                          <div>
                            <span className="text-muted-foreground">Core Charge:</span>
                            <div className="font-medium">{formatCurrency(part.coreChargeAmount)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {part.description && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1">{part.description}</p>
                    </div>
                  )}

                  {part.notes && (
                    <div className="mt-2">
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="text-sm mt-1">{part.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {selectedParts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No parts added yet</h3>
              <p className="text-muted-foreground mb-6">
                Add parts with full pricing details, markup calculations, and supplier information.
              </p>
              <Button onClick={() => setIsAddPartOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Part
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ultimate Add Part Dialog - Same as Work Orders */}
      <UltimateAddPartDialog
        open={isAddPartOpen}
        onOpenChange={setIsAddPartOpen}
        workOrderId={quoteId || 'quote-temp-id'}
        jobLines={jobLines}
        onPartAdded={handlePartAdded}
      />
    </div>
  );
}