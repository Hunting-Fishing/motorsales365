
import React, { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign } from 'lucide-react';
import { 
  ServiceMainCategory, 
  ServiceSubcategory, 
  ServiceJob
} from '@/types/service';
import { fetchServiceCategories } from '@/lib/services/serviceApi';

interface CommonServicesChecklistProps {
  selectedServices: string[];
  onServiceChange: (serviceIds: string[]) => void;
}

export const CommonServicesChecklist: React.FC<CommonServicesChecklistProps> = ({
  selectedServices,
  onServiceChange
}) => {
  const [categories, setCategories] = useState<ServiceMainCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        const serviceCategories = await fetchServiceCategories();
        setCategories(serviceCategories);
        
        // Expand first category by default
        if (serviceCategories.length > 0) {
          setExpandedCategories(new Set([serviceCategories[0].id]));
        }
      } catch (error) {
        console.error('Failed to load service categories:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  const handleServiceToggle = (serviceId: string) => {
    const updatedServices = selectedServices.includes(serviceId)
      ? selectedServices.filter(id => id !== serviceId)
      : [...selectedServices, serviceId];
    
    onServiceChange(updatedServices);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderServiceJob = (job: ServiceJob) => (
    <div key={job.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
      <Checkbox
        id={job.id}
        checked={selectedServices.includes(job.id)}
        onCheckedChange={() => handleServiceToggle(job.id)}
      />
      <div className="flex-1">
        <Label htmlFor={job.id} className="font-medium cursor-pointer">
          {job.name}
        </Label>
        {job.description && (
          <p className="text-sm text-gray-600 mt-1">{job.description}</p>
        )}
        <div className="flex items-center space-x-4 mt-2">
          {job.estimatedTime && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{job.estimatedTime} min</span>
            </Badge>
          )}
          {job.price && (
            <Badge variant="outline" className="flex items-center space-x-1">
              <DollarSign className="h-3 w-3" />
              <span>${job.price}</span>
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  const renderSubcategory = (subcategory: ServiceSubcategory) => (
    <div key={subcategory.id} className="ml-4 space-y-2">
      <h4 className="font-medium text-gray-700">{subcategory.name}</h4>
      <div className="space-y-2">
        {subcategory.jobs.map(renderServiceJob)}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Common Services</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2].map(j => (
                    <div key={j} className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Common Services</h3>
        <Badge variant="secondary">
          {selectedServices.length} selected
        </Badge>
      </div>
      
      <div className="space-y-4">
        {categories.map(category => (
          <Card key={category.id}>
            <CardHeader 
              className="cursor-pointer"
              onClick={() => toggleCategory(category.id)}
            >
              <CardTitle className="flex items-center justify-between">
                <span>{category.name}</span>
                <span className="text-sm font-normal text-gray-500">
                  {expandedCategories.has(category.id) ? '−' : '+'}
                </span>
              </CardTitle>
              {category.description && (
                <p className="text-sm text-gray-600">{category.description}</p>
              )}
            </CardHeader>
            
            {expandedCategories.has(category.id) && (
              <CardContent className="space-y-4">
                {category.subcategories.map(renderSubcategory)}
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
