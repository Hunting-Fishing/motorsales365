import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { HardHat, Package, Users, AlertTriangle, Search, History, Clock } from 'lucide-react';
import { usePPEManagement } from '@/hooks/usePPEManagement';
import { AddPPEItemDialog } from '@/components/safety/ppe/AddPPEItemDialog';
import { AssignPPEDialog } from '@/components/safety/ppe/AssignPPEDialog';
import { PPEInventoryCard } from '@/components/safety/ppe/PPEInventoryCard';
import { PPEAssignmentCard } from '@/components/safety/ppe/PPEAssignmentCard';
import { PPEHistoryCard } from '@/components/safety/ppe/PPEHistoryCard';
import { isPast, addDays } from 'date-fns';

const SafetyPPE = () => {
  const { inventory, assignments, history, loadingInventory, loadingAssignments, loadingHistory } = usePPEManagement();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  const lowStockItems = inventory.filter(
    (item) => item.quantity_in_stock <= (item.minimum_stock_level || 5)
  );
  const activeAssignments = assignments.filter((a) => a.status === 'active');
  const totalItemsAssigned = activeAssignments.reduce((sum, a) => sum + a.quantity, 0);
  
  // Calculate expiring soon (within 30 days)
  const expiringSoonCount = assignments.filter((a) => {
    if (!a.expiry_date) return false;
    const expiryDate = new Date(a.expiry_date);
    return !isPast(expiryDate) && isPast(addDays(new Date(), -30));
  }).length;

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssignments = assignments.filter((a) => {
    const itemName = a.ppe_inventory?.name || '';
    const employeeName = a.profiles 
      ? `${a.profiles.first_name || ''} ${a.profiles.last_name || ''}`.trim()
      : '';
    return (
      itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employeeName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const filteredHistory = history.filter((h) => {
    const itemName = h.ppe_inventory?.name || '';
    const performedBy = h.performed_by_name || '';
    return (
      itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.event_type.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">PPE Management</h1>
          <p className="text-muted-foreground">Track and manage personal protective equipment lifecycle</p>
        </div>
        <div className="flex gap-2">
          <AssignPPEDialog />
          <AddPPEItemDialog />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{inventory.length}</p>
                <p className="text-xs text-muted-foreground">PPE Types</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalItemsAssigned}</p>
                <p className="text-xs text-muted-foreground">Items Assigned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <HardHat className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{activeAssignments.length}</p>
                <p className="text-xs text-muted-foreground">Active Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{expiringSoonCount}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-2xl font-bold">{lowStockItems.length}</p>
                <p className="text-xs text-muted-foreground">Low Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="destructive">
                  {item.name} ({item.quantity_in_stock} left)
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search PPE items, employees, or history..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory">
            Inventory ({inventory.length})
          </TabsTrigger>
          <TabsTrigger value="assignments">
            Assignments ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-1" />
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          {loadingInventory ? (
            <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No items match your search' : 'No PPE items in inventory. Add some to get started.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => (
                <PPEInventoryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          {loadingAssignments ? (
            <div className="text-center py-8 text-muted-foreground">Loading assignments...</div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No assignments match your search' : 'No PPE assignments yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAssignments.map((assignment) => (
                <PPEAssignmentCard key={assignment.id} assignment={assignment} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          {loadingHistory ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No history matches your search' : 'No PPE history yet. History is automatically recorded when assignments are created or updated.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredHistory.map((historyItem) => (
                <PPEHistoryCard key={historyItem.id} history={historyItem} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SafetyPPE;
