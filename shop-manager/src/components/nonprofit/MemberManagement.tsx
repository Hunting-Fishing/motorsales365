import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, CreditCard, Calendar, Mail, Phone, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Member = Database['public']['Tables']['nonprofit_members']['Row'];
type MemberInsert = Database['public']['Tables']['nonprofit_members']['Insert'];

interface MemberFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  membership_type: string;
  membership_status: string;
  annual_dues: number;
  notes: string;
}

export function MemberManagement() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<MemberFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    membership_type: 'basic',
    membership_status: 'active',
    annual_dues: 0,
    notes: ''
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('nonprofit_members')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading members:', error);
      toast({
        title: 'Error',
        description: 'Failed to load members',
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

      const memberData: MemberInsert = {
        shop_id: shopId,
        created_by: user?.id || '',
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        membership_type: formData.membership_type,
        membership_status: formData.membership_status,
        annual_dues: formData.annual_dues,
        notes: formData.notes || null,
        join_date: new Date().toISOString().split('T')[0],
        dues_paid: false,
      };

      if (editingMember) {
        const { error } = await supabase
          .from('nonprofit_members')
          .update(memberData)
          .eq('id', editingMember.id);
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Member updated successfully'
        });
      } else {
        const { error } = await supabase
          .from('nonprofit_members')
          .insert(memberData);
        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Member added successfully'
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadMembers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save member',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this member?')) return;

    try {
      const { error } = await supabase
        .from('nonprofit_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadMembers();
      toast({
        title: 'Success',
        description: 'Member deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete member',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      email: member.email || '',
      phone: member.phone || '',
      membership_type: member.membership_type,
      membership_status: member.membership_status,
      annual_dues: member.annual_dues || 0,
      notes: member.notes || ''
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      membership_type: 'basic',
      membership_status: 'active',
      annual_dues: 0,
      notes: ''
    });
    setEditingMember(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary statistics
  const activeMembers = members.filter(m => m.membership_status === 'active').length;
  const totalRevenue = members.reduce((sum, m) => sum + (m.annual_dues || 0), 0);
  const duesOwed = members.filter(m => !m.dues_paid && m.membership_status === 'active').length;

  if (loading) {
    return <div className="p-6">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Members</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">Current membership</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Annual Revenue</CardTitle>
            <CreditCard className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From membership dues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dues Outstanding</CardTitle>
            <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{duesOwed}</div>
            <p className="text-xs text-muted-foreground">Members with unpaid dues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{members.length}</div>
            <p className="text-xs text-muted-foreground">All time membership</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Member Management</h2>
          <p className="text-muted-foreground">
            Manage organization membership, dues, and member information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="membership_type">Membership Type</Label>
                  <Select
                    value={formData.membership_type}
                    onValueChange={(value) => setFormData({ ...formData, membership_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="lifetime">Lifetime</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="family">Family</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="membership_status">Status</Label>
                  <Select
                    value={formData.membership_status}
                    onValueChange={(value) => setFormData({ ...formData, membership_status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="annual_dues">Annual Dues</Label>
                  <Input
                    id="annual_dues"
                    type="number"
                    value={formData.annual_dues}
                    onChange={(e) => setFormData({ ...formData, annual_dues: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingMember ? 'Update Member' : 'Add Member'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {members.map((member) => (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{member.first_name} {member.last_name}</h3>
                    <Badge className={getStatusColor(member.membership_status)}>
                      {member.membership_status}
                    </Badge>
                    <Badge variant="outline">{member.membership_type}</Badge>
                    {!member.dues_paid && member.membership_status === 'active' && (
                      <Badge variant="destructive">Dues Outstanding</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {member.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-4 w-4" />
                        {member.email}
                      </span>
                    )}
                    {member.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        {member.phone}
                      </span>
                    )}
                    <span>
                      Joined: {new Date(member.join_date).toLocaleDateString()}
                    </span>
                    {member.annual_dues && (
                      <span>
                        Dues: ${member.annual_dues.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {member.notes && (
                    <p className="text-sm text-muted-foreground">{member.notes}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(member)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(member.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {members.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No members found. Add your first member to get started.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}