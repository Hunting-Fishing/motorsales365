import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HardHat, Plus, Users, AlertTriangle, CheckCircle, Clock, Building, Phone, Mail, Star } from 'lucide-react';
import { useContractorSafety, SafetyContractor } from '@/hooks/useContractorSafety';
import { format } from 'date-fns';

const statusColors = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-green-500/10 text-green-500',
  expired: 'bg-red-500/10 text-red-500',
  suspended: 'bg-gray-500/10 text-gray-500',
};

export default function SafetyContractors() {
  const { contractors, siteAccess, isLoading, approvedCount, expiredCount, pendingCount, createContractor, logSiteAccess } = useContractorSafety();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<SafetyContractor>>({});
  const [checkInData, setCheckInData] = useState<{ contractor_id: string; work_area: string; work_description: string }>({ contractor_id: '', work_area: '', work_description: '' });

  const handleCreate = () => {
    createContractor.mutate(formData);
    setDialogOpen(false);
    setFormData({});
  };

  const handleCheckIn = () => {
    logSiteAccess.mutate({
      contractor_id: checkInData.contractor_id,
      access_date: new Date().toISOString().split('T')[0],
      check_in_time: new Date().toISOString(),
      work_area: checkInData.work_area,
      work_description: checkInData.work_description,
      safety_briefing_completed: true,
      ppe_verified: true,
    });
    setCheckInOpen(false);
    setCheckInData({ contractor_id: '', work_area: '', work_description: '' });
  };

  return (
    <>
      <Helmet>
        <title>Contractor Safety | Safety Management</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <HardHat className="h-8 w-8 text-primary" />
              Contractor Safety
            </h1>
            <p className="text-muted-foreground mt-1">Manage contractor compliance and site access</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Clock className="h-4 w-4 mr-2" />Check In</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Contractor Check-In</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Contractor</Label>
                    <Select value={checkInData.contractor_id} onValueChange={(v) => setCheckInData({ ...checkInData, contractor_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select contractor" /></SelectTrigger>
                      <SelectContent>
                        {contractors.filter(c => c.status === 'approved').map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Work Area</Label>
                    <Input value={checkInData.work_area} onChange={(e) => setCheckInData({ ...checkInData, work_area: e.target.value })} />
                  </div>
                  <div>
                    <Label>Work Description</Label>
                    <Input value={checkInData.work_description} onChange={(e) => setCheckInData({ ...checkInData, work_description: e.target.value })} />
                  </div>
                  <Button onClick={handleCheckIn} className="w-full">Check In Contractor</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Add Contractor</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>Add Contractor</DialogTitle></DialogHeader>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                  <div>
                    <Label>Company Name *</Label>
                    <Input value={formData.company_name || ''} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Contact Name</Label>
                      <Input value={formData.contact_name || ''} onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Trade Type</Label>
                      <Input value={formData.trade_type || ''} onChange={(e) => setFormData({ ...formData, trade_type: e.target.value })} placeholder="e.g., Electrical, HVAC" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formData.contact_email || ''} onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={formData.contact_phone || ''} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Insurance Provider</Label>
                      <Input value={formData.insurance_provider || ''} onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })} />
                    </div>
                    <div>
                      <Label>Insurance Expiry</Label>
                      <Input type="date" value={formData.insurance_expiry || ''} onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Workers Comp Expiry</Label>
                    <Input type="date" value={formData.workers_comp_expiry || ''} onChange={(e) => setFormData({ ...formData, workers_comp_expiry: e.target.value })} />
                  </div>
                  <Button onClick={handleCreate} className="w-full" disabled={!formData.company_name}>Add Contractor</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contractors.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="contractors" className="space-y-4">
          <TabsList>
            <TabsTrigger value="contractors">Contractors</TabsTrigger>
            <TabsTrigger value="access">Site Access Log</TabsTrigger>
          </TabsList>

          <TabsContent value="contractors" className="space-y-4">
            {isLoading ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
            ) : contractors.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No contractors added yet</CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contractors.map(contractor => (
                  <Card key={contractor.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Building className="h-5 w-5 text-muted-foreground" />
                          <CardTitle className="text-base">{contractor.company_name}</CardTitle>
                        </div>
                        <Badge className={statusColors[contractor.status]}>{contractor.status}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {contractor.trade_type && (
                        <p className="text-sm text-muted-foreground">{contractor.trade_type}</p>
                      )}
                      {contractor.contact_name && (
                        <p className="text-sm flex items-center gap-2">
                          <Users className="h-3 w-3" />{contractor.contact_name}
                        </p>
                      )}
                      {contractor.contact_email && (
                        <p className="text-sm flex items-center gap-2">
                          <Mail className="h-3 w-3" />{contractor.contact_email}
                        </p>
                      )}
                      {contractor.contact_phone && (
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-3 w-3" />{contractor.contact_phone}
                        </p>
                      )}
                      {contractor.insurance_expiry && (
                        <p className="text-xs text-muted-foreground">
                          Insurance expires: {format(new Date(contractor.insurance_expiry), 'MMM d, yyyy')}
                        </p>
                      )}
                      {contractor.safety_rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < contractor.safety_rating! ? 'text-yellow-500 fill-yellow-500' : 'text-muted'}`} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            {siteAccess.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No site access logged</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {siteAccess.map(access => (
                  <Card key={access.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{access.contractor?.company_name || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{access.work_area} - {access.work_description}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p>{format(new Date(access.access_date), 'MMM d, yyyy')}</p>
                          {access.check_in_time && <p className="text-muted-foreground">In: {format(new Date(access.check_in_time), 'h:mm a')}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {access.safety_briefing_completed && <Badge variant="outline" className="text-xs">Safety Briefing ✓</Badge>}
                        {access.ppe_verified && <Badge variant="outline" className="text-xs">PPE Verified ✓</Badge>}
                        {access.jsa_completed && <Badge variant="outline" className="text-xs">JSA ✓</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
