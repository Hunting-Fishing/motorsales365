
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { InventoryItemExtended } from "@/types/inventory";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Edit, Info } from "lucide-react";
import { EditInventoryDialog } from "./EditInventoryDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface InventoryTableProps {
  items: InventoryItemExtended[];
  onUpdateItem?: (id: string, updates: Partial<InventoryItemExtended>) => Promise<InventoryItemExtended>;
}

export function InventoryTable({ items, onUpdateItem }: InventoryTableProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItemExtended | null>(null);

  const handleEditClick = (item: InventoryItemExtended) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  const handleItemUpdated = () => {
    // Refresh the inventory data
    window.location.reload();
  };

  if (items.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md bg-gray-50">
        <p className="text-gray-500">No inventory items found matching your criteria.</p>
      </div>
    );
  }

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let className = "";
    
    switch (status.toLowerCase()) {
      case "in stock":
      case "active":
        className = "bg-green-100 text-green-800 border-green-300";
        break;
      case "low stock":
        className = "bg-yellow-100 text-yellow-800 border-yellow-300";
        break;
      case "out of stock":
        className = "bg-red-100 text-red-800 border-red-300";
        break;
      case "discontinued":
        className = "bg-gray-100 text-gray-800 border-gray-300";
        break;
      case "on order":
        className = "bg-blue-100 text-blue-800 border-blue-300";
        break;
      default:
        className = "bg-purple-100 text-purple-800 border-purple-300";
    }
    
    return (
      <Badge variant="outline" className={className}>
        {status}
      </Badge>
    );
  };

  // Function to render the list of applicable fees
  const renderApplicableFees = (item: InventoryItemExtended) => {
    const fees = [];
    
    if (item.coreChargeApplicable && item.coreCharge) {
      fees.push(`Core: ${formatCurrency(item.coreCharge)}`);
    }
    
    if (item.hazardousFeeApplicable && item.hazardousFee) {
      fees.push(`Hazardous: ${formatCurrency(item.hazardousFee)}`);
    }
    
    if (item.shippingFee) {
      fees.push(`Shipping: ${formatCurrency(item.shippingFee)}`);
    }
    
    if (item.otherFees) {
      fees.push(`Other: ${formatCurrency(item.otherFees)}`);
    }
    
    return fees.length > 0 ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-xs text-blue-600 cursor-help">
              <Info className="h-3.5 w-3.5 mr-1" /> Fees
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              {fees.map((fee, index) => (
                <div key={index}>{fee}</div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;
  };

  // Function to render the applicable taxes
  const renderApplicableTaxes = (item: InventoryItemExtended) => {
    const taxes = [];
    
    if (item.gstApplicable && item.gstRate) {
      taxes.push(`GST: ${item.gstRate}%`);
    }
    
    if (item.pstApplicable && item.pstRate) {
      taxes.push(`PST: ${item.pstRate}%`);
    }
    
    if (item.hstApplicable && item.hstRate) {
      taxes.push(`HST: ${item.hstRate}%`);
    }
    
    return taxes.length > 0 ? (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center text-xs text-purple-600 cursor-help">
              <Info className="h-3.5 w-3.5 mr-1" /> Tax
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              {taxes.map((tax, index) => (
                <div key={index}>{tax}</div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ) : null;
  };

  return (
    <>
      <div className="border rounded-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[240px]">Item</TableHead>
              <TableHead className="w-[100px]">SKU</TableHead>
              <TableHead className="w-[100px]">Category</TableHead>
              <TableHead className="w-[120px]">Supplier</TableHead>
              <TableHead className="w-[100px] text-right">Qty</TableHead>
              <TableHead className="w-[100px] text-right">Price</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[100px] text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div>
                    {item.name}
                    {item.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {renderApplicableFees(item)}
                      {renderApplicableTaxes(item)}
                      {item.unitOfMeasurement && item.unitOfMeasurement !== 'each' && (
                        <span className="text-xs text-gray-500">
                          Unit: {item.unitOfMeasurement}
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{item.sku}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.supplier || "—"}</TableCell>
                <TableCell className="text-right">
                  {item.quantity}
                  {item.reorder_point && item.quantity <= item.reorder_point && (
                    <p className="text-xs text-red-600">Low Stock</p>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                <TableCell className="text-center">
                  {renderStatusBadge(item.status)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(item)}
                    className="h-8 w-8 p-0"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EditInventoryDialog
        item={selectedItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onItemUpdated={handleItemUpdated}
      />
    </>
  );
}
