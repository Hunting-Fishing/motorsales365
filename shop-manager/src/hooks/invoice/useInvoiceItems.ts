
import { useState } from "react";
import { InvoiceItem } from "@/types/invoice";
import { InventoryItem } from "@/types/inventory";

export function useInvoiceItems(initialItems: InvoiceItem[] = []) {
  const [items, setItems] = useState<InvoiceItem[]>(initialItems);

  // Handle adding an inventory item
  const handleAddInventoryItem = (item: InventoryItem) => {
    // Check if item already exists
    const existingItem = items.find(i => i.id === item.id);
    
    if (existingItem) {
      // Update quantity if already exists
      setItems(items.map(i => 
        i.id === item.id 
          ? { 
              ...i, 
              quantity: i.quantity + 1,
              total: (i.quantity + 1) * i.price
            } 
          : i
      ));
    } else {
      // Add new item
      const newItem: InvoiceItem = {
        id: item.id,
        name: item.name,
        description: item.description || "",
        quantity: 1,
        price: item.price,
        total: item.price,
        sku: item.sku || "",
      };
      
      // Only add category if it's allowed in InvoiceItem
      if (item.category) {
        (newItem as any).category = item.category;
      }
      
      setItems([...items, newItem]);
    }
  };

  // Handle removing an item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Handle updating item quantity
  const handleUpdateItemQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, quantity, total: quantity * item.price } 
        : item
    ));
  };

  // Handle updating item description
  const handleUpdateItemDescription = (id: string, description: string) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, description } 
        : item
    ));
  };

  // Handle updating item price
  const handleUpdateItemPrice = (id: string, price: number) => {
    setItems(items.map(item => 
      item.id === id 
        ? { ...item, price, total: item.quantity * price } 
        : item
    ));
  };

  // Handle adding labor item
  const handleAddLaborItem = () => {
    const newItem: InvoiceItem = {
      id: `labor-${Date.now()}`,
      name: "Service Labor",
      description: "Technician hours",
      quantity: 1,
      price: 100, // Default labor rate
      total: 100,
      sku: "LABOR",
      hours: true
    };
    
    setItems([...items, newItem]);
  };

  return {
    items,
    setItems,
    handleAddInventoryItem,
    handleRemoveItem,
    handleUpdateItemQuantity,
    handleUpdateItemDescription,
    handleUpdateItemPrice,
    handleAddLaborItem
  };
}
