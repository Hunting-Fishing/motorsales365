import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseOrderManager } from '@/components/inventory/PurchaseOrderManager';
import { AutoReorderManager } from '@/components/inventory/AutoReorderManager';
import { BarcodeScanner } from '@/components/inventory/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Truck, 
  Zap, 
  Scan, 
  Bell, 
  Settings, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import { useState } from 'react';

export default function InventoryAutomation() {
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScanResult = (result: any) => {
    console.log('Scanned:', result);
    // Handle the scanned barcode
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Automation</h1>
          <p className="text-muted-foreground">
            Automate purchase orders, reordering, and inventory management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsScannerOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Scan className="h-4 w-4" />
            Barcode Scanner
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Rules</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-5 w-5 text-green-600" />
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  Running
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold">5</p>
              </div>
              <div className="flex items-center gap-1">
                <Truck className="h-5 w-5 text-blue-600" />
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Processing
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Reorder Alerts</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Attention
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">$15.2K</p>
              </div>
              <div className="flex items-center gap-1">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  +12%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="purchase-orders" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="purchase-orders" className="flex items-center gap-2">
            <Truck className="h-4 w-4" />
            <span className="hidden sm:inline">Purchase Orders</span>
            <span className="sm:hidden">Orders</span>
          </TabsTrigger>
          <TabsTrigger value="auto-reorder" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Auto Reorder</span>
            <span className="sm:hidden">Auto</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
            <span className="sm:hidden">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="purchase-orders" className="space-y-6">
          <PurchaseOrderManager />
        </TabsContent>

        <TabsContent value="auto-reorder" className="space-y-6">
          <AutoReorderManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Center
              </CardTitle>
              <CardDescription>
                Manage alerts and notifications for inventory automation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Recent Notifications */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div className="flex-1">
                      <p className="font-medium">Low Stock Alert</p>
                      <p className="text-sm text-muted-foreground">
                        Brake Pads - Front Set (SKU: BP-001) is running low (3 units remaining)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">2h ago</Badge>
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div className="flex-1">
                      <p className="font-medium">Auto Order Completed</p>
                      <p className="text-sm text-muted-foreground">
                        Purchase order PO-2024-001 was automatically created for Engine Oil filters
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">4h ago</Badge>
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">Delivery Reminder</p>
                      <p className="text-sm text-muted-foreground">
                        Shipment from AutoZone is expected to arrive tomorrow
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">1d ago</Badge>
                      <Button variant="ghost" size="sm">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Automation Settings</CardTitle>
                <CardDescription>
                  Configure global automation preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Enable Auto Reordering</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically create purchase orders when stock is low
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Enabled
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Notification Emails</p>
                    <p className="text-sm text-muted-foreground">
                      Send email alerts for important inventory events
                    </p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Enabled
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekend Processing</p>
                    <p className="text-sm text-muted-foreground">
                      Process orders and alerts during weekends
                    </p>
                  </div>
                  <Badge variant="outline">Disabled</Badge>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Integration Status</CardTitle>
                <CardDescription>
                  Connected systems and services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>AutoZone API</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Connected
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>O'Reilly Auto Parts</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Connected
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>NAPA Auto Parts</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    Pending
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>Email Service</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800 border-green-200">
                    Active
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
      />
    </div>
  );
}