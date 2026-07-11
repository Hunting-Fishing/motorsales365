
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Check, Building2, Globe, Phone } from "lucide-react";
import { AUTOMOTIVE_SUPPLIERS, SUPPLIER_CATEGORIES, type AutomotiveSupplier } from "@/data/automotiveSuppliers";
import { addInventorySupplier } from "@/services/inventory/supplierService";
import { toast } from "@/hooks/use-toast";

interface AutomotiveSuppliersSetupProps {
  existingSuppliers: string[];
  onSuppliersAdded: () => void;
}

export function AutomotiveSuppliersSetup({ existingSuppliers, onSuppliersAdded }: AutomotiveSuppliersSetupProps) {
  const [selectedSuppliers, setSelectedSuppliers] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Filter suppliers by category and exclude existing ones
  const availableSuppliers = AUTOMOTIVE_SUPPLIERS.filter(
    supplier => !existingSuppliers.includes(supplier.name)
  );

  const filteredSuppliers = selectedCategory 
    ? availableSuppliers.filter(supplier => supplier.category === selectedCategory)
    : availableSuppliers;

  const handleSupplierToggle = (supplierName: string) => {
    const newSelected = new Set(selectedSuppliers);
    if (newSelected.has(supplierName)) {
      newSelected.delete(supplierName);
    } else {
      newSelected.add(supplierName);
    }
    setSelectedSuppliers(newSelected);
  };

  const handleCategorySelect = (suppliers: AutomotiveSupplier[]) => {
    const categorySuppliers = suppliers.filter(s => 
      !existingSuppliers.includes(s.name)
    );
    const newSelected = new Set(selectedSuppliers);
    
    categorySuppliers.forEach(supplier => {
      newSelected.add(supplier.name);
    });
    setSelectedSuppliers(newSelected);
  };

  const handleAddSelectedSuppliers = async () => {
    if (selectedSuppliers.size === 0) {
      toast({
        title: "No suppliers selected",
        description: "Please select at least one supplier to add.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const promises = Array.from(selectedSuppliers).map(supplierName => 
        addInventorySupplier({ name: supplierName })
      );
      
      await Promise.all(promises);
      
      toast({
        title: "Success",
        description: `Added ${selectedSuppliers.size} suppliers successfully`,
        variant: "default"
      });
      
      setSelectedSuppliers(new Set());
      onSuppliersAdded();
    } catch (error) {
      console.error("Error adding suppliers:", error);
      toast({
        title: "Error",
        description: "Failed to add some suppliers. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (availableSuppliers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-600" />
            All Standard Suppliers Added
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have already added all standard automotive suppliers. You can still add custom suppliers using the form above.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Add Standard Automotive Suppliers
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Quickly add commonly used automotive parts suppliers to your inventory system.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter by Category:</label>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Categories
            </Button>
            {SUPPLIER_CATEGORIES.map(category => {
              const categorySuppliers = availableSuppliers.filter(s => s.category === category);
              if (categorySuppliers.length === 0) return null;
              
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="relative"
                >
                  {category}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {categorySuppliers.length}
                  </Badge>
                </Button>
              );
            })}
          </div>
          
          {selectedCategory && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const categorySuppliers = availableSuppliers.filter(s => s.category === selectedCategory);
                handleCategorySelect(categorySuppliers);
              }}
              className="text-xs"
            >
              Select All {selectedCategory} Suppliers
            </Button>
          )}
        </div>

        {/* Suppliers List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
          {filteredSuppliers.map((supplier) => (
            <div
              key={supplier.name}
              className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={selectedSuppliers.has(supplier.name)}
                onCheckedChange={() => handleSupplierToggle(supplier.name)}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{supplier.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {supplier.category}
                  </Badge>
                </div>
                
                {supplier.description && (
                  <p className="text-xs text-muted-foreground mb-2">
                    {supplier.description}
                  </p>
                )}
                
                {supplier.contactInfo && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {supplier.contactInfo.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {supplier.contactInfo.phone}
                      </div>
                    )}
                    {supplier.contactInfo.website && (
                      <div className="flex items-center gap-1">
                        <Globe className="h-3 w-3" />
                        <a 
                          href={supplier.contactInfo.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    )}
                  </div>
                )}
                
                {supplier.specialties && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {supplier.specialties.slice(0, 3).map(specialty => (
                      <Badge key={specialty} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                    {supplier.specialties.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{supplier.specialties.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        {selectedSuppliers.size > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm text-muted-foreground">
              {selectedSuppliers.size} supplier{selectedSuppliers.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedSuppliers(new Set())}
                disabled={isLoading}
              >
                Clear Selection
              </Button>
              <Button
                size="sm"
                onClick={handleAddSelectedSuppliers}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add {selectedSuppliers.size} Supplier{selectedSuppliers.size !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
