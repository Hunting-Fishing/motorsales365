import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Calendar, FileText, AlertTriangle, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Grant = Database['public']['Tables']['grants']['Row'];
type GrantInsert = Database['public']['Tables']['grants']['Insert'];

interface GrantFormData {
  grant_name: string;
  funding_organization: string;
  amount_requested: number;
  application_deadline: string;
  project_start_date: string;
  project_end_date: string;
  status: string;
  grant_type: string;
  notes: string;
}

export function GrantFundingManagement() {
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrant, setEditingGrant] = useState<Grant | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<GrantFormData>({
    grant_name: '',
    funding_organization: '',
    amount_requested: 0,
    application_deadline: '',
    project_start_date: '',
    project_end_date: '',
    status: 'prospect',
    grant_type: 'program',
    notes: ''
  });

  useEffect(() => {
    loadGrants();
  }, []);

  const loadGrants = async () => {
    try {
      const { data, error } = await supabase
        .from('grants')
        .select('*')
        .order('application_deadline', { ascending: true });

      if (error) throw error;
      setGrants(data || []);
    } catch (error) {
      console.error('Error loading grants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load grants',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const profile = await supabase.from('profiles').select('shop_id').eq('id', (await supabase.auth.getUser()).data.user?.id).single();
      if (!profile.data?.shop_id) throw new Error('Shop not found');

      const user = (await supabase.auth.getUser()).data.user;
      const shopId = profile.data.shop_id;

      const grantData: GrantInsert = {
        shop_id: shopId,
        created_by: user?.id || '',
        grant_name: formData.grant_name,
        funding_organization: formData.funding_organization,
        amount_requested: formData.amount_requested,
        application_deadline: formData.application_deadline,
        project_start_date: formData.project_start_date,
        project_end_date: formData.project_end_date,
        status: formData.status,
        grant_type: formData.grant_type,
        notes: formData.notes,
      };

      if (editingGrant) {
        const { error } = await supabase
          .from('grants')
          .update(grantData)
          .eq('id', editingGrant.id);
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Grant updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('grants')
          .insert(grantData);
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Grant added successfully'
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadGrants();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save grant',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grant?')) return;

    try {
      const { error } = await supabase
        .from('grants')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadGrants();
      toast({
        title: 'Success',
        description: 'Grant deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete grant',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (grant: Grant) => {
    setEditingGrant(grant);
    setFormData({
      grant_name: grant.grant_name,
      funding_organization: grant.funding_organization,
      amount_requested: grant.amount_requested || 0,
      application_deadline: grant.application_deadline || '',
      project_start_date: grant.project_start_date || '',
      project_end_date: grant.project_end_date || '',
      status: grant.status || 'prospect',
      grant_type: grant.grant_type,
      notes: grant.notes || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      grant_name: '',
      funding_organization: '',
      amount_requested: 0,
      application_deadline: '',
      project_start_date: '',
      project_end_date: '',
      status: 'prospect',
      grant_type: 'program',
      notes: ''
    });
    setEditingGrant(null);
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'awarded': return 'bg-green-100 text-green-800';
      case 'applied': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-purple-100 text-purple-800';
      case 'prospect': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDeadline = (deadline: string | null) => {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getUrgentGrants = () => {
    return grants.filter(grant => {
      if (!grant.application_deadline) return false;
      const days = getDaysUntilDeadline(grant.application_deadline);
      return days !== null && days <= 30 && days > 0 && grant.status === 'prospect';
    });
  };

  // Calculate summary statistics
  const totalAwarded = grants.filter(g => g.status === 'awarded').reduce((sum, g) => sum + (g.amount_awarded || 0), 0);
  const pendingApplications = grants.filter(g => g.status === 'applied').length;
  const urgentDeadlines = getUrgentGrants().length;

  if (loading) {
    return <div className="p-6">Loading grants...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Awarded</CardTitle>
            <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalAwarded.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Grant funding received</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <FileText className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingApplications}</div>
            <p className="text-xs text-muted-foreground">Awaiting decisions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Deadlines</CardTitle>
            <AlertTriangle className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{urgentDeadlines}</div>
            <p className="text-xs text-muted-foreground">Due within 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <FileText className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{grants.length}</div>
            <p className="text-xs text-muted-foreground">All grant opportunities</p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Deadlines Alert */}
      {urgentDeadlines > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Urgent Grant Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {getUrgentGrants().map(grant => (
                <div key={grant.id} className="flex justify-between items-center">
                  <span className="font-medium">{grant.grant_name}</span>
                  <Badge variant="destructive">
                    {getDaysUntilDeadline(grant.application_deadline)} days left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Grant & Funding Management</h2>
          <p className="text-muted-foreground">
            Track grant opportunities, applications, and funding sources
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Grant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingGrant ? 'Edit Grant' : 'Add New Grant'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="grant_name">Grant Name</Label>
                  <Input
                    id="grant_name"
                    value={formData.grant_name}
                    onChange={(e) => setFormData({ ...formData, grant_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="funding_organization">Funding Organization</Label>
                  <Input
                    id="funding_organization"
                    value={formData.funding_organization}
                    onChange={(e) => setFormData({ ...formData, funding_organization: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount_requested">Amount Requested</Label>
                  <Input
                    id="amount_requested"
                    type="number"
                    value={formData.amount_requested}
                    onChange={(e) => setFormData({ ...formData, amount_requested: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="application_deadline">Application Deadline</Label>
                  <Input
                    id="application_deadline"
                    type="date"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project_start_date">Project Start Date</Label>
                  <Input
                    id="project_start_date"
                    type="date"
                    value={formData.project_start_date}
                    onChange={(e) => setFormData({ ...formData, project_start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project_end_date">Project End Date</Label>
                  <Input
                    id="project_end_date"
                    type="date"
                    value={formData.project_end_date}
                    onChange={(e) => setFormData({ ...formData, project_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prospect">Prospect</SelectItem>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="awarded">Awarded</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grant_type">Grant Type</Label>
                  <Select
                    value={formData.grant_type}
                    onValueChange={(value) => setFormData({ ...formData, grant_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="program">Program Funding</SelectItem>
                      <SelectItem value="operating">Operating Support</SelectItem>
                      <SelectItem value="capital">Capital Campaign</SelectItem>
                      <SelectItem value="capacity">Capacity Building</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Application requirements, contacts, notes..."
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGrant ? 'Update Grant' : 'Add Grant'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {grants.map((grant) => {
          const daysUntilDeadline = getDaysUntilDeadline(grant.application_deadline);
          const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 30 && daysUntilDeadline > 0 && grant.status === 'prospect';
          
          return (
            <Card key={grant.id} className={isUrgent ? 'border-amber-200' : ''}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">{grant.grant_name}</h3>
                      <Badge className={getStatusColor(grant.status)}>
                        {grant.status}
                      </Badge>
                      <Badge variant="outline">{grant.grant_type}</Badge>
                      {isUrgent && (
                        <Badge variant="destructive">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium text-muted-foreground">{grant.funding_organization}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${(grant.amount_requested || 0).toLocaleString()}
                      </span>
                      {grant.application_deadline && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Due: {new Date(grant.application_deadline).toLocaleDateString()}
                        </span>
                      )}
                      {daysUntilDeadline !== null && daysUntilDeadline > 0 && grant.status === 'prospect' && (
                        <span className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                          ({daysUntilDeadline} days left)
                        </span>
                      )}
                    </div>
                    {grant.notes && (
                      <p className="text-sm text-muted-foreground">{grant.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(grant)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(grant.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {grants.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No grants found. Add your first grant opportunity to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
