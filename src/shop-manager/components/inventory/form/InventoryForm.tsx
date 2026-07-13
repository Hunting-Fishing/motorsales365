
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryFormField } from "./InventoryFormField";
import { InventoryFormActions } from "./InventoryFormActions";
import { InventoryItemExtended } from "@/types/inventory";
import { InventoryFormProps } from "./InventoryFormProps";

export function InventoryForm({ onSubmit, onCancel, isLoading = false }: InventoryFormProps) {
  const [formData, setFormData] = useState<Partial<InventoryItemExtended>>({
    name: "",
    sku: "",
    description: "",
    category: "",
    supplier: "",
    location: "",
    unit_price: 0,
    quantity: 0,
    reorder_point: 0,
    status: "active"
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ""
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = "Item name is required";
    }
    if (!formData.sku?.trim()) {
      newErrors.sku = "SKU is required";
    }
    if (!formData.category?.trim()) {
      newErrors.category = "Category is required";
    }
    if (formData.unit_price === undefined || formData.unit_price < 0) {
      newErrors.unit_price = "Valid unit price is required";
    }
    if (formData.quantity === undefined || formData.quantity < 0) {
      newErrors.quantity = "Valid quantity is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData as Omit<InventoryItemExtended, "id">);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardTitle className="text-2xl">Add New Inventory Item</CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InventoryFormField
                label="Item Name"
                name="name"
                value={formData.name || ""}
                onChange={handleInputChange}
                error={errors.name}
                required
                placeholder="Enter item name"
              />

              <InventoryFormField
                label="SKU"
                name="sku"
                value={formData.sku || ""}
                onChange={handleInputChange}
                error={errors.sku}
                required
                placeholder="Enter SKU"
              />
            </div>

            <InventoryFormField
              label="Description"
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              error={errors.description}
              placeholder="Enter item description"
              as="textarea"
            />

            {/* Category and Organization */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InventoryFormField
                label="Category"
                name="category"
                value={formData.category || ""}
                onChange={handleInputChange}
                error={errors.category}
                required
                placeholder="Enter category"
              />

              <InventoryFormField
                label="Supplier"
                name="supplier"
                value={formData.supplier || ""}
                onChange={handleInputChange}
                error={errors.supplier}
                placeholder="Enter supplier"
              />

              <InventoryFormField
                label="Location"
                name="location"
                value={formData.location || ""}
                onChange={handleInputChange}
                error={errors.location}
                placeholder="Enter location"
              />
            </div>

            {/* Pricing and Inventory */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InventoryFormField
                label="Unit Price"
                name="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price?.toString() || ""}
                onChange={handleInputChange}
                error={errors.unit_price}
                required
                placeholder="0.00"
              />

              <InventoryFormField
                label="Quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity?.toString() || ""}
                onChange={handleInputChange}
                error={errors.quantity}
                required
                placeholder="0"
              />

              <InventoryFormField
                label="Reorder Point"
                name="reorder_point"
                type="number"
                min="0"
                value={formData.reorder_point?.toString() || ""}
                onChange={handleInputChange}
                error={errors.reorder_point}
                placeholder="0"
                description="Minimum quantity before reordering"
              />
            </div>

            <InventoryFormActions
              loading={isLoading}
              onCancel={onCancel}
              submitLabel="Add Item"
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
