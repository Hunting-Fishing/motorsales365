import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, Search, AlertTriangle, History, 
  ShoppingCart, Barcode, Plus, TrendingDown, TrendingUp
} from 'lucide-react';
import { useGunsmithParts } from '@/hooks/useGunsmith';
import { useStockMovements, useLowStockParts, useSerializedItems, usePurchaseOrders } from '@/hooks/useGunsmithInventory';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

export default function GunsmithInventory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('parts');

  const { data: parts, isLoading: partsLoading } = useGunsmithParts();
  const { data: movements, isLoading: movementsLoading } = useStockMovements();
  const { data: lowStock } = useLowStockParts();
  const { data: serialized, isLoading: serializedLoading } = useSerializedItems();
  const { data: purchaseOrders, isLoading: poLoading } = usePurchaseOrders();

  const filteredParts = parts?.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.part_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'job_usage': return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'adjustment': return <History className="h-4 w-4 text-blue-500" />;
      default: return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Inventory"
        subtitle="Stock tracking, movements, and purchase orders"
        icon={<Package className="h-6 w-6 md:h-8 md:w-8 text-amber-600 shrink-0" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={() => navigate('/gunsmith/inventory/adjust')} className="w-full sm:w-auto">
              <History className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Adjust </span>Stock
            </Button>
            <Button size="sm" onClick={() => navigate('/gunsmith/inventory/purchase-orders/new')} className="w-full sm:w-auto">
              <ShoppingCart className="h-4 w-4 mr-1 md:mr-2" />
              New PO
            </Button>
          </div>
        }
      />

      {/* Low Stock Alert */}
      {(lowStock?.length || 0) > 0 && (
        <div className="mb-4 md:mb-6 p-3 md:p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 md:h-5 md:w-5 text-destructive shrink-0" />
              <span className="font-medium text-sm md:text-base">{lowStock?.length} item(s) need reordering</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate('/gunsmith/inventory/purchase-orders/new')} className="w-full sm:w-auto text-xs md:text-sm">
              Create Purchase Order
            </Button>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <TabsList className="flex w-full overflow-x-auto gap-1 scrollbar-hide h-auto p-1">
          <TabsTrigger value="parts" className="flex-shrink-0 px-2 md:px-3 text-xs md:text-sm">Parts</TabsTrigger>
          <TabsTrigger value="movements" className="flex-shrink-0 px-2 md:px-3 text-xs md:text-sm">Movements</TabsTrigger>
          <TabsTrigger value="serialized" className="flex-shrink-0 px-2 md:px-3 text-xs md:text-sm">Serialized</TabsTrigger>
          <TabsTrigger value="orders" className="flex-shrink-0 px-2 md:px-3 text-xs md:text-sm">POs</TabsTrigger>
        </TabsList>

        {/* Parts Tab */}
        <TabsContent value="parts">
          <div className="mb-3 md:mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Parts Inventory</CardTitle>
              <Button size="sm" onClick={() => navigate('/gunsmith/parts/new')} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" /> Add Part
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {partsLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredParts?.map(part => (
                    <div 
                      key={part.id}
                      className="p-3 md:p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/gunsmith/parts/${part.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm md:text-base truncate">{part.name}</span>
                            {part.part_number && <Badge variant="outline" className="text-xs">{part.part_number}</Badge>}
                          </div>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {part.manufacturer} {part.location && `- ${part.location}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <Badge variant={part.quantity <= part.min_quantity ? 'destructive' : 'secondary'} className="text-xs">
                            Qty: {part.quantity}
                          </Badge>
                          {part.retail_price && (
                            <span className="text-xs md:text-sm text-muted-foreground">${part.retail_price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements">
          <Card>
            <CardHeader className="p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Stock Movement History</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {movementsLoading ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : movements?.length === 0 ? (
                <p className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">No stock movements recorded</p>
              ) : (
                <div className="space-y-2">
                  {movements?.map(m => (
                    <div key={m.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-center gap-2 md:gap-3 min-w-0">
                          <span className="shrink-0">{getMovementIcon(m.movement_type)}</span>
                          <div className="min-w-0">
                            <span className="font-medium text-sm md:text-base truncate block">{m.gunsmith_parts?.name}</span>
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              {m.movement_type.replace('_', ' ')} - {m.reason || 'No reason'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 justify-between sm:justify-end">
                          <Badge variant={m.quantity_change > 0 ? 'default' : 'destructive'} className="text-xs">
                            {m.quantity_change > 0 ? '+' : ''}{m.quantity_change}
                          </Badge>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(m.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Serialized Tab */}
        <TabsContent value="serialized">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Barcode className="h-4 w-4 md:h-5 md:w-5" />
                Serialized Items
              </CardTitle>
              <Button size="sm" onClick={() => navigate('/gunsmith/inventory/serialized/new')} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" /> Add Serial
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {serializedLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : serialized?.length === 0 ? (
                <p className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">No serialized items tracked</p>
              ) : (
                <div className="space-y-2">
                  {serialized?.map(item => (
                    <div key={item.id} className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-medium text-sm md:text-base">{item.serial_number}</span>
                            <Badge variant="outline" className="text-xs">{item.gunsmith_parts?.name}</Badge>
                          </div>
                          {item.customers && (
                            <p className="text-xs md:text-sm text-muted-foreground truncate">
                              Customer: {item.customers.first_name} {item.customers.last_name}
                            </p>
                          )}
                        </div>
                        <Badge variant={item.status === 'in_stock' ? 'default' : 'secondary'} className="self-start sm:self-auto text-xs">
                          {item.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 md:p-6">
              <CardTitle className="text-base md:text-lg">Purchase Orders</CardTitle>
              <Button size="sm" onClick={() => navigate('/gunsmith/inventory/purchase-orders/new')} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-1" /> New PO
              </Button>
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              {poLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : purchaseOrders?.length === 0 ? (
                <p className="text-center py-6 md:py-8 text-muted-foreground text-sm md:text-base">No purchase orders</p>
              ) : (
                <div className="space-y-2">
                  {purchaseOrders?.map(po => (
                    <div 
                      key={po.id} 
                      className="p-3 md:p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => navigate(`/gunsmith/inventory/purchase-orders/${po.id}`)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-medium text-sm md:text-base">{po.po_number}</span>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {po.supplier || 'No supplier'} - {format(new Date(po.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            po.status === 'received' ? 'default' :
                            po.status === 'cancelled' ? 'destructive' : 'secondary'
                          } className="text-xs">
                            {po.status}
                          </Badge>
                          {po.total && <span className="text-xs md:text-sm">${po.total.toFixed(2)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MobilePageContainer>
  );
}