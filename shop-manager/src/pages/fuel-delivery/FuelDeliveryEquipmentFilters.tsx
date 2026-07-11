import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { 
  Filter, 
  Plus, 
  Search, 
  Calendar,
  Clock,
  Droplets,
  AlertTriangle,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface EquipmentFilter {
  id: string;
  equipment_id: string;
  filter_type: string;
  filter_name: string;
  part_number: string | null;
  manufacturer: string | null;
  installation_date: string;
  installation_hours: number;
  installation_liters: number;
  current_hours: number;
  current_liters: number;
  max_hours: number | null;
  max_liters: number | null;
  status: string;
  cost: number | null;
  notes: string | null;
  fuel_delivery_equipment?: {
    equipment_name: string;
    equipment_type: string;
  };
}

interface Equipment {
  id: string;
  equipment_name: string;
  equipment_type: string;
}

const FILTER_TYPES = [
  { value: 'fuel_filter', label: 'Fuel Filter' },
  { value: 'water_separator', label: 'Water Separator' },
  { value: 'air_filter', label: 'Air Filter' },
  { value: 'hydraulic_filter', label: 'Hydraulic Filter' },
  { value: 'strainer', label: 'Strainer' },
  { value: 'other', label: 'Other' },
];

export default function FuelDeliveryEquipmentFilters() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    equipment_id: '',
    filter_type: '',
    filter_name: '',
    part_number: '',
    manufacturer: '',
    installation_date: format(new Date(), 'yyyy-MM-dd'),
    installation_hours: '0',
    installation_liters: '0',
    max_hours: '',
    max_liters: '',
    cost: '',
    notes: '',
  });

  const { data: filters, isLoading } = useQuery({
    queryKey: ['fuel-delivery-equipment-filters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_delivery_equipment_filters')
        .select(`
          *,
          fuel_delivery_equipment (
            equipment_name,
            equipment_type
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EquipmentFilter[];
    },
  });

  const { data: equipment } = useQuery({
    queryKey: ['fuel-delivery-equipment-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fuel_delivery_equipment')
        .select('id, equipment_name, equipment_type')
        .eq('status', 'active')
        .order('equipment_name');
      
      if (error) throw error;
      return data as Equipment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await supabase
        .from('fuel_delivery_equipment_filters')
        .insert([{
          shop_id: profile?.shop_id,
          equipment_id: data.equipment_id,
          filter_type: data.filter_type,
          filter_name: data.filter_name,
          part_number: data.part_number || null,
          manufacturer: data.manufacturer || null,
          installation_date: data.installation_date,
          installation_hours: parseFloat(data.installation_hours) || 0,
          installation_liters: parseFloat(data.installation_liters) || 0,
          current_hours: parseFloat(data.installation_hours) || 0,
          current_liters: parseFloat(data.installation_liters) || 0,
          max_hours: data.max_hours ? parseFloat(data.max_hours) : null,
          max_liters: data.max_liters ? parseFloat(data.max_liters) : null,
          cost: data.cost ? parseFloat(data.cost) : null,
          notes: data.notes || null,
          status: 'active',
        }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fuel-delivery-equipment-filters'] });
      setIsDialogOpen(false);
      setFormData({
        equipment_id: '',
        filter_type: '',
        filter_name: '',
        part_number: '',
        manufacturer: '',
        installation_date: format(new Date(), 'yyyy-MM-dd'),
        installation_hours: '0',
        installation_liters: '0',
        max_hours: '',
        max_liters: '',
        cost: '',
        notes: '',
      });
      toast.success('Filter added successfully');
    },
    onError: (error) => {
      toast.error('Failed to add filter: ' + error.message);
    },
  });

  const filteredFilters = filters?.filter(f => {
    const matchesSearch = 
      f.filter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.part_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.fuel_delivery_equipment?.equipment_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'due': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'overdue': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'replaced': return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const calculateUsageProgress = (filter: EquipmentFilter) => {
    let hoursProgress = 0;
    let litersProgress = 0;
    
    if (filter.max_hours && filter.max_hours > 0) {
      const hoursUsed = filter.current_hours - filter.installation_hours;
      hoursProgress = Math.min((hoursUsed / filter.max_hours) * 100, 100);
    }
    
    if (filter.max_liters && filter.max_liters > 0) {
      const litersUsed = filter.current_liters - filter.installation_liters;
      litersProgress = Math.min((litersUsed / filter.max_liters) * 100, 100);
    }
    
    return { hoursProgress, litersProgress };
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-red-500';
    if (progress >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_id || !formData.filter_type || !formData.filter_name) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  // Count filters by status
  const statusCounts = filters?.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery/equipment')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Equipment
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Filter className="h-8 w-8 text-purple-600" />
              Filters & Consumables
            </h1>
            <p className="text-muted-foreground mt-1">
              Track filter installations, usage hours/liters, and replacement schedules
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Filter/Consumable</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="equipment_id">Equipment *</Label>
                    <Select
                      value={formData.equipment_id}
                      onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipment?.map(eq => (
                          <SelectItem key={eq.id} value={eq.id}>{eq.equipment_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter_type">Filter Type *</Label>
                    <Select
                      value={formData.filter_type}
                      onValueChange={(value) => setFormData({ ...formData, filter_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {FILTER_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="filter_name">Filter Name *</Label>
                    <Input
                      id="filter_name"
                      value={formData.filter_name}
                      onChange={(e) => setFormData({ ...formData, filter_name: e.target.value })}
                      placeholder="e.g., Primary Fuel Filter"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="part_number">Part Number</Label>
                    <Input
                      id="part_number"
                      value={formData.part_number}
                      onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                      placeholder="e.g., FF-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="e.g., Donaldson"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installation_date">Installation Date *</Label>
                    <Input
                      id="installation_date"
                      type="date"
                      value={formData.installation_date}
                      onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installation_hours">Hours at Install</Label>
                    <Input
                      id="installation_hours"
                      type="number"
                      step="0.1"
                      value={formData.installation_hours}
                      onChange={(e) => setFormData({ ...formData, installation_hours: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installation_liters">Liters at Install</Label>
                    <Input
                      id="installation_liters"
                      type="number"
                      step="0.1"
                      value={formData.installation_liters}
                      onChange={(e) => setFormData({ ...formData, installation_liters: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_hours">Service Interval (Hours)</Label>
                    <Input
                      id="max_hours"
                      type="number"
                      step="0.1"
                      value={formData.max_hours}
                      onChange={(e) => setFormData({ ...formData, max_hours: e.target.value })}
                      placeholder="e.g., 500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_liters">Service Interval (Liters)</Label>
                    <Input
                      id="max_liters"
                      type="number"
                      step="0.1"
                      value={formData.max_liters}
                      onChange={(e) => setFormData({ ...formData, max_liters: e.target.value })}
                      placeholder="e.g., 100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Cost ($)</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0.00"
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
                    {createMutation.isPending ? 'Adding...' : 'Add Filter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-green-500">{statusCounts['active'] || 0}</p>
              </div>
              <Filter className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Due Soon</p>
                <p className="text-2xl font-bold text-amber-500">{statusCounts['due'] || 0}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/20 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-red-500">{statusCounts['overdue'] || 0}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-gray-500/20 bg-gray-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Replaced</p>
                <p className="text-2xl font-bold text-gray-500">{statusCounts['replaced'] || 0}</p>
              </div>
              <Settings className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search filters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="due">Due Soon</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="replaced">Replaced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Filters Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : filteredFilters && filteredFilters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFilters.map((filter) => {
            const { hoursProgress, litersProgress } = calculateUsageProgress(filter);
            return (
              <Card key={filter.id} className="border-border hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{filter.filter_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {filter.fuel_delivery_equipment?.equipment_name}
                      </p>
                    </div>
                    <Badge className={getStatusColor(filter.status)}>
                      {filter.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Type:</span>{' '}
                    {FILTER_TYPES.find(t => t.value === filter.filter_type)?.label || filter.filter_type}
                  </div>
                  {filter.part_number && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">P/N:</span> {filter.part_number}
                    </div>
                  )}
                  <div className="text-sm flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    Installed: {format(new Date(filter.installation_date), 'MMM d, yyyy')}
                  </div>
                  
                  {/* Usage Progress */}
                  {filter.max_hours && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Hours
                        </span>
                        <span>
                          {(filter.current_hours - filter.installation_hours).toFixed(1)} / {filter.max_hours}
                        </span>
                      </div>
                      <Progress 
                        value={hoursProgress} 
                        className="h-2"
                      />
                    </div>
                  )}
                  
                  {filter.max_liters && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="flex items-center gap-1">
                          <Droplets className="h-3 w-3" /> Liters
                        </span>
                        <span>
                          {((filter.current_liters - filter.installation_liters) / 1000).toFixed(1)}k / {(filter.max_liters / 1000).toFixed(1)}k
                        </span>
                      </div>
                      <Progress 
                        value={litersProgress} 
                        className="h-2"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="py-12 text-center">
            <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Filters Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'No filters match your search' 
                : 'Add filters to track their usage and replacement schedules'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Filter
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
