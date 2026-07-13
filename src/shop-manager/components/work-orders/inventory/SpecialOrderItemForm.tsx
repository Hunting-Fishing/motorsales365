
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InventoryFormSelect } from "@/components/inventory/form/InventoryFormSelect";
import { WorkOrderInventoryItem } from "@/types/workOrder";

interface SpecialOrderItemFormProps {
  onAdd: (item: WorkOrderInventoryItem) => void;
  onCancel: () => void;
  suppliers: string[];
}

export function SpecialOrderItemForm({ onAdd, onCancel, suppliers }: SpecialOrderItemFormProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Special Order");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [supplier, setSupplier] = useState(suppliers.length > 0 ? suppliers[0] : "");
  const [orderRef, setOrderRef] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedDate, setEstimatedDate] = useState<Date | undefined>(undefined);
  const [itemStatus, setItemStatus] = useState<"special-order" | "ordered" | "in-stock">("special-order");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newItem: WorkOrderInventoryItem = {
      id: `temp-${Date.now()}`,
      name,
      sku: sku || `SO-${Date.now().toString(36)}`,
      category,
      quantity,
      unit_price: unitPrice,
      total: quantity * unitPrice,
      itemStatus,
      estimatedArrivalDate: estimatedDate ? format(estimatedDate, 'yyyy-MM-dd') : undefined,
      supplierName: supplier,
      supplierOrderRef: orderRef,
      notes
    };
    
    onAdd(newItem);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="name">Item Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="sku">SKU/Part Number</Label>
          <Input
            id="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="Auto-generated if empty"
          />
        </div>
        
        <div>
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="unitPrice">Unit Price *</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min={0}
            value={unitPrice}
            onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="itemStatus">Item Status</Label>
          <InventoryFormSelect
            id="itemStatus"
            label=""
            value={itemStatus}
            onValueChange={(value) => setItemStatus(value as "special-order" | "ordered" | "in-stock")}
            options={["special-order", "ordered", "in-stock"]}
          />
        </div>
        
        <div>
          <Label htmlFor="supplier">Supplier</Label>
          <InventoryFormSelect
            id="supplier"
            label=""
            value={supplier}
            onValueChange={setSupplier}
            options={suppliers}
          />
        </div>
        
        <div>
          <Label htmlFor="orderRef">Order Reference</Label>
          <Input
            id="orderRef"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
          />
        </div>
        
        <div>
          <Label>Estimated Arrival Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !estimatedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {estimatedDate ? format(estimatedDate, "PPP") : "Select a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={estimatedDate}
                onSelect={setEstimatedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Add Special Order Item
        </Button>
      </div>
    </form>
  );
}
