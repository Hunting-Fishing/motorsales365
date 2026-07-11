import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Calendar, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGunsmithFirearms } from '@/hooks/useGunsmith';
import { useToast } from '@/hooks/use-toast';

const APPOINTMENT_TYPES = ['Consultation', 'Drop-off', 'Pickup', 'Estimate', 'Repair', 'Cleaning', 'Custom Work'];
const DURATIONS = [
  { value: '15', label: '15 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' }
];

export default function GunsmithAppointmentForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  const [formData, setFormData] = useState({
    customer_id: '',
    firearm_id: '',
    appointment_type: '',
    appointment_date: '',
    appointment_time: '',
    duration_minutes: '30',
    notes: ''
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: customerFirearms } = useGunsmithFirearms(selectedCustomerId || undefined);

  const createAppointment = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await (supabase as any)
        .from('gunsmith_appointments')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-stats'] });
      toast({ title: 'Appointment scheduled' });
      navigate('/gunsmith/appointments');
    },
    onError: () => {
      toast({ title: 'Failed to create appointment', variant: 'destructive' });
    }
  });

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFormData({ ...formData, customer_id: customerId, firearm_id: '' });
  };

  const handleSubmit = () => {
    const appointmentDateTime = `${formData.appointment_date}T${formData.appointment_time}:00`;
    
    createAppointment.mutate({
      customer_id: formData.customer_id || null,
      firearm_id: formData.firearm_id || null,
      appointment_type: formData.appointment_type,
      appointment_date: appointmentDateTime,
      duration_minutes: parseInt(formData.duration_minutes),
      notes: formData.notes || null,
      status: 'scheduled'
    });
  };

  const isValid = formData.appointment_type && formData.appointment_date && formData.appointment_time;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/appointments')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Calendar className="h-8 w-8 text-amber-600" />
              New Appointment
            </h1>
            <p className="text-muted-foreground mt-1">Schedule a new appointment</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer (Optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name} - {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomerId && customerFirearms && customerFirearms.length > 0 && (
                <div>
                  <Label>Firearm</Label>
                  <Select value={formData.firearm_id} onValueChange={(v) => setFormData({ ...formData, firearm_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select firearm (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerFirearms.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.make} {f.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Appointment Type *</Label>
                <Select value={formData.appointment_type} onValueChange={(v) => setFormData({ ...formData, appointment_type: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPOINTMENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.appointment_date}
                    onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <Label>Time *</Label>
                  <Input
                    type="time"
                    value={formData.appointment_time}
                    onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Duration</Label>
                <Select value={formData.duration_minutes} onValueChange={(v) => setFormData({ ...formData, duration_minutes: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/gunsmith/appointments')}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createAppointment.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createAppointment.isPending ? 'Scheduling...' : 'Schedule Appointment'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
