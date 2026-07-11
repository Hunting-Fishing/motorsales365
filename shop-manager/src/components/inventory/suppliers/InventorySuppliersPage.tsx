
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, Phone, Mail, MapPin, Calendar, Edit, Globe, CreditCard, Clock, Building, FileText } from "lucide-react";
import { useSuppliers } from "@/hooks/inventory/useSuppliers";
import { deleteInventorySupplier, InventorySupplier } from "@/services/inventory/supplierService";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddSupplierDialog } from "./AddSupplierDialog";
import { EditSupplierDialog } from "./EditSupplierDialog";
import { SupplierDetailsDialog } from "./SupplierDetailsDialog";

export function InventorySuppliersPage() {
  const { suppliers, loading, error, refreshSuppliers } = useSuppliers();
  const [filteredSuppliers, setFilteredSuppliers] = useState(suppliers);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<InventorySupplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<InventorySupplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<InventorySupplier | null>(null);
  const [deleteSupplier, setDeleteSupplier] = useState<InventorySupplier | null>(null);

  // Filter suppliers based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.region?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  }, [suppliers, searchQuery]);

  const handleDeleteSupplier = async (supplier: InventorySupplier) => {
    try {
      await deleteInventorySupplier(supplier.id);
      refreshSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier");
    }
    setDeleteSupplier(null);
  };

  const handleSupplierSuccess = () => {
    refreshSuppliers();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-lg">Loading suppliers...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Suppliers</h3>
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-600">Manage your inventory suppliers and vendor relationships</p>
        </div>
        
        <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search suppliers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Suppliers</p>
                <p className="text-2xl font-bold text-foreground">{suppliers.length}</p>
              </div>
              <div className="p-3 bg-primary/10 rounded-full">
                <Building className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">{suppliers.filter(s => s.is_active).length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Badge className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">With Contact Info</p>
                <p className="text-2xl font-bold text-blue-600">
                  {suppliers.filter(s => s.email || s.phone).length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Filtered Results</p>
                <p className="text-2xl font-bold text-foreground">{filteredSuppliers.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Search className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers List */}
      {filteredSuppliers.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-8 w-8 text-gray-400" />}
          title={searchQuery ? "No suppliers found" : "No suppliers yet"}
          description={
            searchQuery 
              ? "Try adjusting your search terms to find suppliers."
              : "Get started by adding your first supplier to the inventory system."
          }
          action={
            !searchQuery ? {
              label: "Add Supplier",
              onClick: () => setIsAddDialogOpen(true)
            } : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredSuppliers.map((supplier) => (
            <Card 
              key={supplier.id} 
              className={`hover:shadow-md transition-all duration-200 cursor-pointer group ${
                selectedSupplier?.id === supplier.id 
                  ? 'bg-white border-primary ring-2 ring-primary/20 shadow-md' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => {
                setSelectedSupplier(supplier);
                setViewingSupplier(supplier);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate mb-2">
                      {supplier.name}
                    </h3>
                    <Badge variant={supplier.is_active ? "default" : "secondary"} className="text-xs">
                      {supplier.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSupplier(supplier);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteSupplier(supplier);
                      }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <AddSupplierDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSupplierSuccess}
      />
      
      <EditSupplierDialog
        supplier={editingSupplier}
        open={!!editingSupplier}
        onOpenChange={(open) => !open && setEditingSupplier(null)}
        onSuccess={handleSupplierSuccess}
      />
      
      <SupplierDetailsDialog
        supplier={viewingSupplier}
        open={!!viewingSupplier}
        onOpenChange={(open) => {
          if (!open) {
            setViewingSupplier(null);
            setSelectedSupplier(null);
          }
        }}
        onEdit={(supplier) => {
          setViewingSupplier(null);
          setSelectedSupplier(null);
          setEditingSupplier(supplier);
        }}
      />
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSupplier} onOpenChange={() => setDeleteSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteSupplier?.name}"? This action cannot be undone and will remove all supplier information including contact details, payment terms, and notes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSupplier && handleDeleteSupplier(deleteSupplier)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
