import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CalendarDays, 
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { UnifiedModuleCalendar } from '@/components/calendar/UnifiedModuleCalendar';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const APPOINTMENT_TYPES = ['Repair Drop-off', 'Pickup', 'Consultation', 'Estimate', 'Cleaning', 'Custom Work', 'Transfer'];

export default function GunsmithAppointments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    appointment_date: '',
    appointment_time: '',
    appointment_type: '',
    duration_minutes: '60',
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

  const createAppointment = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await (supabase as any)
        .from('gunsmith_appointments')
        .insert({
          customer_id: data.customer_id,
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          appointment_type: data.appointment_type,
          duration_minutes: parseInt(data.duration_minutes),
          notes: data.notes || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-appointments'] });
      toast({ title: 'Appointment scheduled' });
      setIsDialogOpen(false);
      setFormData({ customer_id: '', appointment_date: '', appointment_time: '', appointment_type: '', duration_minutes: '60', notes: '' });
    },
    onError: () => {
      toast({ title: 'Failed to schedule appointment', variant: 'destructive' });
    }
  });

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Schedule"
        subtitle="Manage appointments and service schedules"
        icon={<CalendarDays className="h-6 w-6 md:h-7 md:w-7 text-amber-500 shrink-0" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto" size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New </span>Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" value={formData.appointment_date} onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Time *</Label>
                    <Input type="time" value={formData.appointment_time} onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type *</Label>
                    <Select value={formData.appointment_type} onValueChange={(v) => setFormData({ ...formData, appointment_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Select value={formData.duration_minutes} onValueChange={(v) => setFormData({ ...formData, duration_minutes: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 min</SelectItem>
                        <SelectItem value="30">30 min</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="90">1.5 hours</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createAppointment.mutate(formData)} 
                  disabled={!formData.customer_id || !formData.appointment_date || !formData.appointment_time || !formData.appointment_type || createAppointment.isPending}
                >
                  {createAppointment.isPending ? 'Scheduling...' : 'Schedule Appointment'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Unified Calendar */}
      <UnifiedModuleCalendar
        moduleType="gunsmith"
        onAddEvent={() => setIsDialogOpen(true)}
      />
    </MobilePageContainer>
  );
}