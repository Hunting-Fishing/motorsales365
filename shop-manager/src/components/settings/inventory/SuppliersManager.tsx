
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2, Building2, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  getInventorySuppliers, 
  addInventorySupplier, 
  deleteInventorySupplier 
} from "@/services/inventory/supplierService";
import { toast } from "@/hooks/use-toast";
import { AutomotiveSuppliersSetup } from "./AutomotiveSuppliersSetup";

export function SuppliersManager() {
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [newSupplier, setNewSupplier] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      const loadedSuppliers = await getInventorySuppliers();
      setSuppliers(loadedSuppliers.map(supplier => supplier.name));
    } catch (error) {
      console.error("Error loading inventory suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory suppliers"
      });
    }
  };

  const handleAddSupplier = async () => {
    if (!newSupplier.trim()) return;
    
    // Check for duplicates
    if (suppliers.includes(newSupplier.trim())) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This supplier already exists"
      });
      return;
    }

    setIsLoading(true);
    try {
      await addInventorySupplier({ name: newSupplier.trim() });
      setSuppliers([...suppliers, newSupplier.trim()].sort());
      setNewSupplier("");
      toast({
        variant: "default",
        title: "Success",
        description: "Supplier added successfully"
      });
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Failed to add supplier"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSupplier = async (supplier: string) => {
    if (confirm(`Are you sure you want to delete "${supplier}"? This will remove the supplier reference from all inventory items.`)) {
      setIsLoading(true);
      try {
        await deleteInventorySupplier(supplier);
        setSuppliers(suppliers.filter(s => s !== supplier));
        toast({
          variant: "default",
          title: "Success",
          description: "Supplier deleted successfully"
        });
      } catch (error) {
        console.error("Error deleting supplier:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete supplier"
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Standard Automotive Suppliers Setup */}
      <AutomotiveSuppliersSetup 
        existingSuppliers={suppliers}
        onSuppliersAdded={loadSuppliers}
      />

      <Separator />

      {/* Manual Supplier Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Manage Custom Suppliers
          </CardTitle>
          <CardDescription>
            Add custom suppliers or manage existing ones. All suppliers: {suppliers.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Supplier */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter custom supplier name"
              value={newSupplier}
              onChange={(e) => setNewSupplier(e.target.value)}
              className="flex-1"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddSupplier();
                }
              }}
            />
            <Button 
              onClick={handleAddSupplier} 
              disabled={!newSupplier.trim() || isLoading}
              type="button"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Custom
            </Button>
          </div>

          {suppliers.length > 0 && (
            <>
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Suppliers List */}
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {filteredSuppliers.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    {searchQuery ? 'No suppliers match your search.' : 'No suppliers yet. Add your first supplier above.'}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredSuppliers.map((supplier) => (
                      <div key={supplier} className="flex items-center justify-between p-3 hover:bg-gray-50">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{supplier}</span>
                          {/* You could add badges here to indicate supplier type/category */}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteSupplier(supplier)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {searchQuery && filteredSuppliers.length < suppliers.length && (
                <div className="text-sm text-muted-foreground text-center">
                  Showing {filteredSuppliers.length} of {suppliers.length} suppliers
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
