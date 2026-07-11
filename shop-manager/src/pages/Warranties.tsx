import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWarranties } from '@/hooks/useWarranties';
import { Shield, FileText, AlertTriangle, Clock, Plus, DollarSign, CheckCircle, XCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

export default function Warranties() {
  const {
    assetWarranties,
    partWarranties,
    warrantyClaims,
    warrantyStats,
    isLoading,
    createAssetWarranty,
    createPartWarranty,
    createWarrantyClaim,
    updateWarrantyClaim
  } = useWarranties();

  const [isWarrantyDialogOpen, setIsWarrantyDialogOpen] = useState(false);
  const [isPartWarrantyDialogOpen, setIsPartWarrantyDialogOpen] = useState(false);
  const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);

  const [newWarranty, setNewWarranty] = useState({
    warranty_name: '',
    warranty_type: 'manufacturer' as const,
    manufacturer: '',
    policy_number: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    coverage_description: '',
    contact_phone: ''
  });

  const [newPartWarranty, setNewPartWarranty] = useState({
    part_name: '',
    part_number: '',
    manufacturer: '',
    installed_date: format(new Date(), 'yyyy-MM-dd'),
    warranty_months: '',
    purchase_price: ''
  });

  const [newClaim, setNewClaim] = useState({
    asset_warranty_id: '',
    issue_description: '',
    amount_claimed: '',
    failure_date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleCreateWarranty = () => {
    createAssetWarranty.mutate({
      warranty_name: newWarranty.warranty_name,
      warranty_type: newWarranty.warranty_type,
      manufacturer: newWarranty.manufacturer || undefined,
      policy_number: newWarranty.policy_number || undefined,
      start_date: newWarranty.start_date,
      end_date: newWarranty.end_date,
      coverage_description: newWarranty.coverage_description || undefined,
      contact_phone: newWarranty.contact_phone || undefined,
      is_active: true
    }, {
      onSuccess: () => {
        setIsWarrantyDialogOpen(false);
        setNewWarranty({
          warranty_name: '',
          warranty_type: 'manufacturer',
          manufacturer: '',
          policy_number: '',
          start_date: format(new Date(), 'yyyy-MM-dd'),
          end_date: '',
          coverage_description: '',
          contact_phone: ''
        });
      }
    });
  };

  const handleCreatePartWarranty = () => {
    const months = parseInt(newPartWarranty.warranty_months) || 12;
    const installedDate = new Date(newPartWarranty.installed_date);
    const expiryDate = new Date(installedDate);
    expiryDate.setMonth(expiryDate.getMonth() + months);

    createPartWarranty.mutate({
      part_name: newPartWarranty.part_name,
      part_number: newPartWarranty.part_number || undefined,
      manufacturer: newPartWarranty.manufacturer || undefined,
      installed_date: newPartWarranty.installed_date,
      warranty_months: months,
      expiry_date: format(expiryDate, 'yyyy-MM-dd'),
      purchase_price: newPartWarranty.purchase_price ? parseFloat(newPartWarranty.purchase_price) : undefined,
      status: 'active'
    }, {
      onSuccess: () => {
        setIsPartWarrantyDialogOpen(false);
        setNewPartWarranty({
          part_name: '',
          part_number: '',
          manufacturer: '',
          installed_date: format(new Date(), 'yyyy-MM-dd'),
          warranty_months: '',
          purchase_price: ''
        });
      }
    });
  };

  const handleCreateClaim = () => {
    createWarrantyClaim.mutate({
      asset_warranty_id: newClaim.asset_warranty_id,
      issue_description: newClaim.issue_description,
      amount_claimed: parseFloat(newClaim.amount_claimed),
      failure_date: newClaim.failure_date,
      claim_date: format(new Date(), 'yyyy-MM-dd'),
      status: 'draft'
    }, {
      onSuccess: () => {
        setIsClaimDialogOpen(false);
        setNewClaim({
          asset_warranty_id: '',
          issue_description: '',
          amount_claimed: '',
          failure_date: format(new Date(), 'yyyy-MM-dd')
        });
      }
    });
  };

  const getExpiryBadge = (endDate: string) => {
    const daysUntilExpiry = differenceInDays(new Date(endDate), new Date());
    if (daysUntilExpiry < 0) return <Badge variant="destructive">Expired</Badge>;
    if (daysUntilExpiry <= 30) return <Badge variant="destructive">Expires in {daysUntilExpiry} days</Badge>;
    if (daysUntilExpiry <= 60) return <Badge className="bg-orange-500">Expires in {daysUntilExpiry} days</Badge>;
    if (daysUntilExpiry <= 90) return <Badge className="bg-yellow-500">Expires in {daysUntilExpiry} days</Badge>;
    return <Badge variant="secondary">{daysUntilExpiry} days remaining</Badge>;
  };

  const getClaimStatusBadge = (status: string) => {
    switch (status) {
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'submitted': return <Badge variant="outline">Submitted</Badge>;
      case 'under_review': return <Badge className="bg-blue-500">Under Review</Badge>;
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'partially_approved': return <Badge className="bg-yellow-500">Partial</Badge>;
      case 'denied': return <Badge variant="destructive">Denied</Badge>;
      case 'paid': return <Badge className="bg-green-600">Paid</Badge>;
      case 'closed': return <Badge variant="secondary">Closed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Warranty Tracking</h1>
          <p className="text-muted-foreground">Manage warranties and track claims</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isWarrantyDialogOpen} onOpenChange={setIsWarrantyDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Warranty
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Asset Warranty</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Warranty Name *</Label>
                  <Input
                    placeholder="e.g., Engine Warranty"
                    value={newWarranty.warranty_name}
                    onChange={(e) => setNewWarranty({ ...newWarranty, warranty_name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Warranty Type *</Label>
                    <Select value={newWarranty.warranty_type} onValueChange={(v: any) => setNewWarranty({ ...newWarranty, warranty_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manufacturer">Manufacturer</SelectItem>
                        <SelectItem value="extended">Extended</SelectItem>
                        <SelectItem value="powertrain">Powertrain</SelectItem>
                        <SelectItem value="bumper_to_bumper">Bumper to Bumper</SelectItem>
                        <SelectItem value="parts">Parts Only</SelectItem>
                        <SelectItem value="labor">Labor Only</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Manufacturer</Label>
                    <Input
                      placeholder="Manufacturer name"
                      value={newWarranty.manufacturer}
                      onChange={(e) => setNewWarranty({ ...newWarranty, manufacturer: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Policy Number</Label>
                  <Input
                    placeholder="Policy or contract number"
                    value={newWarranty.policy_number}
                    onChange={(e) => setNewWarranty({ ...newWarranty, policy_number: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={newWarranty.start_date}
                      onChange={(e) => setNewWarranty({ ...newWarranty, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={newWarranty.end_date}
                      onChange={(e) => setNewWarranty({ ...newWarranty, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Coverage Description</Label>
                  <Textarea
                    placeholder="Describe what's covered..."
                    value={newWarranty.coverage_description}
                    onChange={(e) => setNewWarranty({ ...newWarranty, coverage_description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Claims Phone</Label>
                  <Input
                    placeholder="Phone number for claims"
                    value={newWarranty.contact_phone}
                    onChange={(e) => setNewWarranty({ ...newWarranty, contact_phone: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateWarranty} className="w-full" disabled={!newWarranty.warranty_name || !newWarranty.end_date}>
                  Add Warranty
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Warranties</p>
                <p className="text-2xl font-bold">{warrantyStats.activeAssetWarranties + warrantyStats.activePartWarranties}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon (30d)</p>
                <p className="text-2xl font-bold">{warrantyStats.expiringSoon30}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Claims</p>
                <p className="text-2xl font-bold">{warrantyStats.pendingClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Claim Savings</p>
                <p className="text-2xl font-bold">${warrantyStats.totalApprovedValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="asset" className="space-y-4">
        <TabsList>
          <TabsTrigger value="asset">Asset Warranties</TabsTrigger>
          <TabsTrigger value="parts">Part Warranties</TabsTrigger>
          <TabsTrigger value="claims">Claims</TabsTrigger>
        </TabsList>

        <TabsContent value="asset" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asset Warranties</CardTitle>
            </CardHeader>
            <CardContent>
              {assetWarranties.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No asset warranties tracked</p>
                  <p className="text-sm">Add warranties for equipment and vehicles</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {assetWarranties.map((warranty) => (
                    <div key={warranty.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold text-lg">{warranty.warranty_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {warranty.manufacturer} • {warranty.warranty_type.replace('_', ' ')}
                          </p>
                        </div>
                        {getExpiryBadge(warranty.end_date)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Policy #</p>
                          <p className="font-medium">{warranty.policy_number || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Start Date</p>
                          <p className="font-medium">{format(new Date(warranty.start_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">End Date</p>
                          <p className="font-medium">{format(new Date(warranty.end_date), 'MMM d, yyyy')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Claims Phone</p>
                          <p className="font-medium">{warranty.claim_phone || warranty.contact_phone || 'N/A'}</p>
                        </div>
                      </div>
                      {warranty.coverage_description && (
                        <p className="mt-3 text-sm text-muted-foreground">{warranty.coverage_description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isPartWarrantyDialogOpen} onOpenChange={setIsPartWarrantyDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Part Warranty
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Part Warranty</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Part Name *</Label>
                    <Input
                      placeholder="e.g., Alternator, Water Pump"
                      value={newPartWarranty.part_name}
                      onChange={(e) => setNewPartWarranty({ ...newPartWarranty, part_name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Part Number</Label>
                      <Input
                        placeholder="Part number"
                        value={newPartWarranty.part_number}
                        onChange={(e) => setNewPartWarranty({ ...newPartWarranty, part_number: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Manufacturer</Label>
                      <Input
                        placeholder="Manufacturer"
                        value={newPartWarranty.manufacturer}
                        onChange={(e) => setNewPartWarranty({ ...newPartWarranty, manufacturer: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Installed Date *</Label>
                      <Input
                        type="date"
                        value={newPartWarranty.installed_date}
                        onChange={(e) => setNewPartWarranty({ ...newPartWarranty, installed_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Warranty (Months)</Label>
                      <Input
                        type="number"
                        placeholder="12"
                        value={newPartWarranty.warranty_months}
                        onChange={(e) => setNewPartWarranty({ ...newPartWarranty, warranty_months: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Purchase Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newPartWarranty.purchase_price}
                      onChange={(e) => setNewPartWarranty({ ...newPartWarranty, purchase_price: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreatePartWarranty} className="w-full" disabled={!newPartWarranty.part_name}>
                    Add Part Warranty
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Part Warranties</CardTitle>
            </CardHeader>
            <CardContent>
              {partWarranties.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No part warranties tracked</p>
                  <p className="text-sm">Add warranties when installing new parts</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partWarranties.map((warranty) => (
                    <div key={warranty.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{warranty.part_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {warranty.part_number && `#${warranty.part_number} • `}
                          Installed {format(new Date(warranty.installed_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        {getExpiryBadge(warranty.expiry_date)}
                        {warranty.purchase_price && (
                          <p className="text-sm text-muted-foreground mt-1">${warranty.purchase_price.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="claims" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  New Claim
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Warranty Claim</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Select Warranty *</Label>
                    <Select value={newClaim.asset_warranty_id} onValueChange={(v) => setNewClaim({ ...newClaim, asset_warranty_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warranty" />
                      </SelectTrigger>
                      <SelectContent>
                        {assetWarranties.filter(w => w.is_active).map((w) => (
                          <SelectItem key={w.id} value={w.id}>{w.warranty_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Failure Date</Label>
                    <Input
                      type="date"
                      value={newClaim.failure_date}
                      onChange={(e) => setNewClaim({ ...newClaim, failure_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Issue Description *</Label>
                    <Textarea
                      placeholder="Describe the issue..."
                      value={newClaim.issue_description}
                      onChange={(e) => setNewClaim({ ...newClaim, issue_description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount Claimed *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={newClaim.amount_claimed}
                      onChange={(e) => setNewClaim({ ...newClaim, amount_claimed: e.target.value })}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateClaim} 
                    className="w-full" 
                    disabled={!newClaim.asset_warranty_id || !newClaim.issue_description || !newClaim.amount_claimed}
                  >
                    Create Claim
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Warranty Claims</CardTitle>
            </CardHeader>
            <CardContent>
              {warrantyClaims.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No warranty claims</p>
                  <p className="text-sm">Create claims to recover costs under warranty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {warrantyClaims.map((claim) => (
                    <div key={claim.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium">Claim #{claim.claim_number}</p>
                          <p className="text-sm text-muted-foreground">
                            Filed {format(new Date(claim.claim_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                        {getClaimStatusBadge(claim.status)}
                      </div>
                      <p className="text-sm mb-3">{claim.issue_description}</p>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-muted-foreground">Claimed: </span>
                          <span className="font-medium">${claim.amount_claimed.toLocaleString()}</span>
                        </div>
                        {claim.amount_approved !== null && (
                          <div>
                            <span className="text-muted-foreground">Approved: </span>
                            <span className="font-medium text-green-600">${claim.amount_approved.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                      {claim.status === 'draft' && (
                        <div className="mt-3 flex gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => updateWarrantyClaim.mutate({ 
                              id: claim.id, 
                              status: 'submitted', 
                              submitted_date: format(new Date(), 'yyyy-MM-dd') 
                            })}
                          >
                            Submit Claim
                          </Button>
                        </div>
                      )}
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
