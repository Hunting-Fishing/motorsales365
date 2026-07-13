
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { WorkOrderInventoryItem } from "@/types/workOrder";
import { InventorySelectionDialog } from "./InventorySelectionDialog";
import { SpecialOrderItemForm } from "./SpecialOrderItemForm";
import { InventoryItemExtended } from "@/types/inventory";
import { UseFormReturn } from "react-hook-form";

interface WorkOrderInventoryFieldProps {
  form: UseFormReturn<any>;
}

export const WorkOrderInventoryField: React.FC<WorkOrderInventoryFieldProps> = ({ form }) => {
  const [showInventoryDialog, setShowInventoryDialog] = useState(false);
  const [showSpecialOrderForm, setShowSpecialOrderForm] = useState(false);

  // Get current inventory items from form
  const currentItems = form.watch("inventoryItems") || [];

  const normalizeToWorkOrderItem = (item: any): WorkOrderInventoryItem => {
    return {
      id: item.id || `temp-${Date.now()}-${Math.random()}`,
      name: item.name || "",
      sku: item.sku || "",
      category: item.category || "",
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      total: item.total || (item.quantity || 1) * (item.unit_price || 0),
      ...(item.notes && { notes: item.notes }),
      ...(item.itemStatus && { itemStatus: item.itemStatus }),
      ...(item.estimatedArrivalDate && { estimatedArrivalDate: item.estimatedArrivalDate }),
      ...(item.supplierName && { supplierName: item.supplierName }),
      ...(item.supplierOrderRef && { supplierOrderRef: item.supplierOrderRef })
    };
  };

  const handleAddInventoryItem = (selectedItem: InventoryItemExtended) => {
    const existingItems = form.getValues("inventoryItems") || [];
    
    // Check if item already exists
    const existingItemIndex = existingItems.findIndex((item: any) => item.id === selectedItem.id);
    
    let updatedItems: WorkOrderInventoryItem[];
    
    if (existingItemIndex >= 0) {
      // Update quantity of existing item
      updatedItems = existingItems.map((item: any, index: number) => {
        if (index === existingItemIndex) {
          const updatedItem = {
            ...item,
            quantity: (item.quantity || 1) + 1,
            total: ((item.quantity || 1) + 1) * (item.unit_price || 0)
          };
          return normalizeToWorkOrderItem(updatedItem);
        }
        return normalizeToWorkOrderItem(item);
      });
    } else {
      // Add new item
      const newItem: WorkOrderInventoryItem = {
        id: selectedItem.id,
        name: selectedItem.name,
        sku: selectedItem.sku,
        category: selectedItem.category || '',
        quantity: 1,
        unit_price: selectedItem.unit_price,
        total: selectedItem.unit_price
      };
      
      updatedItems = [...existingItems.map(normalizeToWorkOrderItem), newItem];
    }
    
    form.setValue("inventoryItems", updatedItems, { shouldValidate: true });
    setShowInventoryDialog(false);
  };

  const handleAddSpecialOrder = (specialOrderData: WorkOrderInventoryItem) => {
    const existingItems = form.getValues("inventoryItems") || [];
    const normalizedExistingItems = existingItems.map(normalizeToWorkOrderItem);
    const updatedItems = [...normalizedExistingItems, specialOrderData];
    
    form.setValue("inventoryItems", updatedItems, { shouldValidate: true });
    setShowSpecialOrderForm(false);
  };

  const handleRemoveItem = (itemId: string) => {
    const existingItems = form.getValues("inventoryItems") || [];
    const updatedItems = existingItems
      .filter((item: any) => item.id !== itemId)
      .map(normalizeToWorkOrderItem);
    
    form.setValue("inventoryItems", updatedItems, { shouldValidate: true });
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const existingItems = form.getValues("inventoryItems") || [];
    const updatedItems = existingItems.map((item: any) => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          quantity: newQuantity,
          total: newQuantity * (item.unit_price || 0)
        };
        return normalizeToWorkOrderItem(updatedItem);
      }
      return normalizeToWorkOrderItem(item);
    });
    
    form.setValue("inventoryItems", updatedItems, { shouldValidate: true });
  };

  const calculateTotalCost = () => {
    return currentItems.reduce((total: number, item: any) => {
      return total + (item.total || 0);
    }, 0);
  };

  const suppliers = ["Supplier A", "Supplier B", "Supplier C"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowInventoryDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add from Inventory
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowSpecialOrderForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Special Order Item
          </Button>
        </div>

        {/* Items List */}
        {currentItems.length > 0 ? (
          <div className="space-y-3">
            {currentItems.map((item: any, index: number) => (
              <div key={item.id || index} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">
                    SKU: {item.sku} | Category: {item.category}
                  </div>
                  {item.itemStatus && (
                    <div className="text-xs text-blue-600 mt-1">
                      Status: {item.itemStatus}
                      {item.estimatedArrivalDate && ` | ETA: ${item.estimatedArrivalDate}`}
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity || 1}
                    onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-20"
                  />
                  <span className="text-sm text-gray-500">×</span>
                  <span className="text-sm font-medium">${(item.unit_price || 0).toFixed(2)}</span>
                  <span className="text-sm font-bold min-w-[80px] text-right">
                    ${(item.total || 0).toFixed(2)}
                  </span>
                </div>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {/* Total */}
            <div className="flex justify-end pt-3 border-t">
              <div className="text-lg font-bold">
                Total: ${calculateTotalCost().toFixed(2)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No inventory items added yet
          </div>
        )}

        {/* Dialogs */}
        <InventorySelectionDialog
          open={showInventoryDialog}
          onOpenChange={setShowInventoryDialog}
          onAddItem={handleAddInventoryItem}
        />

        {showSpecialOrderForm && (
          <div className="border rounded-lg p-4 mt-4">
            <SpecialOrderItemForm
              onAdd={handleAddSpecialOrder}
              onCancel={() => setShowSpecialOrderForm(false)}
              suppliers={suppliers}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
