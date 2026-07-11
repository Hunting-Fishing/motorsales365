import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, Calendar, Clock, Building2, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import { format, addDays, differenceInDays, parseISO } from 'date-fns';

interface Shop {
  id: string;
  name: string;
  email: string | null;
  industry: string | null;
  trial_days: number | null;
  trial_started_at: string | null;
  created_at: string;
  is_active: boolean | null;
}

interface ModuleSubscription {
  id: string;
  shop_id: string;
  module_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  business_modules: {
    name: string;
    slug: string;
  } | null;
}

export default function TrialManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [extendDays, setExtendDays] = useState(14);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch all shops with their trial info
  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ['admin-shops-trials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, email, industry, trial_days, trial_started_at, created_at, is_active')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Shop[];
    },
  });

  // Fetch module subscriptions for all shops
  const { data: moduleSubscriptions } = useQuery({
    queryKey: ['admin-module-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_subscriptions')
        .select(`
          id,
          shop_id,
          module_id,
          status,
          trial_ends_at,
          current_period_end,
          business_modules (name, slug)
        `);
      
      if (error) throw error;
      return data as ModuleSubscription[];
    },
  });

  // Mutation to extend shop trial
  const extendTrialMutation = useMutation({
    mutationFn: async ({ shopId, days }: { shopId: string; days: number }) => {
      const shop = shops?.find(s => s.id === shopId);
      const currentTrialDays = shop?.trial_days || 0;
      const newTrialDays = currentTrialDays + days;
      
      // If no trial started yet, start it now
      const trialStartedAt = shop?.trial_started_at || new Date().toISOString();

      const { error } = await supabase
        .from('shops')
        .update({ 
          trial_days: newTrialDays,
          trial_started_at: trialStartedAt
        })
        .eq('id', shopId);
      
      if (error) throw error;

      // Also update any module subscriptions that are trialing
      const { error: subError } = await supabase
        .from('module_subscriptions')
        .update({
          trial_ends_at: addDays(parseISO(trialStartedAt), newTrialDays).toISOString(),
          status: 'trialing'
        })
        .eq('shop_id', shopId)
        .eq('status', 'trialing');

      if (subError) throw subError;
    },
    onSuccess: () => {
      toast.success(`Trial extended by ${extendDays} days`);
      queryClient.invalidateQueries({ queryKey: ['admin-shops-trials'] });
      queryClient.invalidateQueries({ queryKey: ['admin-module-subscriptions'] });
      setIsDialogOpen(false);
      setSelectedShop(null);
    },
    onError: (error) => {
      toast.error('Failed to extend trial: ' + error.message);
    },
  });

  // Mutation to start a new trial
  const startTrialMutation = useMutation({
    mutationFn: async ({ shopId, days }: { shopId: string; days: number }) => {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('shops')
        .update({ 
          trial_days: days,
          trial_started_at: now
        })
        .eq('id', shopId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`New trial started for ${extendDays} days`);
      queryClient.invalidateQueries({ queryKey: ['admin-shops-trials'] });
      setIsDialogOpen(false);
      setSelectedShop(null);
    },
    onError: (error) => {
      toast.error('Failed to start trial: ' + error.message);
    },
  });

  const getTrialStatus = (shop: Shop) => {
    if (!shop.trial_started_at || !shop.trial_days) {
      return { status: 'none', label: 'No Trial', daysLeft: 0 };
    }

    const trialEnd = addDays(parseISO(shop.trial_started_at), shop.trial_days);
    const daysLeft = differenceInDays(trialEnd, new Date());

    if (daysLeft < 0) {
      return { status: 'expired', label: 'Expired', daysLeft: 0 };
    } else if (daysLeft <= 3) {
      return { status: 'expiring', label: `${daysLeft} days left`, daysLeft };
    } else {
      return { status: 'active', label: `${daysLeft} days left`, daysLeft };
    }
  };

  const getStatusBadge = (status: string, label: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">{label}</Badge>;
      case 'expiring':
        return <Badge className="bg-yellow-100 text-yellow-800">{label}</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800">{label}</Badge>;
      default:
        return <Badge variant="outline">{label}</Badge>;
    }
  };

  const filteredShops = shops?.filter(shop => 
    shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    shop.industry?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExtendClick = (shop: Shop) => {
    setSelectedShop(shop);
    setExtendDays(14);
    setIsDialogOpen(true);
  };

  const handleConfirmExtend = () => {
    if (!selectedShop) return;
    
    if (!selectedShop.trial_started_at) {
      startTrialMutation.mutate({ shopId: selectedShop.id, days: extendDays });
    } else {
      extendTrialMutation.mutate({ shopId: selectedShop.id, days: extendDays });
    }
  };

  const getShopSubscriptions = (shopId: string) => {
    return moduleSubscriptions?.filter(sub => sub.shop_id === shopId) || [];
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Trial Management</h1>
        <p className="text-muted-foreground">
          Manage trial periods for shops and module subscriptions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Shops</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shops?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Trials</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {shops?.filter(s => getTrialStatus(s).status === 'active').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {shops?.filter(s => getTrialStatus(s).status === 'expiring').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {shops?.filter(s => getTrialStatus(s).status === 'expired').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Shop Trials</CardTitle>
              <CardDescription>View and manage trial periods for all shops</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-shops-trials'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {shopsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Trial Status</TableHead>
                    <TableHead>Trial Days</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Subscriptions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShops?.map((shop) => {
                    const trialInfo = getTrialStatus(shop);
                    const subscriptions = getShopSubscriptions(shop.id);
                    
                    return (
                      <TableRow key={shop.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{shop.name}</div>
                              <div className="text-sm text-muted-foreground">{shop.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{shop.industry || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(trialInfo.status, trialInfo.label)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {shop.trial_days || 0} days
                          </div>
                        </TableCell>
                        <TableCell>
                          {shop.trial_started_at ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {format(parseISO(shop.trial_started_at), 'MMM d, yyyy')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Not started</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {subscriptions.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {subscriptions.slice(0, 2).map(sub => (
                                <Badge key={sub.id} variant="secondary" className="text-xs">
                                  {sub.business_modules?.name || 'Module'}
                                </Badge>
                              ))}
                              {subscriptions.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{subscriptions.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleExtendClick(shop)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            {shop.trial_started_at ? 'Extend' : 'Start Trial'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredShops?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No shops found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extend Trial Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedShop?.trial_started_at ? 'Extend Trial' : 'Start New Trial'}
            </DialogTitle>
            <DialogDescription>
              {selectedShop?.trial_started_at 
                ? `Extend the trial period for ${selectedShop?.name}`
                : `Start a new trial period for ${selectedShop?.name}`
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedShop && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{selectedShop.name}</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Current trial: {selectedShop.trial_days || 0} days
                  {selectedShop.trial_started_at && (
                    <> (started {format(parseISO(selectedShop.trial_started_at), 'MMM d, yyyy')})</>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="days">
                {selectedShop?.trial_started_at ? 'Days to Add' : 'Trial Duration (days)'}
              </Label>
              <Input
                id="days"
                type="number"
                min={1}
                max={365}
                value={extendDays}
                onChange={(e) => setExtendDays(parseInt(e.target.value) || 0)}
              />
            </div>

            {selectedShop?.trial_started_at && selectedShop.trial_days && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm">
                <AlertCircle className="h-4 w-4" />
                New total: {(selectedShop.trial_days || 0) + extendDays} days
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmExtend}
              disabled={extendTrialMutation.isPending || startTrialMutation.isPending}
            >
              {(extendTrialMutation.isPending || startTrialMutation.isPending) && (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              )}
              {selectedShop?.trial_started_at ? 'Extend Trial' : 'Start Trial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
