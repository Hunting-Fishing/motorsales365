import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Search, 
  ArrowLeft,
  Package,
  AlertTriangle,
  Beaker,
  Wrench,
  HardHat,
  Cable,
  DollarSign,
  PackageOpen
} from 'lucide-react';
import { 
  usePowerWashingInventory, 
  useInventoryStats,
  InventoryCategory,
  InventoryItem 
} from '@/hooks/power-washing/usePowerWashingInventory';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AddInventoryItemDialog } from '@/components/power-washing/inventory/AddInventoryItemDialog';
import { InventoryTransactionDialog } from '@/components/power-washing/inventory/InventoryTransactionDialog';

const categoryConfig: Record<InventoryCategory, { label: string; icon: React.ElementType; color: string }> = {
  chemicals: { 
    label: 'Chemicals', 
    icon: Beaker, 
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  parts: { 
    label: 'Parts & Fittings', 
    icon: Wrench, 
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
  },
  safety_gear: { 
    label: 'Safety Gear', 
    icon: HardHat, 
    color: 'bg-green-500/10 text-green-500 border-green-500/20' 
  },
  accessories: { 
    label: 'Accessories', 
    icon: Cable, 
    color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' 
  },
};

const categoryFilters: { value: InventoryCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Items' },
  { value: 'chemicals', label: 'Chemicals' },
  { value: 'parts', label: 'Parts & Fittings' },
  { value: 'safety_gear', label: 'Safety Gear' },
  { value: 'accessories', label: 'Accessories' },
];

export default function PowerWashingInventory() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<InventoryCategory | 'all'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  const { data: items, isLoading } = usePowerWashingInventory(
    selectedCategory === 'all' ? undefined : selectedCategory
  );
  const { data: stats } = useInventoryStats();

  const filteredItems = items?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku?.toLowerCase().includes(query) ||
      item.subcategory?.toLowerCase().includes(query) ||
      item.location?.toLowerCase().includes(query)
    );
  });

  const handleRecordUsage = (item: InventoryItem) => {
    setSelectedItem(item);
    setTransactionDialogOpen(true);
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { label: 'Out of Stock', color: 'bg-red-500' };
    if (item.reorder_point > 0 && item.quantity <= item.reorder_point) {
      return { label: 'Low Stock', color: 'bg-amber-500' };
    }
    return { label: 'In Stock', color: 'bg-green-500' };
  };

  const getStockPercentage = (item: InventoryItem) => {
    if (!item.reorder_point || item.reorder_point === 0) return 50;
    const maxStock = item.reorder_point * 3;
    return Math.min((item.quantity / maxStock) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Supplies & Parts Inventory</h1>
            <p className="text-muted-foreground">Track chemicals, parts, safety gear, and accessories</p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.totalItems ?? 0}</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={stats?.lowStockCount ? 'border-amber-500/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.lowStockCount ?? 0}</p>
                <p className="text-sm text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${(stats?.totalValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
                <p className="text-sm text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <PackageOpen className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats?.categoryCount?.chemicals ?? 0}</p>
                <p className="text-sm text-muted-foreground">Chemicals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categoryFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={selectedCategory === filter.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(filter.value)}
            className="flex items-center gap-2"
          >
            {filter.label}
            {filter.value !== 'all' && stats?.categoryCount && (
              <Badge variant="secondary" className="ml-1">
                {stats.categoryCount[filter.value as InventoryCategory]}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, SKU, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Inventory Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const config = categoryConfig[item.category];
            const stockStatus = getStockStatus(item);
            const stockPercentage = getStockPercentage(item);
            const Icon = config.icon;
            
            return (
              <Card 
                key={item.id} 
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  stockStatus.label === 'Low Stock' ? 'border-amber-500/50' : ''
                } ${stockStatus.label === 'Out of Stock' ? 'border-red-500/50' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-2 rounded-lg ${config.color.split(' ')[0]}`}>
                      <Icon className={`h-6 w-6 ${config.color.split(' ')[1]}`} />
                    </div>
                    <Badge className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-lg text-foreground mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {item.sku && `SKU: ${item.sku}`}
                    {item.sku && item.location && ' • '}
                    {item.location && `📍 ${item.location}`}
                  </p>

                  {/* Stock Progress */}
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Stock Level</span>
                      <span className="font-medium">
                        {item.quantity} {item.unit_of_measure}
                      </span>
                    </div>
                    <Progress value={stockPercentage} className="h-2" />
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <div className={`h-2 w-2 rounded-full ${stockStatus.color}`} />
                        <span className="text-xs text-muted-foreground">{stockStatus.label}</span>
                      </div>
                      {item.reorder_point > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Reorder at {item.reorder_point}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Low Stock Alert */}
                  {stockStatus.label !== 'In Stock' && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg mb-4 ${
                      stockStatus.label === 'Out of Stock' 
                        ? 'bg-red-500/10 text-red-500' 
                        : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {stockStatus.label === 'Out of Stock' 
                          ? 'Restock needed!' 
                          : `Only ${item.quantity} remaining`}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRecordUsage(item);
                      }}
                    >
                      Record Usage
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setTransactionDialogOpen(true);
                      }}
                    >
                      Add Stock
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No inventory items</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery 
              ? 'No items match your search criteria' 
              : 'Add chemicals, parts, and supplies to track your inventory'}
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AddInventoryItemDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />
      
      <InventoryTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        item={selectedItem}
      />
    </div>
  );
}
