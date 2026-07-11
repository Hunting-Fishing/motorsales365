import { useState } from 'react';
import { useContractorSafety, SafetyContractor } from '@/hooks/useContractorSafety';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Plus, AlertTriangle, Shield, FileCheck, Calendar, Phone, Mail } from 'lucide-react';
import { format } from 'date-fns';

export default function ContractorSafety() {
  const { contractors, siteAccess, isLoading, approvedCount, expiredCount, pendingCount, createContractor, updateContractor } = useContractorSafety();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SafetyContractor>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContractor.mutate(formData, {
      onSuccess: () => {
        setDialogOpen(false);
        setFormData({});
      },
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'expired': return 'bg-red-500';
      case 'suspended': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contractor Safety Management</h1>
          <p className="text-muted-foreground">Pre-qualification, insurance tracking, and site access</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Contractor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Contractor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={formData.company_name || ''}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Contact Name</Label>
                  <Input
                    value={formData.contact_name || ''}
                    onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input
                    type="email"
                    value={formData.contact_email || ''}
                    onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  <Input
                    value={formData.contact_phone || ''}
                    onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Trade Type</Label>
                  <Input
                    value={formData.trade_type || ''}
                    onChange={e => setFormData({ ...formData, trade_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Insurance Provider</Label>
                  <Input
                    value={formData.insurance_provider || ''}
                    onChange={e => setFormData({ ...formData, insurance_provider: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Insurance Expiry</Label>
                  <Input
                    type="date"
                    value={formData.insurance_expiry || ''}
                    onChange={e => setFormData({ ...formData, insurance_expiry: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Workers Comp Expiry</Label>
                  <Input
                    type="date"
                    value={formData.workers_comp_expiry || ''}
                    onChange={e => setFormData({ ...formData, workers_comp_expiry: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Input
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createContractor.isPending}>Save Contractor</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contractors.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Shield className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <FileCheck className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contractors">
        <TabsList>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="site-access">Site Access Log</TabsTrigger>
        </TabsList>

        <TabsContent value="contractors" className="space-y-4">
          {contractors.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No contractors added yet</p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add First Contractor
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {contractors.map(contractor => (
                <Card key={contractor.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{contractor.company_name}</CardTitle>
                      <Badge className={getStatusColor(contractor.status)}>
                        {contractor.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {contractor.trade_type && (
                      <p className="text-sm font-medium text-muted-foreground">{contractor.trade_type}</p>
                    )}
                    {contractor.contact_name && (
                      <p className="text-sm text-muted-foreground">{contractor.contact_name}</p>
                    )}
                    {contractor.contact_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {contractor.contact_email}
                      </div>
                    )}
                    {contractor.contact_phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        {contractor.contact_phone}
                      </div>
                    )}
                    {contractor.insurance_expiry && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3 w-3" />
                        Insurance expires: {format(new Date(contractor.insurance_expiry), 'MMM d, yyyy')}
                      </div>
                    )}
                    {contractor.safety_rating !== null && (
                      <p className="text-sm">
                        Safety Rating: {contractor.safety_rating}/5
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="site-access">
          <Card>
            <CardHeader>
              <CardTitle>Recent Site Access</CardTitle>
            </CardHeader>
            <CardContent>
              {siteAccess.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No site access logs recorded</p>
              ) : (
                <div className="space-y-2">
                  {siteAccess.map(access => (
                    <div key={access.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{access.contractor?.company_name || 'Unknown Contractor'}</p>
                        <p className="text-sm text-muted-foreground">
                          {access.work_area} - {access.work_description}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{format(new Date(access.access_date), 'MMM d, yyyy')}</p>
                        <div className="flex gap-1 mt-1">
                          {access.safety_briefing_completed && <Badge variant="outline" className="text-xs">Briefed</Badge>}
                          {access.ppe_verified && <Badge variant="outline" className="text-xs">PPE</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
