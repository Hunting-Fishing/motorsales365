import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CalendarDays, 
  Plus, 
  ArrowLeft
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { UnifiedModuleCalendar } from '@/components/calendar/UnifiedModuleCalendar';
import { useShopId } from '@/hooks/useShopId';

export default function PowerWashingSchedule() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { shopId } = useShopId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    scheduled_date: '',
    scheduled_time_start: '',
    scheduled_time_end: '',
    property_type: '',
    property_address: '',
    notes: ''
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('id, first_name, last_name').order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const createJob = useMutation({
    mutationFn: async (data: typeof formData) => {
      const jobNumber = `PW-${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase
        .from('power_washing_jobs')
        .insert({
          shop_id: shopId,
          job_number: jobNumber,
          customer_id: data.customer_id,
          scheduled_date: data.scheduled_date,
          scheduled_time_start: data.scheduled_time_start,
          scheduled_time_end: data.scheduled_time_end,
          property_type: data.property_type,
          property_address: data.property_address,
          internal_notes: data.notes || null,
          status: 'scheduled'
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-jobs'] });
      toast({ title: 'Job scheduled' });
      setIsDialogOpen(false);
      setFormData({ customer_id: '', scheduled_date: '', scheduled_time_start: '', scheduled_time_end: '', property_type: '', property_address: '', notes: '' });
    },
    onError: () => {
      toast({ title: 'Failed to schedule job', variant: 'destructive' });
    }
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/power-washing')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <CalendarDays className="h-7 w-7 text-cyan-500" />
              Power Washing Schedule
            </h1>
            <p className="text-muted-foreground mt-1">Manage jobs and crew schedules</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Job
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Schedule Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Customer *</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date *</Label>
                <Input type="date" value={formData.scheduled_date} onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input type="time" value={formData.scheduled_time_start} onChange={(e) => setFormData({ ...formData, scheduled_time_start: e.target.value })} />
                </div>
                <div>
                  <Label>End Time *</Label>
                  <Input type="time" value={formData.scheduled_time_end} onChange={(e) => setFormData({ ...formData, scheduled_time_end: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Property Type</Label>
                <Select value={formData.property_type} onValueChange={(v) => setFormData({ ...formData, property_type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Residential">Residential</SelectItem>
                    <SelectItem value="Commercial">Commercial</SelectItem>
                    <SelectItem value="Industrial">Industrial</SelectItem>
                    <SelectItem value="Driveway">Driveway</SelectItem>
                    <SelectItem value="Deck">Deck</SelectItem>
                    <SelectItem value="Roof">Roof</SelectItem>
                    <SelectItem value="Fleet">Fleet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Property Address</Label>
                <Input 
                  value={formData.property_address} 
                  onChange={(e) => setFormData({ ...formData, property_address: e.target.value })} 
                  placeholder="123 Main St, City, State"
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <Button 
                className="w-full" 
                onClick={() => createJob.mutate(formData)} 
                disabled={!formData.customer_id || !formData.scheduled_date || !formData.scheduled_time_start || createJob.isPending}
              >
                {createJob.isPending ? 'Scheduling...' : 'Schedule Job'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unified Calendar */}
      <UnifiedModuleCalendar
        moduleType="power_washing"
        onAddEvent={() => setIsDialogOpen(true)}
      />
    </div>
  );
}
