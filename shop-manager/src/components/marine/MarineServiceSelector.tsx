import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Plus, Clock, DollarSign, Ship } from 'lucide-react';
import { getMarineServiceCategories, searchMarineServices } from '@/lib/marineServiceHierarchy';
import { ServiceJob } from '@/types/service';

interface MarineServiceSelectorProps {
  onServiceSelect: (service: ServiceJob, category: string, subcategory: string) => void;
}

export function MarineServiceSelector({ onServiceSelect }: MarineServiceSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const categories = searchQuery 
    ? searchMarineServices(searchQuery)
    : getMarineServiceCategories();

  const totalServices = categories.reduce((total, category) =>
    total + category.subcategories.reduce((subTotal, sub) => 
      subTotal + sub.jobs.length, 0
    ), 0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Ship className="h-5 w-5 text-blue-600" />
          <CardTitle>Marine Service Selection</CardTitle>
        </div>
        <CardDescription>
          Browse {totalServices} marine services across {categories.length} categories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search marine services (e.g., winterization, propeller, GPS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <ScrollArea className="h-[600px]">
            <Accordion type="multiple" className="w-full">
              {categories.map((category) => (
                <AccordionItem key={category.id} value={category.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{category.name}</span>
                        <Badge variant="secondary">
                          {category.subcategories.reduce((total, sub) => 
                            total + sub.jobs.length, 0
                          )} services
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {category.subcategories.map((subcategory) => (
                        <div key={subcategory.id} className="pl-4">
                          <h4 className="font-medium text-sm text-muted-foreground mb-2">
                            {subcategory.name}
                          </h4>
                          <div className="space-y-2">
                            {subcategory.jobs.map((job) => (
                              <div
                                key={job.id}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                              >
                                <div className="flex-1">
                                  <div className="font-medium">{job.name}</div>
                                  {job.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {job.description}
                                    </p>
                                  )}
                                  <div className="flex items-center gap-4 mt-2">
                                    {job.estimatedTime && (
                                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        <span>{Math.floor(job.estimatedTime / 60)}h {job.estimatedTime % 60}m</span>
                                      </div>
                                    )}
                                    {job.price && (
                                      <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                        <DollarSign className="h-3 w-3" />
                                        <span>${job.price.toFixed(2)}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => onServiceSelect(job, category.name, subcategory.name)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {categories.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No marine services found matching "{searchQuery}"</p>
                <p className="text-sm mt-2">Try a different search term</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
