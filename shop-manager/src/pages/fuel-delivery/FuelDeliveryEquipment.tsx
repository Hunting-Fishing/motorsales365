import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Plus, 
  Search, 
  Calendar,
  Wrench,
  Filter,
  ArrowLeft
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

interface Equipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  purchase_date: string | null;
  installation_date: string | null;
  purchase_price: number | null;
  location: string | null;
  location_type: string | null;
  status: string;
  notes: string | null;
}

const EQUIPMENT_TYPES = [
  { value: 'pump', label: 'Fuel Pump' },
  { value: 'meter', label: 'Flow Meter' },
  { value: 'hose', label: 'Delivery Hose' },
  { value: 'nozzle', label: 'Nozzle' },
  { value: 'filter_housing', label: 'Filter Housing' },
  { value: 'tank_gauge', label: 'Tank Gauge' },
  { value: 'valve', label: 'Valve' },
  { value: 'compressor', label: 'Compressor' },
  { value: 'other', label: 'Other' },
];

export default function FuelDeliveryEquipment() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');
  const [formData, setFormData] = useState({
    equipment_name: '',
    equipment_type: '',
    serial_number: '',
    manufacturer: '',
    model: '',
    purchase_date: '',
    installation_date: '',
    purchase_price: '',
    location: '',
    location_type: '',
    status: 'active',
    notes: '',
  });

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['fuel-delivery-equipment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_delivery_equipment')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await supabase
        .from('fuel_delivery_equipment')
        .insert([{
          shop_id: profile?.shop_id,
          equipment_name: data.equipment_name,
          equipment_type: data.equipment_type,
          serial_number: data.serial_number || null,
          manufacturer: data.manufacturer || null,
          model: data.model || null,
          purchase_date: data.purchase_date || null,
          installation_date: data.installation_date || null,
          purchase_price: data.purchase_price ? parseFloat(data.purchase_price) : null,
          location: data.location || null,
          location_type: data.location_type || null,
          status: data.status,
          notes: data.notes || null,
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-equipment'] });
      setIsDialogOpen(false);
      setFormData({
        equipment_name: '',
        equipment_type: '',
        serial_number: '',
        manufacturer: '',
        model: '',
        purchase_date: '',
        installation_date: '',
        purchase_price: '',
        location: '',
        location_type: '',
        status: 'active',
        notes: '',
      });
      toast.success('Equipment added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add equipment: ' + error.message);
    },
  });

  const filteredEquipment = equipment?.filter(eq => {
    const matchesSearch = 
      eq.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eq.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || eq.equipment_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'maintenance': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'retired': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_name || !formData.equipment_type) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Equipment
            </h1>
            <p className="text-muted-foreground mt-1">
              Track pumps, meters, hoses, and other equipment
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/fuel-delivery/equipment-filters')}>
              <Filter className="h-4 w-4 mr-2" />
              Filters & Consumables
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Equipment
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Equipment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="equipment_name">Equipment Name *</Label>
                      <Input
                        id="equipment_name"
                        value={formData.equipment_name}
                        onChange={(e) => setFormData({ ...formData, equipment_name: e.target.value })}
                        placeholder="e.g., Main Delivery Pump"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="equipment_type">Type *</Label>
                      <Select
                        value={formData.equipment_type}
                        onValueChange={(value) => setFormData({ ...formData, equipment_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EQUIPMENT_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="serial_number">Serial Number</Label>
                      <Input
                        id="serial_number"
                        value={formData.serial_number}
                        onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                        placeholder="SN-12345"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manufacturer">Manufacturer</Label>
                      <Input
                        id="manufacturer"
                        value={formData.manufacturer}
                        onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                        placeholder="e.g., Gilbarco"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="model">Model</Label>
                      <Input
                        id="model"
                        value={formData.model}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="e.g., Encore 700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="maintenance">In Maintenance</SelectItem>
                          <SelectItem value="retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchase_date">Purchase Date</Label>
                      <Input
                        id="purchase_date"
                        type="date"
                        value={formData.purchase_date}
                        onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="installation_date">Installation Date</Label>
                      <Input
                        id="installation_date"
                        type="date"
                        value={formData.installation_date}
                        onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                      <Input
                        id="purchase_price"
                        type="number"
                        step="0.01"
                        value={formData.purchase_price}
                        onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location_type">Location Type</Label>
                      <Select
                        value={formData.location_type}
                        onValueChange={(value) => setFormData({ ...formData, location_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="tank">Storage Tank</SelectItem>
                          <SelectItem value="facility">Facility</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="location">Location Details</Label>
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g., Truck #1, Main Depot Tank"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      {createMutation.isPending ? 'Adding...' : 'Add Equipment'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {EQUIPMENT_TYPES.map(type => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Equipment Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredEquipment && filteredEquipment.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEquipment.map((eq) => (
            <Card key={eq.id} className="border-border hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{eq.equipment_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {EQUIPMENT_TYPES.find(t => t.value === eq.equipment_type)?.label || eq.equipment_type}
                    </p>
                  </div>
                  <Badge className={getStatusColor(eq.status)}>
                    {eq.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {eq.serial_number && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">S/N:</span> {eq.serial_number}
                  </div>
                )}
                {eq.manufacturer && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Manufacturer:</span> {eq.manufacturer} {eq.model}
                  </div>
                )}
                {eq.location && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Location:</span> {eq.location}
                  </div>
                )}
                <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
                  {eq.purchase_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Purchased: {format(new Date(eq.purchase_date), 'MMM d, yyyy')}
                    </div>
                  )}
                  {eq.installation_date && (
                    <div className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      Installed: {format(new Date(eq.installation_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Equipment Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || typeFilter !== 'all' 
                ? 'No equipment matches your filters' 
                : 'Add your first piece of equipment to get started'}
            </p>
            {!searchTerm && typeFilter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
