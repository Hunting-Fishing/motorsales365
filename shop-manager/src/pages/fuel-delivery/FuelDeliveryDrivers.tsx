import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Search, Users, ArrowLeft, AlertTriangle, MapPin } from 'lucide-react';
import { useFuelDeliveryDrivers, useCreateFuelDeliveryDriver } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isBefore, addDays } from 'date-fns';
import { LicenseClassSelect, getJurisdiction } from '@/components/fuel-delivery/LicenseClassSelect';
import { AddressAutocomplete, AddressResult } from '@/components/fuel-delivery/AddressAutocomplete';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';

export default function FuelDeliveryDrivers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { data: drivers, isLoading } = useFuelDeliveryDrivers();
  const createDriver = useCreateFuelDeliveryDriver();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    driver_number: '',
    cdl_number: '',
    cdl_class: '',
    cdl_state: '',
    cdl_expiry: '',
    hazmat_endorsement: false,
    hazmat_expiry: '',
    tanker_endorsement: false,
    medical_card_expiry: '',
    hire_date: '',
    hourly_rate: '',
    status: 'active',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    notes: '',
    home_address: '',
    home_latitude: null as number | null,
    home_longitude: null as number | null
  });

  const handleHomeAddressSelect = (result: AddressResult) => {
    setFormData(prev => ({
      ...prev,
      home_address: result.address,
      home_longitude: result.coordinates[0],
      home_latitude: result.coordinates[1],
    }));
  };

  const filteredDrivers = drivers?.filter(driver =>
    driver.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    driver.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    driver.driver_number?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDriver.mutateAsync({
      ...formData,
      hourly_rate: parseFloat(formData.hourly_rate) || undefined,
      cdl_expiry: formData.cdl_expiry || undefined,
      hazmat_expiry: formData.hazmat_expiry || undefined,
      medical_card_expiry: formData.medical_card_expiry || undefined,
      hire_date: formData.hire_date || undefined,
      home_address: formData.home_address || undefined,
      home_latitude: formData.home_latitude || undefined,
      home_longitude: formData.home_longitude || undefined
    });
    setIsDialogOpen(false);
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      driver_number: '',
      cdl_number: '',
      cdl_class: '',
      cdl_state: '',
      cdl_expiry: '',
      hazmat_endorsement: false,
      hazmat_expiry: '',
      tanker_endorsement: false,
      medical_card_expiry: '',
      hire_date: '',
      hourly_rate: '',
      status: 'active',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      notes: '',
      home_address: '',
      home_latitude: null,
      home_longitude: null
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500">Active</Badge>;
      case 'on_leave': return <Badge className="bg-amber-500">On Leave</Badge>;
      case 'inactive': return <Badge variant="outline">Inactive</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isExpiringSoon = (date?: string) => {
    if (!date) return false;
    return isBefore(new Date(date), addDays(new Date(), 30));
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
              <Users className="h-8 w-8 text-green-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Drivers
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage drivers and certifications
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Driver</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      value={formData.first_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      value={formData.last_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                      placeholder="Smith"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Driver Number</Label>
                    <Input
                      value={formData.driver_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, driver_number: e.target.value }))}
                      placeholder="DRV-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CDL Number</Label>
                    <Input
                      value={formData.cdl_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, cdl_number: e.target.value }))}
                      placeholder="CDL12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CDL State/Province</Label>
                    <Input
                      value={formData.cdl_state}
                      onChange={(e) => {
                        const newState = e.target.value.toUpperCase();
                        setFormData(prev => ({ 
                          ...prev, 
                          cdl_state: newState,
                          // Reset CDL class when jurisdiction changes
                          cdl_class: getJurisdiction(newState) !== getJurisdiction(prev.cdl_state) ? '' : prev.cdl_class
                        }));
                      }}
                      placeholder="e.g. BC, TX, ON"
                      maxLength={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter 2-letter code (e.g., BC, AB, TX, CA)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>License Class</Label>
                    <LicenseClassSelect
                      value={formData.cdl_class}
                      onChange={(v) => setFormData(prev => ({ ...prev, cdl_class: v }))}
                      stateProvince={formData.cdl_state}
                      placeholder="Select license class"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CDL Expiry</Label>
                    <Input
                      type="date"
                      value={formData.cdl_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, cdl_expiry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Medical Card Expiry</Label>
                    <Input
                      type="date"
                      value={formData.medical_card_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, medical_card_expiry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Hazmat Endorsement</Label>
                      <Switch
                        checked={formData.hazmat_endorsement}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, hazmat_endorsement: v }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tanker Endorsement</Label>
                      <Switch
                        checked={formData.tanker_endorsement}
                        onCheckedChange={(v) => setFormData(prev => ({ ...prev, tanker_endorsement: v }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Hourly Rate</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: e.target.value }))}
                      placeholder="25.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                    />
                  </div>

                  {/* Home Base Location */}
                  <div className="col-span-2 border-t pt-4 mt-2">
                    <h3 className="font-medium text-sm mb-3 flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      Home Base Location
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      Used as the starting point for route optimization
                    </p>
                    <div className="space-y-2">
                      <Label>Home Address</Label>
                      <AddressAutocomplete
                        value={formData.home_address}
                        onChange={(address) => setFormData(prev => ({ ...prev, home_address: address }))}
                        onSelect={handleHomeAddressSelect}
                        placeholder="Enter driver's home address..."
                      />
                      {formData.home_latitude && formData.home_longitude && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                          Coordinates captured: {formData.home_latitude.toFixed(4)}, {formData.home_longitude.toFixed(4)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDriver.isPending}>
                    {createDriver.isPending ? 'Creating...' : 'Add Driver'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drivers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredDrivers && filteredDrivers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Driver</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>CDL</TableHead>
                  <TableHead>Endorsements</TableHead>
                  <TableHead>CDL Expiry</TableHead>
                  <TableHead>Medical Card</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{driver.first_name} {driver.last_name}</TableCell>
                    <TableCell>{driver.driver_number || '-'}</TableCell>
                    <TableCell>{driver.cdl_number || '-'} ({driver.cdl_class || '-'})</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {driver.hazmat_endorsement && <Badge variant="outline" className="text-xs">HAZMAT</Badge>}
                        {driver.tanker_endorsement && <Badge variant="outline" className="text-xs">TANKER</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {driver.cdl_expiry ? format(new Date(driver.cdl_expiry), 'MMM d, yyyy') : '-'}
                        {isExpiringSoon(driver.cdl_expiry) && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {driver.medical_card_expiry ? format(new Date(driver.medical_card_expiry), 'MMM d, yyyy') : '-'}
                        {isExpiringSoon(driver.medical_card_expiry) && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(driver.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No drivers found</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Add your first driver
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
