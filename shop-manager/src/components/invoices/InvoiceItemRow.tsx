
import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceItem } from "@/types/invoice";

interface InvoiceItemRowProps {
  item: InvoiceItem;
  onRemoveItem: (id: string) => void;
  onUpdateItemQuantity: (id: string, quantity: number) => void;
  onUpdateItemDescription: (id: string, description: string) => void;
  onUpdateItemPrice: (id: string, price: number) => void;
}

export function InvoiceItemRow({
  item,
  onRemoveItem,
  onUpdateItemQuantity,
  onUpdateItemDescription,
  onUpdateItemPrice,
}: InvoiceItemRowProps) {
  return (
    <tr key={item.id}>
      <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
      <td className="px-4 py-3 text-sm text-slate-500">
        <Input 
          value={item.description} 
          onChange={(e) => onUpdateItemDescription(item.id, e.target.value)}
          className="h-8 text-sm"
        />
      </td>
      <td className="px-4 py-3 text-sm text-center">
        <div className="flex items-center justify-center">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => onUpdateItemQuantity(item.id, item.quantity - 1)}
          >
            -
          </Button>
          <Input 
            type="number" 
            value={item.quantity}
            onChange={(e) => onUpdateItemQuantity(item.id, parseInt(e.target.value) || 0)}
            className="h-7 w-16 mx-1 text-center"
            min={1}
          />
          <Button 
            variant="outline" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => onUpdateItemQuantity(item.id, item.quantity + 1)}
          >
            +
          </Button>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-right">
        <div className="flex items-center justify-end">
          <span className="mr-1">$</span>
          <Input 
            type="number" 
            value={item.price}
            onChange={(e) => onUpdateItemPrice(item.id, parseFloat(e.target.value) || 0)}
            className="h-7 w-24 text-right"
            step="0.01"
            min="0"
          />
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-right">
        ${item.total.toFixed(2)}
      </td>
      <td className="px-4 py-3 text-sm text-center">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-red-500"
          onClick={() => onRemoveItem(item.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
}
