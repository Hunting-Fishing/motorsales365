import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Filter, Plus, Search, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';

interface EquipmentFilter {
  id: string;
  equipment_id: string;
  filter_type: string;
  filter_name: string;
  part_number: string | null;
  installation_date: string;
  installation_gallons: number;
  current_gallons: number;
  max_gallons: number | null;
  status: string;
  cost: number | null;
  water_delivery_equipment?: {
    equipment_name: string;
  };
}

const FILTER_TYPES = [
  { value: 'sediment', label: 'Sediment Filter' },
  { value: 'carbon', label: 'Carbon Filter' },
  { value: 'uv', label: 'UV Sterilizer' },
  { value: 'reverse_osmosis', label: 'Reverse Osmosis' },
  { value: 'strainer', label: 'Strainer' },
  { value: 'other', label: 'Other' },
];

export default function WaterDeliveryEquipmentFilters() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { getVolumeLabel } = useWaterUnits();
  const [formData, setFormData] = useState({
    equipment_id: '',
    filter_type: '',
    filter_name: '',
    part_number: '',
    installation_date: format(new Date(), 'yyyy-MM-dd'),
    installation_gallons: '0',
    max_gallons: '',
    cost: '',
  });

  const { data: filters, isLoading } = useQuery({
    queryKey: ['water-delivery-equipment-filters'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_equipment_filters')
        .select(`
          *,
          water_delivery_equipment (equipment_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EquipmentFilter[];
    },
  });

  const { data: equipment } = useQuery({
    queryKey: ['water-delivery-equipment-list'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('water_delivery_equipment')
        .select('id, equipment_name')
        .eq('status', 'active')
        .order('equipment_name');
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: profile } = await supabase.from('profiles').select('shop_id').single();
      const { error } = await (supabase as any)
        .from('water_delivery_equipment_filters')
        .insert([{
          shop_id: profile?.shop_id,
          equipment_id: data.equipment_id,
          filter_type: data.filter_type,
          filter_name: data.filter_name,
          part_number: data.part_number || null,
          installation_date: data.installation_date,
          installation_gallons: parseFloat(data.installation_gallons) || 0,
          current_gallons: parseFloat(data.installation_gallons) || 0,
          max_gallons: data.max_gallons ? parseFloat(data.max_gallons) : null,
          cost: data.cost ? parseFloat(data.cost) : null,
          status: 'active',
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['water-delivery-equipment-filters'] });
      setIsDialogOpen(false);
      setFormData({
        equipment_id: '',
        filter_type: '',
        filter_name: '',
        part_number: '',
        installation_date: format(new Date(), 'yyyy-MM-dd'),
        installation_gallons: '0',
        max_gallons: '',
        cost: '',
      });
      toast.success('Filter added successfully');
    },
  });

  const filteredFilters = filters?.filter(f => {
    const matchesSearch = 
      f.filter_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.part_number?.toLowerCase().includes(searchTerm.toLowerCase());
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
    if (!filter.max_gallons || filter.max_gallons <= 0) return 0;
    const gallonsUsed = filter.current_gallons - filter.installation_gallons;
    return Math.min((gallonsUsed / filter.max_gallons) * 100, 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipment_id || !formData.filter_type || !formData.filter_name) {
      toast.error('Please fill in required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const statusCounts = filters?.reduce((acc, f) => {
    acc[f.status] = (acc[f.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery/equipment')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Equipment
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Filter className="h-8 w-8 text-cyan-600" />
              Filters & Consumables
            </h1>
            <p className="text-muted-foreground mt-1">Track filter installations and replacement schedules</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Filter</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Filter</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Equipment *</Label>
                    <Select
                      value={formData.equipment_id}
                      onValueChange={(value) => setFormData({ ...formData, equipment_id: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select equipment" /></SelectTrigger>
                      <SelectContent>
                        {equipment?.map((eq: any) => (
                          <SelectItem key={eq.id} value={eq.id}>{eq.equipment_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter Type *</Label>
                    <Select
                      value={formData.filter_type}
                      onValueChange={(value) => setFormData({ ...formData, filter_type: value })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {FILTER_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Filter Name *</Label>
                    <Input
                      value={formData.filter_name}
                      onChange={(e) => setFormData({ ...formData, filter_name: e.target.value })}
                      placeholder="e.g., Primary Sediment Filter"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Part Number</Label>
                    <Input
                      value={formData.part_number}
                      onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                      placeholder="e.g., SF-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Installation Date *</Label>
                    <Input
                      type="date"
                      value={formData.installation_date}
                      onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Service Interval ({getVolumeLabel()})</Label>
                    <Input
                      type="number"
                      value={formData.max_gallons}
                      onChange={(e) => setFormData({ ...formData, max_gallons: e.target.value })}
                      placeholder="e.g., 100000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cost ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Adding...' : 'Add Filter'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
              <Filter className="h-8 w-8 text-gray-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

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

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : filteredFilters && filteredFilters.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFilters.map((filter) => {
            const progress = calculateUsageProgress(filter);
            return (
              <Card key={filter.id} className="border-border">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{filter.filter_name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {FILTER_TYPES.find(t => t.value === filter.filter_type)?.label || filter.filter_type}
                      </p>
                    </div>
                    <Badge className={getStatusColor(filter.status)}>{filter.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {filter.water_delivery_equipment && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Equipment:</span> {filter.water_delivery_equipment.equipment_name}
                    </div>
                  )}
                  {filter.max_gallons && (
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span>Usage</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Installed: {format(new Date(filter.installation_date), 'MMM d, yyyy')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Filter className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">No filters found</p>
            <Button variant="link" onClick={() => setIsDialogOpen(true)}>Add your first filter</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
