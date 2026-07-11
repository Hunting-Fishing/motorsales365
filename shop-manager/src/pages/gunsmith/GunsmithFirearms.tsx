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
  Crosshair, 
  Plus, 
  Search,
  UserPlus
} from 'lucide-react';
import { useGunsmithFirearms, useCreateGunsmithFirearm } from '@/hooks/useGunsmith';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { QuickAddCustomerDialog } from '@/components/gunsmith/QuickAddCustomerDialog';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const FIREARM_TYPES = ['Rifle', 'Shotgun', 'Handgun', 'Revolver', 'Black Powder', 'Air Gun', 'Other'];
const CLASSIFICATIONS = [
  { value: 'non-restricted', label: 'Non-Restricted' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'prohibited', label: 'Prohibited' }
];

export default function GunsmithFirearms() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: '',
    make: '',
    model: '',
    serial_number: '',
    caliber: '',
    firearm_type: '',
    classification: 'non-restricted',
    barrel_length: '',
    registration_number: '',
    condition: '',
    notes: ''
  });
  
  const { data: firearms, isLoading } = useGunsmithFirearms();
  const createFirearm = useCreateGunsmithFirearm();

  const { data: customers, refetch: refetchCustomers } = useQuery({
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

  const handleCustomerCreated = (customerId: string) => {
    refetchCustomers();
    setFormData({ ...formData, customer_id: customerId });
  };

  const filteredFirearms = firearms?.filter(f => 
    f.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.caliber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      condition: formData.condition || undefined,
      notes: formData.notes || undefined
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          customer_id: '', make: '', model: '', serial_number: '', caliber: '',
          firearm_type: '', classification: 'non-restricted', barrel_length: '',
          registration_number: '', condition: '', notes: ''
        });
      }
    });
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case 'restricted': return 'bg-amber-500';
      case 'prohibited': return 'bg-red-500';
      default: return 'bg-green-500';
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Firearms Registry"
        subtitle="Customer firearm database"
        icon={<Crosshair className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full md:w-auto">
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                Register Firearm
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4">
              <DialogHeader>
                <DialogTitle>Register Firearm</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Customer *</Label>
                  <div className="flex gap-2">
                    <Select value={formData.customer_id} onValueChange={(v) => setFormData({ ...formData, customer_id: v })}>
                      <SelectTrigger className="flex-1">
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
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setIsAddCustomerOpen(true)}
                      className="shrink-0 border-amber-600/30 text-amber-600 hover:bg-amber-600/10"
                      title="Add new customer"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
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
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label>Serial Number</Label>
                    <Input
                      value={formData.serial_number}
                      onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Caliber</Label>
                    <Input
                      value={formData.caliber}
                      onChange={(e) => setFormData({ ...formData, caliber: e.target.value })}
                      placeholder="e.g., 12 Gauge"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label>Type *</Label>
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
                    <Label>Classification *</Label>
                    <Select value={formData.classification} onValueChange={(v) => setFormData({ ...formData, classification: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSIFICATIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <div>
                    <Label>Barrel Length (inches)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.barrel_length}
                      onChange={(e) => setFormData({ ...formData, barrel_length: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Registration Number</Label>
                    <Input
                      value={formData.registration_number}
                      onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                      placeholder="For restricted"
                    />
                  </div>
                </div>
                <div>
                  <Label>Condition</Label>
                  <Input
                    value={formData.condition}
                    onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                    placeholder="e.g., Excellent, Good, Fair"
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleSubmit}
                  disabled={!formData.customer_id || !formData.make || !formData.model || !formData.firearm_type || createFirearm.isPending}
                >
                  {createFirearm.isPending ? 'Registering...' : 'Register Firearm'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Search */}
      <div className="mb-4 md:mb-6 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by make, model, serial..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Firearms List */}
      <Card>
        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
          <CardTitle className="text-base md:text-lg">Registered Firearms</CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          {isLoading ? (
            <div className="space-y-2 md:space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-16 md:h-20 w-full" />)}
            </div>
          ) : filteredFirearms?.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <Crosshair className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-sm md:text-base">No firearms registered</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredFirearms?.map((firearm) => (
                <div 
                  key={firearm.id} 
                  className="p-3 md:p-4 bg-muted/50 rounded-lg"
                >
                  {/* Mobile: Stack layout */}
                  <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm md:text-base">{firearm.make} {firearm.model}</span>
                        <Badge className={`${getClassificationColor(firearm.classification)} text-white text-xs`}>
                          {firearm.classification}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{firearm.firearm_type}</Badge>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {firearm.customers?.first_name} {firearm.customers?.last_name}
                        {firearm.caliber && ` - ${firearm.caliber}`}
                      </p>
                      {firearm.serial_number && (
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          S/N: {firearm.serial_number}
                          {firearm.registration_number && ` - Reg: ${firearm.registration_number}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {firearm.condition && (
                        <Badge variant="secondary" className="text-xs">{firearm.condition}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Add Customer Dialog */}
      <QuickAddCustomerDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        onCustomerCreated={handleCustomerCreated}
      />
    </MobilePageContainer>
  );
}
