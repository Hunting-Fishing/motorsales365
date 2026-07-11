import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FuturePlan {
  id: string;
  equipment_id: string;
  title: string;
  description: string | null;
  planned_date: string | null;
  estimated_cost: number | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'planned' | 'approved' | 'in-progress' | 'completed' | 'cancelled';
  parts_list: any[];
  modifications: string | null;
  notes: string | null;
  created_at: string;
}

export function FuturePlanningList() {
  const [plans, setPlans] = useState<FuturePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [equipment, setEquipment] = useState<any[]>([]);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    equipment_id: '',
    title: '',
    description: '',
    planned_date: '',
    estimated_cost: '',
    priority: 'medium',
    status: 'planned',
    modifications: '',
    notes: ''
  });

  useEffect(() => {
    fetchPlans();
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    const { data } = await supabase
      .from('equipment_assets')
      .select('id, name, model')
      .order('name');
    if (data) setEquipment(data);
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_future_plans')
        .select(`
          *,
          equipment_assets (
            name,
            model
          )
        `)
        .order('planned_date', { ascending: true });

      if (error) throw error;
      setPlans((data || []) as FuturePlan[]);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load future plans'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('equipment_future_plans')
        .insert([{
          ...formData,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null
        }]);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Future plan created successfully'
      });
      
      setDialogOpen(false);
      setFormData({
        equipment_id: '',
        title: '',
        description: '',
        planned_date: '',
        estimated_cost: '',
        priority: 'medium',
        status: 'planned',
        modifications: '',
        notes: ''
      });
      fetchPlans();
    } catch (error) {
      console.error('Error creating plan:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create plan'
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'destructive';
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in-progress': return 'secondary';
      case 'approved': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading future plans...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Equipment Future Planning</h2>
          <p className="text-muted-foreground">Plan modifications, upgrades, and parts for your equipment</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Future Plan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Future Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Equipment</Label>
                <Select value={formData.equipment_id} onValueChange={(value) => setFormData({...formData, equipment_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name} - {eq.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Title</Label>
                <Input
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="e.g., Engine Upgrade"
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Describe the planned work..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Planned Date</Label>
                  <Input
                    type="date"
                    value={formData.planned_date}
                    onChange={(e) => setFormData({...formData, planned_date: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Estimated Cost</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({...formData, estimated_cost: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => setFormData({...formData, priority: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Modifications Details</Label>
                <Textarea
                  value={formData.modifications}
                  onChange={(e) => setFormData({...formData, modifications: e.target.value})}
                  placeholder="List modifications and upgrades..."
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional notes..."
                />
              </div>

              <Button type="submit" className="w-full">Create Plan</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {plans.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No future plans yet. Create one to start planning equipment modifications and upgrades.
            </CardContent>
          </Card>
        ) : (
          plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{plan.title}</CardTitle>
                    <CardDescription>
                      {(plan as any).equipment_assets?.name} - {(plan as any).equipment_assets?.model}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getPriorityColor(plan.priority)}>
                      {plan.priority}
                    </Badge>
                    <Badge variant={getStatusColor(plan.status)}>
                      {plan.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}
                
                <div className="flex flex-wrap gap-4 text-sm">
                  {plan.planned_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(plan.planned_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  {plan.estimated_cost && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>${plan.estimated_cost.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {plan.modifications && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Modifications:</h4>
                    <p className="text-sm text-muted-foreground">{plan.modifications}</p>
                  </div>
                )}

                {plan.notes && (
                  <div className="mt-2 p-3 bg-muted rounded-lg">
                    <h4 className="text-sm font-semibold mb-1">Notes:</h4>
                    <p className="text-sm text-muted-foreground">{plan.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
