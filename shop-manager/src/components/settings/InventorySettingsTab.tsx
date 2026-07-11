
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryTableColumnsManager } from "./inventory/InventoryTableColumnsManager";
import { CategoriesManager } from "./inventory/CategoriesManager";
import { SuppliersManager } from "./inventory/SuppliersManager";
import { ClearInventoryButton } from "@/components/inventory/ClearInventoryButton";
import { ImportExportButtons } from "@/components/inventory/ImportExportButtons";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Building2, Car, Wrench } from "lucide-react";

export const InventorySettingsTab = () => {
  const handleDataCleared = () => {
    // Refresh the page to reflect the cleared data
    window.location.reload();
  };

  return (
    <Tabs defaultValue="categories" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="categories">Categories</TabsTrigger>
        <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        <TabsTrigger value="columns">Table Columns</TabsTrigger>
        <TabsTrigger value="data">Data Management</TabsTrigger>
      </TabsList>
      
      <TabsContent value="categories" className="space-y-4">
        <div className="mb-4">
          <Alert variant="default" className="border-blue-200 bg-blue-50">
            <Car className="h-4 w-4" />
            <AlertDescription>
              <strong>Automotive Categories:</strong> Comprehensive automotive inventory categories organized by system 
              (Engine & Powertrain, Chassis & Safety, Electrical & Comfort, etc.). These categories help organize 
              your parts inventory by automotive systems for easier management and faster lookup.
            </AlertDescription>
          </Alert>
        </div>
        <CategoriesManager />
      </TabsContent>
      
      <TabsContent value="suppliers" className="space-y-4">
        <div className="mb-4">
          <Alert variant="default" className="border-blue-200 bg-blue-50">
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Suppliers Management:</strong> Add standard automotive suppliers like NAPA, WorldPac, Bumper to Bumper, 
              AutoZone, O'Reilly, and more. This helps track which supplier each part came from, manage vendor relationships, 
              and maintain supplier-specific pricing and inventory levels.
            </AlertDescription>
          </Alert>
        </div>
        <SuppliersManager />
      </TabsContent>
      
      <TabsContent value="columns" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Inventory Table Columns
            </CardTitle>
            <CardDescription>
              Configure which columns appear in your inventory table for optimal workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="default" className="mb-4 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Column Configuration:</strong> Customize your inventory table view to show the most relevant 
                information for your shop. Changes are applied immediately and saved to your preferences.
              </AlertDescription>
            </Alert>
            <InventoryTableColumnsManager />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage your inventory data and perform administrative actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="default" className="mb-4 border-blue-200 bg-blue-50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Import/Export:</strong> Bulk import inventory from Excel or export current data for backup and analysis.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Bulk Operations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Import or export inventory data in Excel format. Download the template to see the required format.
                </p>
                <ImportExportButtons />
              </div>

              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> The actions below will permanently affect your inventory database. 
                  Use with caution and ensure you have backups if needed.
                </AlertDescription>
              </Alert>
              
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-medium mb-2">Clear All Inventory Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This will permanently delete all inventory items from your database. 
                  Categories and suppliers will remain intact. This action cannot be undone.
                </p>
                <ClearInventoryButton onCleared={handleDataCleared} />
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};
