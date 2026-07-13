
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';
import ServiceAnalytics from './ServiceAnalytics';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ServiceHierarchyManagerProps {
  categories: ServiceMainCategory[];
  onCategoryUpdate?: (category: ServiceMainCategory) => void;
  onSubcategoryUpdate?: (subcategory: ServiceSubcategory) => void;
  onJobUpdate?: (job: ServiceJob) => void;
}

export function ServiceHierarchyManager({
  categories,
  onCategoryUpdate,
  onSubcategoryUpdate,
  onJobUpdate
}: ServiceHierarchyManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      // This would call a delete service function
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleDeleteSubcategory = async (subcategoryId: string) => {
    try {
      // This would call a delete service function
      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete subcategory",
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    try {
      // This would call a delete service function
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.subcategories.some(sub =>
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.jobs.some(job => job.name.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Service Hierarchy Manager
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            {filteredCategories.map((category) => (
              <Card key={category.id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <Badge variant="outline">
                        {category.subcategories.length} subcategories
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="ml-4 border-l-2 border-l-gray-200 pl-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <h4 className="font-medium">{subcategory.name}</h4>
                            <Badge variant="secondary" className="text-xs">
                              {subcategory.jobs.length} services
                            </Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleDeleteSubcategory(subcategory.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {subcategory.jobs.map((job) => (
                            <div key={job.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <span className="font-medium">{job.name}</span>
                                {job.price && (
                                  <Badge variant="outline" className="ml-2">
                                    ${job.price}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteJob(job.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <ServiceAnalytics categories={filteredCategories} />
    </div>
  );
}
