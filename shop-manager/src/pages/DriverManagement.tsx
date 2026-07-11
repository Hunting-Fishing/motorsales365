import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDriverManagement, DriverProfile } from '@/hooks/useDriverManagement';
import { Plus, Search, User, AlertTriangle, Clock, Shield, Calendar } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';

export default function DriverManagement() {
  const { drivers, isLoading, createDriver, updateDriver } = useDriverManagement();
  const [search, setSearch] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const filteredDrivers = drivers.filter(d => {
    const name = `${d.staff?.first_name || ''} ${d.staff?.last_name || ''}`.toLowerCase();
    return name.includes(search.toLowerCase()) || 
           d.license_number?.toLowerCase().includes(search.toLowerCase());
  });

  const getExpiryStatus = (date: string | null) => {
    if (!date) return null;
    const days = differenceInDays(parseISO(date), new Date());
    if (days < 0) return { label: 'Expired', variant: 'destructive' as const };
    if (days <= 30) return { label: `${days}d`, variant: 'destructive' as const };
    if (days <= 90) return { label: `${days}d`, variant: 'secondary' as const };
    return { label: 'Valid', variant: 'outline' as const };
  };

  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.is_active).length,
    expiringLicense: drivers.filter(d => {
      if (!d.license_expiry) return false;
      const days = differenceInDays(parseISO(d.license_expiry), new Date());
      return days >= 0 && days <= 30;
    }).length,
    expiringMedical: drivers.filter(d => {
      if (!d.medical_card_expiry) return false;
      const days = differenceInDays(parseISO(d.medical_card_expiry), new Date());
      return days >= 0 && days <= 30;
    }).length,
  };

  return (
    <>
      <Helmet>
        <title>Driver Management | Fleet Operations</title>
      </Helmet>

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Driver Management</h1>
            <p className="text-muted-foreground">Manage driver profiles, licenses, and compliance</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" /> Add Driver</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Driver Profile</DialogTitle>
              </DialogHeader>
              <AddDriverForm onSuccess={() => setIsAddDialogOpen(false)} createDriver={createDriver} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><User className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Drivers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg"><Shield className="h-5 w-5 text-green-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.expiringLicense}</p>
                  <p className="text-xs text-muted-foreground">License Expiring</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/10 rounded-lg"><Calendar className="h-5 w-5 text-red-500" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.expiringMedical}</p>
                  <p className="text-xs text-muted-foreground">Medical Expiring</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="drivers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="drivers">Drivers</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="hos">Hours of Service</TabsTrigger>
            <TabsTrigger value="safety">Safety Scores</TabsTrigger>
          </TabsList>

          <TabsContent value="drivers" className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search drivers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading drivers...</div>
            ) : filteredDrivers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-semibold mb-2">No drivers found</h3>
                  <p className="text-sm text-muted-foreground">Add your first driver to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredDrivers.map((driver) => (
                  <DriverCard key={driver.id} driver={driver} getExpiryStatus={getExpiryStatus} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="compliance">
            <Card>
              <CardHeader>
                <CardTitle>License & Medical Compliance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {drivers.filter(d => d.is_active).map((driver) => (
                    <div key={driver.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{driver.staff?.first_name} {driver.staff?.last_name}</p>
                        <p className="text-sm text-muted-foreground">{driver.license_class} - {driver.license_number}</p>
                      </div>
                      <div className="flex gap-2">
                        {driver.license_expiry && (
                          <Badge variant={getExpiryStatus(driver.license_expiry)?.variant}>
                            License: {getExpiryStatus(driver.license_expiry)?.label}
                          </Badge>
                        )}
                        {driver.medical_card_expiry && (
                          <Badge variant={getExpiryStatus(driver.medical_card_expiry)?.variant}>
                            Medical: {getExpiryStatus(driver.medical_card_expiry)?.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hos">
            <Card>
              <CardHeader>
                <CardTitle>Hours of Service Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>HOS tracking will display driver hours compliance here</p>
                  <p className="text-sm">Select a driver to view their HOS logs</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="safety">
            <Card>
              <CardHeader>
                <CardTitle>Driver Safety Scores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Safety scores track driver performance metrics</p>
                  <p className="text-sm">Speeding, hard braking, and accident tracking</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function DriverCard({ driver, getExpiryStatus }: { driver: DriverProfile; getExpiryStatus: (date: string | null) => { label: string; variant: 'destructive' | 'secondary' | 'outline' } | null }) {
  const licenseStatus = getExpiryStatus(driver.license_expiry);
  const medicalStatus = getExpiryStatus(driver.medical_card_expiry);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{driver.staff?.first_name} {driver.staff?.last_name}</h3>
                <Badge variant={driver.is_active ? 'default' : 'secondary'}>
                  {driver.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {driver.license_class} - {driver.license_number || 'No license'}
              </p>
              {driver.endorsements && driver.endorsements.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {(driver.endorsements as string[]).map((e, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {licenseStatus && (
              <Badge variant={licenseStatus.variant} className="text-xs">
                License: {licenseStatus.label}
              </Badge>
            )}
            {medicalStatus && (
              <Badge variant={medicalStatus.variant} className="text-xs">
                Medical: {medicalStatus.label}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddDriverForm({ onSuccess, createDriver }: { onSuccess: () => void; createDriver: any }) {
  const [formData, setFormData] = useState({
    license_number: '',
    license_class: '',
    license_state: '',
    license_expiry: '',
    medical_card_expiry: '',
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDriver.mutate(formData, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>License Number</Label>
          <Input
            value={formData.license_number}
            onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
            placeholder="DL123456"
          />
        </div>
        <div>
          <Label>License Class</Label>
          <Input
            value={formData.license_class}
            onChange={(e) => setFormData({ ...formData, license_class: e.target.value })}
            placeholder="CDL-A"
          />
        </div>
        <div>
          <Label>License State</Label>
          <Input
            value={formData.license_state}
            onChange={(e) => setFormData({ ...formData, license_state: e.target.value })}
            placeholder="BC"
          />
        </div>
        <div>
          <Label>License Expiry</Label>
          <Input
            type="date"
            value={formData.license_expiry}
            onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
          />
        </div>
        <div className="col-span-2">
          <Label>Medical Card Expiry</Label>
          <Input
            type="date"
            value={formData.medical_card_expiry}
            onChange={(e) => setFormData({ ...formData, medical_card_expiry: e.target.value })}
          />
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={createDriver.isPending}>
        {createDriver.isPending ? 'Creating...' : 'Create Driver Profile'}
      </Button>
    </form>
  );
}
