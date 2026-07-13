
import React, { useState } from 'react';
import { Manufacturer, ManufacturerCategory } from '@/types/affiliate';
import { Link } from 'react-router-dom';
import { ResponsiveGrid } from '@/components/ui/responsive-grid';
import { Car, Truck, Ship, Tractor, Filter, Anchor, Hammer, Wrench, ChevronDown, ChevronUp } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ManufacturersGridProps {
  manufacturers: Manufacturer[];
}

// Map category to appropriate icon
const getCategoryIcon = (category: ManufacturerCategory) => {
  switch (category) {
    case 'automotive':
      return <Car className="h-5 w-5" />;
    case 'heavy-duty':
      return <Truck className="h-5 w-5" />;
    case 'equipment':
      return <Hammer className="h-5 w-5" />;
    case 'marine':
      return <Ship className="h-5 w-5" />;
    case 'atv-utv':
      return <Tractor className="h-5 w-5" />;
    case 'motorcycle':
      return <Wrench className="h-5 w-5" />; // Using Wrench as fallback for Motorcycle
    default:
      return <Wrench className="h-5 w-5" />;
  }
};

// Helper function to capitalize and format category names
const formatCategoryName = (category: string): string => {
  return category
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function ManufacturersGrid({ manufacturers }: ManufacturersGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Get all unique categories from manufacturers
  const categories = ["all", ...new Set(manufacturers.map(m => m.category))];
  
  // Filter manufacturers based on active category
  const filteredManufacturers = activeCategory === "all" 
    ? manufacturers 
    : manufacturers.filter(m => m.category === activeCategory);

  // Group manufacturers by category
  const manufacturersByCategory = filteredManufacturers.reduce((acc, manufacturer) => {
    const category = manufacturer.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(manufacturer);
    return acc;
  }, {} as Record<string, Manufacturer[]>);

  // Sort categories for consistent display
  const sortedCategories = Object.keys(manufacturersByCategory).sort();

  return (
    <div className="py-8 bg-gradient-to-b from-gray-50 to-white">
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Browse by Manufacturer</h2>
            <Link to="/manufacturers" className="text-blue-600 hover:text-blue-800 text-sm font-medium">
              View All
            </Link>
          </div>
          
          <Tabs defaultValue="all" className="w-full">
            <div className="mb-6 overflow-x-auto">
              <TabsList className="inline-flex p-1 bg-gray-100 rounded-full min-w-max">
                {categories.map((category) => (
                  <TabsTrigger
                    key={category}
                    value={category}
                    onClick={() => setActiveCategory(category)}
                    className="px-4 py-2 rounded-full data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  >
                    <div className="flex items-center gap-1.5">
                      {category !== "all" && (
                        <span className="hidden sm:inline-flex">
                          {getCategoryIcon(category as ManufacturerCategory)}
                        </span>
                      )}
                      {category === "all" && <Filter className="h-4 w-4 mr-1" />}
                      <span className="capitalize">{category.replace("-", " ")}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          {activeCategory === "all" ? (
            <Accordion type="multiple" className="w-full space-y-4">
              {sortedCategories.map(category => (
                <AccordionItem 
                  key={category} 
                  value={category}
                  className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(category as ManufacturerCategory)}
                      <span className="font-medium">{formatCategoryName(category)}</span>
                      <Badge variant="outline" className="ml-2">
                        {manufacturersByCategory[category].length}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-0">
                    <ResponsiveGrid 
                      cols={{
                        default: 1,
                        sm: 2,
                        md: 3,
                        lg: 4
                      }}
                      className="gap-4"
                    >
                      {manufacturersByCategory[category].map((manufacturer) => (
                        <Link
                          key={manufacturer.id}
                          to={`/manufacturers/${manufacturer.slug}`}
                          className="group flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="w-full h-20 flex items-center justify-center mb-3 relative bg-white p-2">
                            {manufacturer.logoUrl ? (
                              <img
                                src={manufacturer.logoUrl}
                                alt={`${manufacturer.name} logo`}
                                className="max-h-20 max-w-full object-contain"
                                onError={(e) => {
                                  // Fallback to a text display if image fails to load
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  const parentNode = target.parentNode as HTMLElement;
                                  if (parentNode) {
                                    const fallbackText = document.createElement('div');
                                    fallbackText.className = 'text-lg font-bold text-center';
                                    fallbackText.textContent = manufacturer.name;
                                    parentNode.appendChild(fallbackText);
                                  }
                                }}
                              />
                            ) : (
                              <div className="text-lg font-bold text-center">{manufacturer.name}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {getCategoryIcon(manufacturer.category)}
                            <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{manufacturer.name}</h3>
                          </div>
                        </Link>
                      ))}
                    </ResponsiveGrid>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <ResponsiveGrid 
              cols={{
                default: 2,
                sm: 3,
                md: 4,
                lg: 5
              }}
              className="gap-6"
            >
              {filteredManufacturers.map((manufacturer) => (
                <Link
                  key={manufacturer.id}
                  to={`/manufacturers/${manufacturer.slug}`}
                  className="group flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="w-full h-24 flex items-center justify-center mb-4 relative bg-white p-2">
                    {manufacturer.logoUrl ? (
                      <img
                        src={manufacturer.logoUrl}
                        alt={`${manufacturer.name} logo`}
                        className="max-h-24 max-w-full object-contain"
                        onError={(e) => {
                          // Fallback to a text display if image fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parentNode = target.parentNode as HTMLElement;
                          if (parentNode) {
                            const fallbackText = document.createElement('div');
                            fallbackText.className = 'text-lg font-bold text-center';
                            fallbackText.textContent = manufacturer.name;
                            parentNode.appendChild(fallbackText);
                          }
                        }}
                      />
                    ) : (
                      <div className="text-lg font-bold text-center">{manufacturer.name}</div>
                    )}
                    <Badge 
                      variant="info" 
                      className="absolute top-0 right-0 text-xs capitalize"
                    >
                      {manufacturer.category.replace("-", " ")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(manufacturer.category)}
                    <h3 className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{manufacturer.name}</h3>
                  </div>
                </Link>
              ))}
            </ResponsiveGrid>
          )}
        </div>
      </div>
    </div>
  );
}
