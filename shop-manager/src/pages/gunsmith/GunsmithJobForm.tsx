import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Crosshair, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateGunsmithJob, useGunsmithFirearms } from '@/hooks/useGunsmith';
import GunsmithJobTypeSelect, { insertCustomJobType } from '@/components/gunsmith/GunsmithJobTypeSelect';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'rush', label: 'Rush' }
];

export default function GunsmithJobForm() {
  const navigate = useNavigate();
  const createJob = useCreateGunsmithJob();
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customJobType, setCustomJobType] = useState('');
  
  const [formData, setFormData] = useState({
    customer_id: '',
    firearm_id: '',
    job_type: '',
    priority: 'normal',
    description: '',
    diagnosis: '',
    labor_rate: '75',
    estimated_completion: '',
    notes: ''
  });

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const { data: customerFirearms } = useGunsmithFirearms(selectedCustomerId || undefined);

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setFormData({ ...formData, customer_id: customerId, firearm_id: '' });
  };

  const handleSubmit = async () => {
    // Determine the final job type
    let finalJobType = formData.job_type;
    
    // If "Other" is selected and custom value provided, use that and add to database
    if (formData.job_type === 'Other' && customJobType.trim()) {
      finalJobType = customJobType.trim();
      // Insert the custom job type to the database for future use
      await insertCustomJobType(finalJobType);
    }

    createJob.mutate({
      customer_id: formData.customer_id || undefined,
      firearm_id: formData.firearm_id || undefined,
      job_type: finalJobType,
      priority: formData.priority,
      description: formData.description || undefined,
      diagnosis: formData.diagnosis || undefined,
      labor_rate: formData.labor_rate ? parseFloat(formData.labor_rate) : undefined,
      estimated_completion: formData.estimated_completion || undefined,
      notes: formData.notes || undefined,
      status: 'pending',
      received_date: new Date().toISOString().split('T')[0]
    }, {
      onSuccess: () => navigate('/gunsmith/jobs')
    });
  };

  const selectedCustomer = customers?.find(c => c.id === selectedCustomerId);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/jobs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Crosshair className="h-8 w-8 text-amber-600" />
              New Job
            </h1>
            <p className="text-muted-foreground mt-1">Create a new repair or service job</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Customer & Firearm</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <Select value={formData.customer_id} onValueChange={handleCustomerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCustomer.phone} - {selectedCustomer.email}
                  </p>
                )}
              </div>

              {selectedCustomerId && (
                <div>
                  <Label>Firearm</Label>
                  <Select 
                    value={formData.firearm_id} 
                    onValueChange={(v) => setFormData({ ...formData, firearm_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select firearm (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerFirearms?.map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.make} {f.model} {f.serial_number && `(S/N: ${f.serial_number})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customerFirearms?.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No firearms registered for this customer. 
                      <Button 
                        variant="link" 
                        className="p-0 h-auto" 
                        onClick={() => navigate('/gunsmith/firearms')}
                      >
                        Register one
                      </Button>
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <GunsmithJobTypeSelect
                  value={formData.job_type}
                  customValue={customJobType}
                  onValueChange={(v) => setFormData({ ...formData, job_type: v })}
                  onCustomValueChange={setCustomJobType}
                />
                <div>
                  <Label>Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(v) => setFormData({ ...formData, priority: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the work to be done..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Initial Diagnosis</Label>
                <Textarea
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="Initial findings or assessment..."
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Labor Rate ($/hr)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.labor_rate}
                    onChange={(e) => setFormData({ ...formData, labor_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Estimated Completion</Label>
                  <Input
                    type="date"
                    value={formData.estimated_completion}
                    onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Internal Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes for internal use..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => navigate('/gunsmith/jobs')}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.job_type || (formData.job_type === 'Other' && !customJobType.trim()) || createJob.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {createJob.isPending ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
