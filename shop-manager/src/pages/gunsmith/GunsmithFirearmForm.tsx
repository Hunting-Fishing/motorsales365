import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Crosshair, Save, User } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCreateGunsmithFirearm } from '@/hooks/useGunsmith';

const FIREARM_TYPES = ['Rifle', 'Shotgun', 'Handgun', 'Revolver', 'Semi-Auto', 'Bolt Action', 'Lever Action', 'Pump Action', 'Break Action', 'Other'];
const CLASSIFICATIONS = ['Non-Restricted', 'Restricted', 'Prohibited'];
const CONDITIONS = ['Excellent', 'Good', 'Fair', 'Poor', 'Non-Functional'];

export default function GunsmithFirearmForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer');
  const createFirearm = useCreateGunsmithFirearm();
  
  const [formData, setFormData] = useState({
    customer_id: preselectedCustomerId || '',
    make: '',
    model: '',
    serial_number: '',
    caliber: '',
    firearm_type: '',
    classification: 'Non-Restricted',
    barrel_length: '',
    registration_number: '',
    condition: 'Good',
    notes: ''
  });

  const handleBack = () => {
    if (preselectedCustomerId) {
      navigate(`/gunsmith/customers/${preselectedCustomerId}`);
    } else {
      navigate('/gunsmith/firearms');
    }
  };

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      return data;
    }
  });

  const handleSubmit = () => {
    createFirearm.mutate({
      customer_id: formData.customer_id,
      make: formData.make,
      model: formData.model,
      serial_number: formData.serial_number || undefined,
      caliber: formData.caliber || undefined,
      firearm_type: formData.firearm_type,
      classification: formData.classification,
      barrel_length: formData.barrel_length ? parseFloat(formData.barrel_length) : undefined,
      registration_number: formData.registration_number || undefined,
      condition: formData.condition,
      notes: formData.notes || undefined
    }, {
      onSuccess: () => handleBack()
    });
  };

  const isValid = formData.customer_id && formData.make && formData.model && formData.firearm_type;

  // Get preselected customer name for display
  const preselectedCustomer = preselectedCustomerId 
    ? customers?.find(c => c.id === preselectedCustomerId)
    : null;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Crosshair className="h-8 w-8 text-amber-600" />
              Register Firearm
            </h1>
            <p className="text-muted-foreground mt-1">
              {preselectedCustomer 
                ? `Adding firearm for ${preselectedCustomer.first_name} ${preselectedCustomer.last_name}`
                : 'Add a new firearm to the registry'}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label>Customer *</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Firearm Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Make *</Label>
                  <Input
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    placeholder="e.g., Remington"
                  />
                </div>
                <div>
                  <Label>Model *</Label>
                  <Input
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g., 870"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Serial Number</Label>
                  <Input
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="Enter serial number"
                  />
                </div>
                <div>
                  <Label>Caliber</Label>
                  <Input
                    value={formData.caliber}
                    onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                    placeholder="e.g., 12 Gauge, .308 Win"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Firearm Type *</Label>
                  <Select value={formData.firearm_type} onValueChange={(v) => setFormData({ ...formData, firearm_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {FIREARM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Classification</Label>
                  <Select value={formData.classification} onValueChange={(v) => setFormData({ ...formData, classification: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLASSIFICATIONS.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Barrel Length (inches)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.barrel_length}
                    onChange={(e) => setFormData({ ...formData, barrel_length: e.target.value })}
                    placeholder="e.g., 18.5"
                  />
                </div>
                <div>
                  <Label>Registration Number</Label>
                  <Input
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                    placeholder="Official registration number"
                  />
                </div>
              </div>

              <div>
                <Label>Condition</Label>
                <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes about this firearm..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={handleBack}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || createFirearm.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createFirearm.isPending ? 'Registering...' : 'Register Firearm'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
