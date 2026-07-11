import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign, Calendar, User, Filter, Download, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DonationForm } from './forms/DonationForm';

interface Donation {
  id: string;
  donor_name: string;
  donor_email: string | null;
  amount: number;
  donation_type: string;
  donation_date: string;
  payment_method: string | null;
  tax_deductible: boolean | null;
  receipt_sent: boolean | null;
  notes: string | null;
  created_at: string;
  anonymous: boolean | null;
  donor_address: string | null;
  donor_phone: string | null;
  designation: string | null;
  is_recurring: boolean | null;
  program_id: string | null;
  receipt_number: string | null;
  recurrence_frequency: string | null;
  shop_id: string;
  transaction_id: string | null;
  updated_at: string;
  created_by: string;
}

export function DonationManagement() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [dateRange, setDateRange] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadDonations();
  }, []);

  const loadDonations = async () => {
    try {
      const { data, error } = await supabase
        .from('donation_transactions')
        .select('*')
        .order('donation_date', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (error) {
      console.error('Error loading donations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load donations',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDonationSubmit = async () => {
    await loadDonations();
    setIsDialogOpen(false);
    toast({
      title: 'Success',
      description: 'Donation recorded successfully'
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this donation record?')) return;

    try {
      const { error } = await supabase
        .from('donation_transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadDonations();
      toast({
        title: 'Success',
        description: 'Donation deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete donation',
        variant: 'destructive'
      });
    }
  };

  const sendAcknowledgment = async (donation: Donation) => {
    try {
      const { error } = await supabase
        .from('donation_transactions')
        .update({ receipt_sent: true })
        .eq('id', donation.id);

      if (error) throw error;
      await loadDonations();
      toast({
        title: 'Success',
        description: 'Acknowledgment marked as sent'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update acknowledgment status',
        variant: 'destructive'
      });
    }
  };

  const getFilteredDonations = () => {
    let filtered = donations;

    if (filterType !== 'all') {
      filtered = filtered.filter(d => d.donation_type === filterType);
    }

    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      
      switch (dateRange) {
        case '7days':
          cutoff.setDate(now.getDate() - 7);
          break;
        case '30days':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90days':
          cutoff.setDate(now.getDate() - 90);
          break;
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(d => new Date(d.donation_date) >= cutoff);
    }

    return filtered;
  };

  const filteredDonations = getFilteredDonations();
  const totalAmount = filteredDonations.reduce((sum, d) => sum + d.amount, 0);
  const averageDonation = filteredDonations.length ? totalAmount / filteredDonations.length : 0;
  const pendingAcknowledgments = filteredDonations.filter(d => !d.receipt_sent).length;

  if (loading) {
    return <div className="p-6">Loading donations...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">From {filteredDonations.length} donations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
            <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${averageDonation.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">Per donation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Donors</CardTitle>
            <User className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Set(filteredDonations.map(d => d.donor_email)).size}
            </div>
            <p className="text-xs text-muted-foreground">Unique donors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingAcknowledgments}</div>
            <p className="text-xs text-muted-foreground">Acknowledgments needed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Donation Management</h2>
          <p className="text-muted-foreground">
            Track and manage donations to your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record Donation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record New Donation</DialogTitle>
              </DialogHeader>
              <DonationForm onSuccess={() => {
                setIsDialogOpen(false);
                loadDonations();
              }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Label>Type:</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="one_time">One-time</SelectItem>
                  <SelectItem value="recurring">Recurring</SelectItem>
                  <SelectItem value="pledge">Pledge</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Period:</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="90days">Last 90 days</SelectItem>
                  <SelectItem value="year">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Donations List */}
      <div className="grid gap-4">
        {filteredDonations.map((donation) => (
          <Card key={donation.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold">{donation.donor_name}</h3>
                    <Badge variant={donation.donation_type === 'recurring' ? 'default' : 'secondary'}>
                      {donation.donation_type.replace('_', ' ')}
                    </Badge>
                    {donation.tax_deductible && (
                      <Badge variant="outline">Tax Deductible</Badge>
                    )}
                    {!donation.receipt_sent && (
                      <Badge variant="destructive">Receipt Pending</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{donation.donor_email}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      ${donation.amount.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(donation.donation_date).toLocaleDateString()}
                    </span>
                    <span>{donation.payment_method}</span>
                  </div>
                  {donation.notes && (
                    <p className="text-sm text-muted-foreground">{donation.notes}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  {!donation.receipt_sent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => sendAcknowledgment(donation)}
                    >
                      Send Thanks
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDonation(donation)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(donation.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredDonations.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No donations found matching your filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}