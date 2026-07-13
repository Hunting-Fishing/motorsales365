import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  ArrowUpDown, 
  Star, 
  Trophy, 
  Package, 
  Sliders,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { toast } from 'sonner';
import ProductsManagement from './ProductsManagement';
import ProductBundles from '@/components/shopping/product/ProductBundles';
import ProductVariants from '@/components/shopping/product/ProductVariants';
import InventoryAlerts from '@/components/shopping/product/InventoryAlerts';
import { bundleService } from '@/services/advanced-product/bundleService';
import { pricingService } from '@/services/advanced-product/pricingService';
import { variantService } from '@/services/advanced-product/variantService';
import { inventoryAlertService } from '@/services/advanced-product/inventoryAlertService';

export default function ProductsManagementAdvanced() {
  const [activeTab, setActiveTab] = useState("products");
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalBundles: 0,
    totalVariants: 0,
    activeAlerts: 0,
    activePricingRules: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [bundles, alerts] = await Promise.all([
        bundleService.getBundles({ limit: 1000 }),
        inventoryAlertService.getActiveAlerts({ limit: 1000 })
      ]);

      setStats({
        totalProducts: 0, // Will be loaded by ProductsManagement
        totalBundles: bundles.length,
        totalVariants: 0, // Would need to count across all products
        activeAlerts: alerts.length,
        activePricingRules: 0 // Would need pricing service method
      });
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Advanced Products Management</h2>
          <p className="text-muted-foreground">
            Manage products, bundles, variants, pricing, and inventory
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/developer/shopping-controls/products/bundles">
              <Package className="h-4 w-4 mr-2" />
              Create Bundle
            </Link>
          </Button>
          <Button asChild>
            <Link to="/developer/shopping-controls/products/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Total active products
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bundles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBundles}</div>
            <p className="text-xs text-muted-foreground">
              Product bundles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variants</CardTitle>
            <Sliders className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVariants}</div>
            <p className="text-xs text-muted-foreground">
              Product variants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pricing Rules</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activePricingRules}</div>
            <p className="text-xs text-muted-foreground">
              Active pricing rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Active inventory alerts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="bundles">
            Bundles
            {stats.totalBundles > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.totalBundles}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {stats.activeAlerts > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.activeAlerts}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <ProductsManagement />
        </TabsContent>

        <TabsContent value="bundles" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Product Bundles</h3>
              <p className="text-sm text-muted-foreground">
                Create and manage product bundles with special pricing
              </p>
            </div>
            <Button asChild>
              <Link to="/developer/shopping-controls/products/bundles/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Bundle
              </Link>
            </Button>
          </div>
          
          <ProductBundles limit={20} />
        </TabsContent>

        <TabsContent value="variants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Variants Management</CardTitle>
              <CardDescription>
                Manage product options like size, color, and specifications across all products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Select a product to manage its variants, or create variants when adding/editing products.
                </p>
                <Button asChild>
                  <Link to="/developer/shopping-controls/products/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Product with Variants
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dynamic Pricing Rules</CardTitle>
              <CardDescription>
                Configure time-based pricing, bulk discounts, and promotional pricing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Advanced pricing rules will be available here. Create bulk pricing, 
                  time-based discounts, and customer tier pricing.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Bulk Pricing Rules
                  </Button>
                  <Button variant="outline">
                    <Star className="h-4 w-4 mr-2" />
                    Customer Tier Pricing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Inventory Alerts</h3>
              <p className="text-sm text-muted-foreground">
                Monitor stock levels and receive notifications for low inventory
              </p>
            </div>
            <Button onClick={loadStats}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Refresh Alerts
            </Button>
          </div>
          
          <InventoryAlerts showActions={true} compact={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}