
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ServiceMainCategory } from '@/types/service';
import { ServiceHierarchyTree } from './ServiceHierarchyTree';
import { ServiceAdvancedFilters } from './ServiceAdvancedFilters';
import ServiceAnalytics from './ServiceAnalytics';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ServiceHierarchyTreeViewProps {
  categories: ServiceMainCategory[];
}

export function ServiceHierarchyTreeView({ categories }: ServiceHierarchyTreeViewProps) {
  const [activeTab, setActiveTab] = useState("tree");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Service Hierarchy</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="tree">Tree View</TabsTrigger>
            <TabsTrigger value="filters">Advanced Filters</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="tree" className="space-y-2">
            <ServiceHierarchyTree categories={categories} />
          </TabsContent>
          <TabsContent value="filters">
            <ServiceAdvancedFilters categories={categories} />
          </TabsContent>
          <TabsContent value="analytics">
            <ServiceAnalytics categories={categories} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
