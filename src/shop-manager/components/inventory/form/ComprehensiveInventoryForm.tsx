import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  DollarSign, 
  BarChart3, 
  Info, 
  Calculator, 
  FileText,
  Save,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

import { BasicInfoSection } from "./sections/BasicInfoSection";
import { PricingSection } from "./sections/PricingSection";
import { InventoryManagementSection } from "./sections/InventoryManagementSection";
import { ProductDetailsSection } from "./sections/ProductDetailsSection";
import { TaxAndFeesSection } from "./sections/TaxAndFeesSection";
import { AdditionalInfoSection } from "./sections/AdditionalInfoSection";

import { InventoryItemExtended } from "@/types/inventory";

interface ComprehensiveInventoryFormProps {
  onSubmit: (data: Omit<InventoryItemExtended, "id">) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  initialData?: InventoryItemExtended;
  isEditMode?: boolean;
}

const MEASUREMENT_UNITS = [
  "Each", "Set", "Pair", "Gallon", "Quart", "Liter", "Ounce", "Pound", "Kilogram", 
  "Foot", "Meter", "Inch", "Box", "Case", "Roll", "Tube"
];

const TABS = [
  { id: "basic", label: "Basic Info", icon: Package, description: "Item details & categorization" },
  { id: "pricing", label: "Pricing", icon: DollarSign, description: "Cost & pricing information" },
  { id: "inventory", label: "Inventory", icon: BarChart3, description: "Stock & location management" },
  { id: "details", label: "Details", icon: Info, description: "Product specifications" },
  { id: "tax", label: "Tax & Fees", icon: Calculator, description: "Tax rates & additional fees" },
  { id: "additional", label: "Additional", icon: FileText, description: "Notes & supplementary info" }
];

export function ComprehensiveInventoryForm({ 
  onSubmit, 
  onCancel, 
  isLoading = false,
  initialData,
  isEditMode = false
}: ComprehensiveInventoryFormProps) {
  const [currentTab, setCurrentTab] = useState("basic");
  const [formData, setFormData] = useState<any>(() => {
    if (initialData && isEditMode) {
      // Map database fields to form fields
      const mappedData = {
        ...initialData,
        // Map web_links from database to webLinks for form
        webLinks: (initialData as any).web_links || (initialData as any).webLinks || []
      };
      
      console.log('Loading edit data:', mappedData);
      console.log('Web links from DB:', (initialData as any).web_links);
      
      return mappedData;
    }
    
    return {
      // Basic Info
      name: "",
      sku: "",
      description: "",
      category: "",
      status: "active",
      manufacturer: "",
      supplier: "",
      vehicleCompatibility: "",
      
      // Pricing
      unit_price: 0,
      sell_price_per_unit: 0,
      marginMarkup: 0,
      
      // Inventory Management
      quantity: 0,
      reorder_point: 0,
      measurementUnit: "Each",
      location: "",
      
      // Product Details
      weight: 0,
      dimensions: "",
      color: "",
      material: "",
      
      // Tax & Fees
      taxRate: 0,
      environmentalFee: 0,
      coreCharge: 0,
      
      // Additional
      notes: "",
      webLinks: []
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }

    // Mark section as completed if required fields are filled
    updateSectionCompletion(field);
  };

  const updateSectionCompletion = (field: string) => {
    const newCompleted = new Set(completedSections);
    
    // Check basic section completion
    if (["name", "sku", "category"].includes(field)) {
      if (formData.name && formData.sku && formData.category) {
        newCompleted.add("basic");
      }
    }
    
    // Check pricing section completion
    if (["unit_price", "sell_price_per_unit"].includes(field)) {
      if (formData.unit_price > 0) {
        newCompleted.add("pricing");
      }
    }
    
    // Check inventory section completion
    if (["quantity", "reorder_point"].includes(field)) {
      if (formData.quantity >= 0 && formData.reorder_point >= 0) {
        newCompleted.add("inventory");
      }
    }

    setCompletedSections(newCompleted);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.name?.trim()) newErrors.name = "Item name is required";
    if (!formData.sku?.trim()) newErrors.sku = "SKU is required";
    if (!formData.category?.trim()) newErrors.category = "Category is required";
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
      // Switch to first tab with errors
      if (errors.name || errors.sku || errors.category) {
        setCurrentTab("basic");
      } else if (errors.unit_price) {
        setCurrentTab("pricing");
      } else if (errors.quantity) {
        setCurrentTab("inventory");
      }
      return;
    }

    try {
      await onSubmit(formData as Omit<InventoryItemExtended, "id">);
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const getCurrentTabIndex = () => TABS.findIndex(tab => tab.id === currentTab);
  const canGoNext = () => getCurrentTabIndex() < TABS.length - 1;
  const canGoPrevious = () => getCurrentTabIndex() > 0;

  const goNext = () => {
    if (canGoNext()) {
      setCurrentTab(TABS[getCurrentTabIndex() + 1].id);
    }
  };

  const goPrevious = () => {
    if (canGoPrevious()) {
      setCurrentTab(TABS[getCurrentTabIndex() - 1].id);
    }
  };

  const completionPercentage = (completedSections.size / TABS.length) * 100;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold">Add New Inventory Item</CardTitle>
              <p className="text-blue-100 mt-1">Complete all sections for comprehensive inventory management</p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-blue-500 text-white">
                {completedSections.size} of {TABS.length} sections completed
              </Badge>
              <Progress value={completionPercentage} className="w-32 mt-2" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-6 h-auto p-1">
                {TABS.map(tab => {
                  const Icon = tab.icon;
                  const isCompleted = completedSections.has(tab.id);
                  const hasErrors = Object.keys(errors).some(key => {
                    if (tab.id === "basic") return ["name", "sku", "category"].includes(key);
                    if (tab.id === "pricing") return ["unit_price"].includes(key);
                    if (tab.id === "inventory") return ["quantity", "reorder_point"].includes(key);
                    return false;
                  });

                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="flex-col h-auto py-3 px-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                    >
                      <div className="flex items-center gap-1">
                        <Icon className="h-4 w-4" />
                        {isCompleted && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                        {hasErrors && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                      </div>
                      <span className="text-xs font-medium">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            <form onSubmit={handleSubmit} className="mt-6">
              <div className="px-6">
                <TabsContent value="basic" className="mt-0">
                  <BasicInfoSection 
                    values={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                  />
                </TabsContent>

                <TabsContent value="pricing" className="mt-0">
                  <PricingSection 
                    values={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                  />
                </TabsContent>

                <TabsContent value="inventory" className="mt-0">
                  <InventoryManagementSection 
                    values={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                    measurementUnits={MEASUREMENT_UNITS}
                  />
                </TabsContent>

                <TabsContent value="details" className="mt-0">
                  <ProductDetailsSection 
                    values={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                  />
                </TabsContent>

                <TabsContent value="tax" className="mt-0">
                  <TaxAndFeesSection 
                    values={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                  />
                </TabsContent>

                <TabsContent value="additional" className="mt-0">
                  <AdditionalInfoSection 
                    values={formData}
                    errors={errors}
                    onChange={handleFieldChange}
                  />
                </TabsContent>
              </div>

              {/* Navigation and Action Buttons */}
              <div className="flex justify-between items-center p-6 bg-slate-50 border-t border-slate-200 mt-6">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goPrevious}
                    disabled={!canGoPrevious()}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goNext}
                    disabled={!canGoNext()}
                    className="flex items-center gap-2"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onCancel}
                    disabled={isLoading}
                    className="px-6"
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? "Adding Item..." : "Add Item"}
                  </Button>
                </div>
              </div>
            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}