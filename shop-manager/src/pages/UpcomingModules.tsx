import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { UPCOMING_MODULES } from '@/config/moduleRoutes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Search, ArrowLeft, Bell } from 'lucide-react';

export default function UpcomingModules() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories with their counts
  const categoryData = useMemo(() => {
    const catMap = new Map<string, number>();
    UPCOMING_MODULES.forEach(m => {
      const cat = m.category || 'Other';
      catMap.set(cat, (catMap.get(cat) || 0) + 1);
    });
    return Array.from(catMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const categories = categoryData.map(c => c.name);

  const filteredModules = useMemo(() => {
    return UPCOMING_MODULES.filter(module => {
      const matchesSearch = 
        module.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        module.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || module.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group modules by category
  const groupedModules = useMemo(() => {
    return filteredModules.reduce((acc, module) => {
      const key = module.category || 'Other';
      if (!acc[key]) acc[key] = [];
      acc[key].push(module);
      return acc;
    }, {} as Record<string, typeof UPCOMING_MODULES>);
  }, [filteredModules]);

  const sortedCategories = useMemo(() => {
    return Object.keys(groupedModules).sort((a, b) => {
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    });
  }, [groupedModules]);

  // Category descriptions
  const categoryDescriptions: Record<string, string> = {
    'Home & Property Services': 'Residential and commercial property maintenance',
    'Construction & Trade': 'Building, renovation, and skilled trade services',
    'Automotive & Transportation': 'Vehicle repair, fleet management, and transport services',
    'Personal Services': 'Beauty, wellness, and personal care businesses',
    'Pet Services': 'Pet care, grooming, and veterinary services',
    'Food & Beverage': 'Restaurants, catering, and food service operations',
    'Technology & Electronics': 'IT support, electronics repair, and tech services',
    'Healthcare & Wellness': 'Medical, dental, and wellness practices',
    'Professional Services': 'Consulting, legal, and business services',
    'Specialty & Niche': 'Unique and specialized service industries',
    'Agriculture & Outdoor': 'Farming, outdoor, and environmental services',
    'Childcare & Education': 'Child care, tutoring, and educational services',
    'Recreation & Sports': 'Sports, fitness, and recreational facilities',
    'Retail & Crafts': 'Retail operations and artisan crafts',
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/module-hub" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Module Hub
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Coming Soon
          </h1>
          <p className="text-muted-foreground">
            New modules in development. Get notified when they launch.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({UPCOMING_MODULES.length})</SelectItem>
              {categoryData.map(cat => (
                <SelectItem key={cat.name} value={cat.name}>
                  {cat.name} ({cat.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Sections */}
        {sortedCategories.map(category => (
          <section key={category} className="mb-12">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground">{category}</h2>
              <p className="text-sm text-muted-foreground">
                {categoryDescriptions[category] || 'Specialized service modules'}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {groupedModules[category].map(module => {
                const Icon = module.icon;
                return (
                  <Card 
                    key={module.slug} 
                    className="group relative overflow-hidden hover:shadow-md transition-all duration-200 bg-card"
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-medium">
                          Coming Soon
                        </Badge>
                      </div>
                      <CardTitle className="text-base mt-3 font-medium">{module.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <CardDescription className="text-sm mb-4 line-clamp-2">
                        {module.description}
                      </CardDescription>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full gap-2 text-muted-foreground hover:text-foreground justify-start px-0" 
                        disabled
                      >
                        <Bell className="h-4 w-4" />
                        Notify Me
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        ))}

        {/* Empty State */}
        {filteredModules.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No modules found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter.</p>
            <Button 
              variant="outline" 
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} 
              className="mt-4"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
