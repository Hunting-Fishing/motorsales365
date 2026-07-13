
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceMainCategory, ServiceJob } from '@/types/service';
import { Copy, AlertTriangle, ChevronDown, Merge, Eye, CheckCircle, Trash2 } from 'lucide-react';

interface ServiceDuplicatesManagerProps {
  categories: ServiceMainCategory[];
  onResolveDuplicates?: (duplicates: ServiceJob[], action: 'merge' | 'delete' | 'rename') => void;
}

interface DuplicateGroup {
  name: string;
  services: ServiceJob[];
  categories: string[];
}

export function ServiceDuplicatesManager({
  categories,
  onResolveDuplicates
}: ServiceDuplicatesManagerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDuplicates, setSelectedDuplicates] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    // Auto-expand first few groups on load
    if (duplicateGroups.length > 0) {
      setExpandedGroups(duplicateGroups.slice(0, 3).map(group => group.name));
    }
  }, [categories]);

  // Find duplicate services by name
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const serviceMap = new Map<string, { services: ServiceJob[], categories: string[] }>();

    categories.forEach(category => {
      category.subcategories.forEach(subcategory => {
        subcategory.jobs.forEach(service => {
          const key = service.name.toLowerCase().trim();
          if (!serviceMap.has(key)) {
            serviceMap.set(key, { services: [], categories: [] });
          }
          serviceMap.get(key)!.services.push(service);
          if (!serviceMap.get(key)!.categories.includes(category.name)) {
            serviceMap.get(key)!.categories.push(category.name);
          }
        });
      });
    });

    return Array.from(serviceMap.entries())
      .filter(([_, group]) => group.services.length > 1)
      .map(([name, group]) => ({
        name,
        services: group.services,
        categories: group.categories
      }))
      .sort((a, b) => b.services.length - a.services.length);
  }, [categories]);

  const totalDuplicates = duplicateGroups.reduce((total, group) => total + group.services.length - 1, 0);
  const duplicatePercentage = categories.length > 0 ? 
    (totalDuplicates / categories.reduce((total, cat) => 
      total + cat.subcategories.reduce((subTotal, sub) => 
        subTotal + sub.jobs.length, 0), 0)) * 100 : 0;

  const toggleGroup = (groupName: string) => {
    if (expandedGroups.includes(groupName)) {
      setExpandedGroups(expandedGroups.filter(name => name !== groupName));
    } else {
      setExpandedGroups([...expandedGroups, groupName]);
    }
  };

  const handleSelectDuplicate = (serviceId: string) => {
    if (selectedDuplicates.includes(serviceId)) {
      setSelectedDuplicates(selectedDuplicates.filter(id => id !== serviceId));
    } else {
      setSelectedDuplicates([...selectedDuplicates, serviceId]);
    }
  };

  const handleResolveSelected = (action: 'merge' | 'delete' | 'rename') => {
    const selectedServices = duplicateGroups
      .flatMap(group => group.services)
      .filter(service => selectedDuplicates.includes(service.id));
    
    onResolveDuplicates?.(selectedServices, action);
    setSelectedDuplicates([]);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Duplicate Services Manager
          </h3>
          <p className="text-sm text-gray-500">Identify and resolve duplicate services</p>
        </div>
        <Badge variant={duplicateGroups.length > 0 ? "destructive" : "secondary"}>
          {duplicateGroups.length} duplicate groups
        </Badge>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Duplicate Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{duplicateGroups.length}</div>
              <div className="text-sm text-gray-500">Duplicate Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{totalDuplicates}</div>
              <div className="text-sm text-gray-500">Extra Services</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{duplicatePercentage.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Duplication Rate</div>
            </div>
          </div>

          {duplicateGroups.length > 0 && (
            <div className="mt-4">
              <Progress value={duplicatePercentage} className="h-2" />
              <p className="text-xs text-gray-500 mt-1">
                Duplicate services identified across your service catalog
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      {selectedDuplicates.length > 0 && (
        <Card className="border-orange-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{selectedDuplicates.length} services selected</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => handleResolveSelected('merge')}>
                  <Merge className="h-4 w-4 mr-1" />
                  Merge
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleResolveSelected('delete')}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      {duplicateGroups.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No duplicate services found. Your service catalog is clean!
          </AlertDescription>
        </Alert>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="detailed">Detailed View</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-3">
            {duplicateGroups.slice(0, 5).map((group) => (
              <Card key={group.name}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleGroup(group.name)}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${
                          expandedGroups.includes(group.name) ? 'rotate-180' : ''
                        }`} />
                      </Button>
                      <CardTitle className="text-sm">{group.name}</CardTitle>
                    </div>
                    <Badge variant="destructive">{group.services.length} duplicates</Badge>
                  </div>
                </CardHeader>
                
                {expandedGroups.includes(group.name) && (
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {group.services.map((service) => (
                        <div key={service.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <span className="text-sm font-medium">{service.name}</span>
                            {service.description && (
                              <p className="text-xs text-gray-500">{service.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {service.price && (
                              <Badge variant="outline" className="text-xs">${service.price}</Badge>
                            )}
                            <input
                              type="checkbox"
                              checked={selectedDuplicates.includes(service.id)}
                              onChange={() => handleSelectDuplicate(service.id)}
                              className="rounded border-gray-300"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
