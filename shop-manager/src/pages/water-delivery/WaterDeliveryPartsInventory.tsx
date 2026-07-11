import { useState } from 'react';
import { Plus, Search, Package, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useWaterDeliveryParts, 
  useLowStockParts,
  WaterDeliveryPart 
} from '@/hooks/water-delivery/useWaterDeliveryParts';
import { useCategoryOptions } from '@/hooks/water-delivery/useWaterDeliveryInventoryCategories';
import { AddWaterDeliveryPartDialog } from '@/components/water-delivery/AddWaterDeliveryPartDialog';
import { WaterDeliveryPartTransactionDialog } from '@/components/water-delivery/WaterDeliveryPartTransactionDialog';
import { Skeleton } from '@/components/ui/skeleton';

export default function WaterDeliveryPartsInventory() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState<WaterDeliveryPart | null>(null);
  const [transactionType, setTransactionType] = useState<'received' | 'used'>('received');

  const { categories, isLoading: loadingCategories } = useCategoryOptions();
  const { data: parts = [], isLoading } = useWaterDeliveryParts(selectedCategory);
  const { data: lowStockParts = [] } = useLowStockParts();

  // Build tab categories: "All" + dynamic categories
  const tabCategories = [
    { value: 'all', label: 'All Items' },
    ...categories,
  ];

  const filteredParts = parts.filter(part =>
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (part.part_number?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalValue = parts.reduce((sum, part) => {
    return sum + (part.quantity * (part.cost_price || 0));
  }, 0);

  const handleReceiveStock = (part: WaterDeliveryPart) => {
    setSelectedPart(part);
    setTransactionType('received');
    setTransactionDialogOpen(true);
  };

  const handleUseStock = (part: WaterDeliveryPart) => {
    setSelectedPart(part);
    setTransactionType('used');
    setTransactionDialogOpen(true);
  };

  const getCategoryLabel = (value: string) => {
    return categories.find(c => c.value === value)?.label || value;
  };

  const getStockStatus = (part: WaterDeliveryPart) => {
    if (part.min_quantity && part.quantity <= part.min_quantity) {
      return { status: 'low', variant: 'destructive' as const };
    }
    if (part.max_quantity && part.quantity >= part.max_quantity) {
      return { status: 'overstocked', variant: 'secondary' as const };
    }
    return { status: 'normal', variant: 'default' as const };
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">
            Manage warehouse parts, supplies, and equipment
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parts.length}</div>
            <p className="text-xs text-muted-foreground">unique items</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive flex items-center gap-2">
              {lowStockParts.length}
              {lowStockParts.length > 0 && <AlertTriangle className="h-5 w-5" />}
            </div>
            <p className="text-xs text-muted-foreground">items need reorder</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">inventory value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(parts.map(p => p.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">active categories</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert Banner */}
      {lowStockParts.length > 0 && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">Low Stock Alert:</span>
              <span>
                {lowStockParts.slice(0, 3).map(p => p.name).join(', ')}
                {lowStockParts.length > 3 && ` and ${lowStockParts.length - 3} more`}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or part number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        {loadingCategories ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-9 w-24" />
            ))}
          </div>
        ) : (
          <TabsList className="flex-wrap h-auto gap-1">
            {tabCategories.map((category) => (
              <TabsTrigger key={category.value} value={category.value}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        <TabsContent value={selectedCategory} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 text-center text-muted-foreground">
                  Loading items...
                </div>
              ) : filteredParts.length === 0 ? (
                <div className="p-8 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-medium">No items found</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery 
                      ? 'Try adjusting your search terms' 
                      : 'Add your first item to get started'}
                  </p>
                  {!searchQuery && (
                    <Button className="mt-4" onClick={() => setAddDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParts.map((part) => {
                      const stockStatus = getStockStatus(part);
                      return (
                        <TableRow key={part.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{part.name}</p>
                              {part.part_number && (
                                <p className="text-sm text-muted-foreground">{part.part_number}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline">{getCategoryLabel(part.category)}</Badge>
                              {part.subcategory && (
                                <span className="text-xs text-muted-foreground">{part.subcategory}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className={stockStatus.status === 'low' ? 'text-destructive font-medium' : ''}>
                                {part.quantity}
                              </span>
                              <span className="text-muted-foreground text-sm">{part.unit_of_measure}</span>
                              {stockStatus.status === 'low' && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            {part.min_quantity !== null && (
                              <p className="text-xs text-muted-foreground">
                                Min: {part.min_quantity}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {part.cost_price ? `$${part.cost_price.toFixed(2)}` : '-'}
                          </TableCell>
                          <TableCell>
                            {part.storage_location || part.bin_number ? (
                              <span className="text-sm">
                                {[part.storage_location, part.bin_number].filter(Boolean).join(' / ')}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReceiveStock(part)}
                              >
                                + Receive
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUseStock(part)}
                                disabled={part.quantity === 0}
                              >
                                - Use
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddWaterDeliveryPartDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen} 
      />

      <WaterDeliveryPartTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        part={selectedPart}
        defaultType={transactionType}
      />
    </div>
  );
}
