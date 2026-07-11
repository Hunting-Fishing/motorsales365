
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { FieldSection } from "./FieldSection";
import { toast } from "sonner";

export interface FieldDefinition {
  id: string;
  label: string;
  isRequired: boolean;
  description?: string;
}

export function InventoryFieldManager() {
  const [basicFields, setBasicFields] = useState<FieldDefinition[]>([
    { id: "name", label: "Name", isRequired: true, description: "Item name or title" },
    { id: "sku", label: "SKU", isRequired: true, description: "Stock keeping unit" },
    { id: "partNumber", label: "Part Number", isRequired: false, description: "Manufacturer part number" },
    { id: "category", label: "Category", isRequired: true, description: "Primary category" }
  ]);
  
  const [stockFields, setStockFields] = useState<FieldDefinition[]>([
    { id: "quantity", label: "Quantity", isRequired: true, description: "Current stock level" },
    { id: "location", label: "Location", isRequired: false, description: "Storage location" },
    { id: "reorderPoint", label: "Reorder Point", isRequired: false, description: "Minimum quantity before reordering" },
    { id: "cost", label: "Cost", isRequired: true, description: "Unit cost price" }
  ]);
  
  const [pricingFields, setPricingFields] = useState<FieldDefinition[]>([
    { id: "unitPrice", label: "Unit Price", isRequired: true, description: "Selling price per unit" },
    { id: "marginMarkup", label: "Markup/Margin", isRequired: false, description: "Profit percentage" }
  ]);

  // Handler for toggling field requirement status
  const handleToggleField = (fieldId: string, section: "basic" | "stock" | "pricing") => {
    switch (section) {
      case "basic":
        setBasicFields(fields => fields.map(field => 
          field.id === fieldId ? { ...field, isRequired: !field.isRequired } : field
        ));
        break;
      case "stock":
        setStockFields(fields => fields.map(field => 
          field.id === fieldId ? { ...field, isRequired: !field.isRequired } : field
        ));
        break;
      case "pricing":
        setPricingFields(fields => fields.map(field => 
          field.id === fieldId ? { ...field, isRequired: !field.isRequired } : field
        ));
        break;
    }
    // Show toast notification
    toast.success("Field settings updated");
  };

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem("inventoryBasicFields", JSON.stringify(basicFields));
    localStorage.setItem("inventoryStockFields", JSON.stringify(stockFields));
    localStorage.setItem("inventoryPricingFields", JSON.stringify(pricingFields));
  }, [basicFields, stockFields, pricingFields]);

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedBasicFields = localStorage.getItem("inventoryBasicFields");
    const savedStockFields = localStorage.getItem("inventoryStockFields");
    const savedPricingFields = localStorage.getItem("inventoryPricingFields");
    
    if (savedBasicFields) setBasicFields(JSON.parse(savedBasicFields));
    if (savedStockFields) setStockFields(JSON.parse(savedStockFields));
    if (savedPricingFields) setPricingFields(JSON.parse(savedPricingFields));
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Inventory Field Settings</CardTitle>
          <CardDescription>
            Configure which fields are required for your inventory items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4">
            Customize which fields are required, optional, or hidden when creating and editing inventory items.
          </p>
          <div className="flex flex-col space-y-8 mt-4">
            <FieldSection 
              title="Basic Information" 
              description="Core details about your inventory items"
              fields={basicFields}
              onToggle={(fieldId) => handleToggleField(fieldId, "basic")}
            />
            
            <FieldSection 
              title="Stock Information" 
              description="Quantity and storage details"
              fields={stockFields}
              onToggle={(fieldId) => handleToggleField(fieldId, "stock")}
            />
            
            <FieldSection 
              title="Pricing" 
              description="Cost and selling price information"
              fields={pricingFields}
              onToggle={(fieldId) => handleToggleField(fieldId, "pricing")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Table Display Settings</CardTitle>
          <CardDescription>
            Configure how the inventory table displays data
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <p>Manage which columns are visible in the inventory table and their order.</p>
          <Button asChild>
            <Link to="/settings/inventory?tab=columns">Manage Table Columns</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
