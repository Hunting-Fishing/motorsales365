import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTireManagement, TireInventory } from '@/hooks/useTireManagement';
import { Plus, Search, Circle, Package, RotateCcw, ClipboardCheck, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-green-500',
  installed: 'bg-blue-500',
  retreaded: 'bg-amber-500',
  disposed: 'bg-gray-500',
  sold: 'bg-purple-500',
};

const CONDITION_COLORS: Record<string, string> = {
  good: 'text-green-500',
  fair: 'text-amber-500',
  replace: 'text-red-500',
  critical: 'text-red-700',
};

export default function TireManagement() {
  const { brands, tires, isLoading, createTire, createBrand } = useTireManagement();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddTireOpen, setIsAddTireOpen] = useState(false);
  const [isAddBrandOpen, setIsAddBrandOpen] = useState(false);

  const filteredTires = tires.filter(t => {
    const matchesSearch = 
      t.size.toLowerCase().includes(search.toLowerCase()) ||
      t.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.serial_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: tires.length,
    new: tires.filter(t => t.status === 'new').length,
    installed: tires.filter(t => t.status === 'installed').length,
    totalValue: tires.reduce((sum, t) => sum + (t.purchase_cost || 0), 0),
  };

  return (
    <>
      <Helmet>
        <title>Tire Management | Fleet Operations</title>
      </Helmet>

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tire Management</h1>
            <p className="text-muted-foreground">Track tire inventory, installations, and inspections</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddBrandOpen} onOpenChange={setIsAddBrandOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-2" /> Add Brand</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Tire Brand</DialogTitle>
                </DialogHeader>
                <AddBrandForm onSuccess={() => setIsAddBrandOpen(false)} createBrand={createBrand} />
              </DialogContent>
            </Dialog>
            <Dialog open={isAddTireOpen} onOpenChange={setIsAddTireOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Add Tire</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Tire to Inventory</DialogTitle>
                </DialogHeader>
                <AddTireForm onSuccess={() => setIsAddTireOpen(false)} createTire={createTire} brands={brands} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Circle className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Tires</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg"><Package className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.new}</p>
                  <p className="text-xs text-muted-foreground">In Stock (New)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg"><RotateCcw className="h-5 w-5 text-blue-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.installed}</p>
                  <p className="text-xs text-muted-foreground">Installed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg"><DollarSign className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Inventory Value</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="inventory" className="space-y-4">
          <TabsList>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="inspections">Inspections</TabsTrigger>
            <TabsTrigger value="rotations">Rotations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tires..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                  <SelectItem value="retreaded">Retreaded</SelectItem>
                  <SelectItem value="disposed">Disposed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tires...</div>
            ) : filteredTires.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Circle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No tires found</h3>
                  <p className="text-sm text-muted-foreground">Add tires to your inventory to track them</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTires.map((tire) => (
                  <TireCard key={tire.id} tire={tire} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="inspections">
            <Card>
              <CardHeader>
                <CardTitle>Tire Inspections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Record tire inspections to track tread depth and condition</p>
                  <p className="text-sm">Select a tire from inventory to log an inspection</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rotations">
            <Card>
              <CardHeader>
                <CardTitle>Tire Rotations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Track tire rotations for optimal wear distribution</p>
                  <p className="text-sm">Schedule and record rotation patterns</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Tire Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Cost per mile analysis and brand performance comparison</p>
                  <p className="text-sm">Insights based on installation and inspection data</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function TireCard({ tire }: { tire: TireInventory }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${STATUS_COLORS[tire.status] || 'bg-gray-400'}`} />
            <Badge variant="outline" className="capitalize">{tire.status}</Badge>
          </div>
          {tire.purchase_cost && (
            <span className="text-sm font-medium text-muted-foreground">
              ${tire.purchase_cost.toFixed(2)}
            </span>
          )}
        </div>
        
        <h3 className="font-semibold text-lg mb-1">{tire.size}</h3>
        <p className="text-sm text-muted-foreground mb-2">
          {tire.brand_name || 'Unknown Brand'} {tire.model && `- ${tire.model}`}
        </p>
        
        <div className="space-y-1 text-sm">
          {tire.serial_number && (
            <p className="text-muted-foreground">S/N: {tire.serial_number}</p>
          )}
          {tire.dot_code && (
            <p className="text-muted-foreground">DOT: {tire.dot_code}</p>
          )}
          {tire.location && (
            <p className="text-muted-foreground">Location: {tire.location}</p>
          )}
          {tire.tread_depth_initial && (
            <p className="text-muted-foreground">Initial Tread: {tire.tread_depth_initial}/32"</p>
          )}
        </div>
        
        {tire.purchase_date && (
          <p className="text-xs text-muted-foreground mt-3">
            Purchased: {format(new Date(tire.purchase_date), 'MMM d, yyyy')}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AddBrandForm({ onSuccess, createBrand }: { onSuccess: () => void; createBrand: any }) {
  const [formData, setFormData] = useState({
    name: '',
    warranty_miles: '',
    warranty_months: '',
    rating: '',
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBrand.mutate({
      ...formData,
      warranty_miles: formData.warranty_miles ? parseInt(formData.warranty_miles) : null,
      warranty_months: formData.warranty_months ? parseInt(formData.warranty_months) : null,
    }, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Brand Name *</Label>
        <Input
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Michelin"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Warranty Miles</Label>
          <Input
            type="number"
            value={formData.warranty_miles}
            onChange={(e) => setFormData({ ...formData, warranty_miles: e.target.value })}
            placeholder="50000"
          />
        </div>
        <div>
          <Label>Warranty Months</Label>
          <Input
            type="number"
            value={formData.warranty_months}
            onChange={(e) => setFormData({ ...formData, warranty_months: e.target.value })}
            placeholder="48"
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createBrand.isPending}>
        {createBrand.isPending ? 'Adding...' : 'Add Brand'}
      </Button>
    </form>
  );
}

function AddTireForm({ onSuccess, createTire, brands }: { onSuccess: () => void; createTire: any; brands: any[] }) {
  const [formData, setFormData] = useState({
    brand_id: '',
    brand_name: '',
    model: '',
    size: '',
    dot_code: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: '',
    vendor_name: '',
    tread_depth_initial: '',
    location: '',
    status: 'new',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTire.mutate({
      ...formData,
      brand_id: formData.brand_id || null,
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
      tread_depth_initial: formData.tread_depth_initial ? parseFloat(formData.tread_depth_initial) : null,
      purchase_date: formData.purchase_date || null,
    }, { onSuccess });
  };

  const handleBrandChange = (brandId: string) => {
    const brand = brands.find(b => b.id === brandId);
    setFormData({ 
      ...formData, 
      brand_id: brandId,
      brand_name: brand?.name || '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Brand</Label>
          <Select value={formData.brand_id} onValueChange={handleBrandChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select brand" />
            </SelectTrigger>
            <SelectContent>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>{brand.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Model</Label>
          <Input
            value={formData.model}
            onChange={(e) => setFormData({ ...formData, model: e.target.value })}
            placeholder="Defender LTX"
          />
        </div>
      </div>
      
      <div>
        <Label>Size *</Label>
        <Input
          required
          value={formData.size}
          onChange={(e) => setFormData({ ...formData, size: e.target.value })}
          placeholder="275/70R22.5"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>DOT Code</Label>
          <Input
            value={formData.dot_code}
            onChange={(e) => setFormData({ ...formData, dot_code: e.target.value })}
            placeholder="DOT XXXX"
          />
        </div>
        <div>
          <Label>Serial Number</Label>
          <Input
            value={formData.serial_number}
            onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Purchase Date</Label>
          <Input
            type="date"
            value={formData.purchase_date}
            onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
          />
        </div>
        <div>
          <Label>Purchase Cost ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.purchase_cost}
            onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tread Depth (32nds)</Label>
          <Input
            type="number"
            step="0.1"
            value={formData.tread_depth_initial}
            onChange={(e) => setFormData({ ...formData, tread_depth_initial: e.target.value })}
            placeholder="12"
          />
        </div>
        <div>
          <Label>Storage Location</Label>
          <Input
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            placeholder="Warehouse A"
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={createTire.isPending}>
        {createTire.isPending ? 'Adding...' : 'Add Tire to Inventory'}
      </Button>
    </form>
  );
}
