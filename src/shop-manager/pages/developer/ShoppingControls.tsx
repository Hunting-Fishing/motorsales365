
import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Store } from "lucide-react";
import ProductsManagementAdvanced from '@/components/developer/shopping/ProductsManagementAdvanced';
import CategoriesManagement from '@/components/developer/shopping/CategoriesManagement';
import AnalyticsTab from '@/components/developer/shopping/AnalyticsTab';
import OrderManagement from '@/components/developer/shopping/OrderManagement';
import CustomerManagement from '@/components/developer/shopping/CustomerManagement';
import ShoppingSettings from '@/components/developer/shopping/ShoppingSettings';

export default function ShoppingControls() {
  const [activeTab, setActiveTab] = useState("products");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="outline" size="sm" className="mb-4" asChild>
          <Link to="/system-admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Developer Portal
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Store className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Shopping Controls</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Manage affiliate products, categories, and user submissions
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white dark:bg-slate-800 rounded-full p-1 border shadow-sm">
          <TabsTrigger 
            value="products" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Products
          </TabsTrigger>
          <TabsTrigger 
            value="orders" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-orange-600 data-[state=active]:text-white"
          >
            Orders
          </TabsTrigger>
          <TabsTrigger 
            value="customers" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
          >
            Customers
          </TabsTrigger>
          <TabsTrigger 
            value="categories" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Categories
          </TabsTrigger>
          <TabsTrigger 
            value="analytics" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Analytics
          </TabsTrigger>
          <TabsTrigger 
            value="settings" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-slate-600 data-[state=active]:text-white"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="products" className="space-y-6">
            <ProductsManagementAdvanced />
          </TabsContent>

          <TabsContent value="orders" className="space-y-6">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="categories" className="space-y-6">
            <CategoriesManagement />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <ShoppingSettings />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
