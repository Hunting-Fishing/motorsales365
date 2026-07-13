
import React, { useState } from 'react';
import { Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building } from "lucide-react";
import OrganizationDetails from '@/components/developer/organization/OrganizationDetails';
import ShopsManagement from '@/components/developer/organization/ShopsManagement';
import { BookingPermissionsManager } from '@/components/developer/organization/BookingPermissionsManager';
import { DepartmentSubmissionsManager } from '@/components/developer/organization/DepartmentSubmissionsManager';

export default function OrganizationManagement() {
  const [activeTab, setActiveTab] = useState("details");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="outline" size="sm" className="mb-4" asChild>
          <Link to="/system-admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Developer Portal
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Building className="h-8 w-8 text-teal-600" />
          <h1 className="text-3xl font-bold">Organization Management</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Manage organization details, shops, and access controls
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white dark:bg-slate-800 rounded-full p-1 border shadow-sm">
          <TabsTrigger 
            value="details" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-teal-600 data-[state=active]:text-white"
          >
            Organization Details
          </TabsTrigger>
          <TabsTrigger 
            value="shops" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-green-600 data-[state=active]:text-white"
          >
            Shops Management
          </TabsTrigger>
          <TabsTrigger 
            value="permissions" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white"
          >
            Booking Permissions
          </TabsTrigger>
          <TabsTrigger 
            value="departments" 
            className="rounded-full text-sm px-4 py-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
          >
            Department Submissions
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 space-y-6">
          <TabsContent value="details" className="space-y-6">
            <OrganizationDetails />
          </TabsContent>

          <TabsContent value="shops" className="space-y-6">
            <ShopsManagement />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <BookingPermissionsManager />
          </TabsContent>

          <TabsContent value="departments" className="space-y-6">
            <DepartmentSubmissionsManager />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
