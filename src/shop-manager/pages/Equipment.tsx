import React, { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Wrench, Package, Car } from 'lucide-react';
import { EquipmentList } from '@/components/equipment/EquipmentList';
import { AddEquipmentDialog } from '@/components/equipment/AddEquipmentDialog';
import { useEquipmentByAssetClass } from '@/hooks/useEquipmentByAssetClass';
import { useEquipmentCategories } from '@/hooks/useEquipmentCategories';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTypesForCategory, getCategoryForType } from '@/types/equipmentCategory';

export default function Equipment() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  // Filter to only show shop_equipment (not fleet or safety)
  const { equipment, stats, isLoading, refetch } = useEquipmentByAssetClass('shop_equipment');
  const { categories } = useEquipmentCategories();

  // Sort categories alphabetically
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);

  // Get types for selected category
  const availableTypes = useMemo(() => {
    if (categoryFilter === 'all') return [];
    const category = categories.find(c => c.id === categoryFilter);
    if (!category) return [];
    return getTypesForCategory(category.name);
  }, [categoryFilter, categories]);

  // Get category name from ID
  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || null;
  };

  // Filter equipment by category and type
  const filteredEquipment = useMemo(() => {
    let result = equipment;
    
    if (categoryFilter !== 'all') {
      const categoryName = getCategoryName(categoryFilter);
      if (categoryName) {
        // Filter by equipment types that belong to this category
        const typesInCategory = getTypesForCategory(categoryName).map(t => t.value);
        result = result.filter(item => 
          typesInCategory.includes((item as any).equipment_type) ||
          (item as any).category_id === categoryFilter
        );
      }
    }
    
    if (typeFilter !== 'all') {
      result = result.filter(item => (item as any).equipment_type === typeFilter);
    }
    
    return result;
  }, [equipment, categoryFilter, typeFilter, categories]);

  // Calculate filtered stats
  const filteredStats = {
    total: filteredEquipment.length,
    operational: filteredEquipment.filter(item => item.status === 'operational').length,
    needsMaintenance: filteredEquipment.filter(item => item.status === 'maintenance').length,
    outOfService: filteredEquipment.filter(item => item.status === 'down' || item.status === 'retired' || item.status === 'out_of_service').length
  };

  const displayStats = (categoryFilter === 'all' && typeFilter === 'all') ? stats : filteredStats;

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setTypeFilter('all'); // Reset type filter when category changes
  };

  return (
    <>
      <Helmet>
        <title>Shop Equipment | All Business 365</title>
        <meta name="description" content="Manage shop equipment including tools, lifts, diagnostics, and stationary equipment." />
      </Helmet>
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Shop Equipment</h1>
            <p className="text-muted-foreground">
              Manage tools, lifts, diagnostics, and stationary shop equipment
            </p>
          </div>
          <AddEquipmentDialog 
            open={dialogOpen} 
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) {
                // Force refetch after closing to show new equipment
                setTimeout(() => refetch(), 300);
              }
            }}
          />
        </div>

        {/* Category & Type Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium whitespace-nowrap">Category:</label>
                <Select value={categoryFilter} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {sortedCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {categoryFilter !== 'all' && availableTypes.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium whitespace-nowrap">Type:</label>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {availableTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(categoryFilter !== 'all' || typeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setTypeFilter('all');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear filters
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {categoryFilter === 'all' ? 'All assets' : 'In category'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Operational</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.operational}</div>
              <p className="text-xs text-muted-foreground">
                Ready for use
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Maintenance</CardTitle>
              <Wrench className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.needsMaintenance}</div>
              <p className="text-xs text-muted-foreground">
                Needs attention
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Service</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{isLoading ? '...' : displayStats.outOfService}</div>
              <p className="text-xs text-muted-foreground">
                Not available
              </p>
            </CardContent>
          </Card>
        </div>

        <EquipmentList equipment={filteredEquipment} loading={isLoading} onUpdate={refetch} />
      </div>
    </>
  );
}