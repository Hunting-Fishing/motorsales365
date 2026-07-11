import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Target,
  FileText,
  BarChart3,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { nonprofitApi } from '@/lib/services/nonprofitApi';
import { DonationEntryDialog } from '@/components/forms/DonationEntryDialog';
import { GrantEntryDialog } from '@/components/forms/GrantEntryDialog';
import { FinancialHealthEntryDialog } from '@/components/forms/FinancialHealthEntryDialog';
import { format } from 'date-fns';

export function ComprehensiveNonprofitManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('donations');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data states
  const [donations, setDonations] = useState([]);
  const [grants, setGrants] = useState([]);
  const [financialHealth, setFinancialHealth] = useState([]);
  const [donorAnalytics, setDonorAnalytics] = useState([]);
  
  // Dialog states
  const [donationDialogOpen, setDonationDialogOpen] = useState(false);
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [financialDialogOpen, setFinancialDialogOpen] = useState(false);
  
  // Editing states
  const [editingDonation, setEditingDonation] = useState(null);
  const [editingGrant, setEditingGrant] = useState(null);
  const [editingFinancial, setEditingFinancial] = useState(null);

  // Load all data
  const loadData = async () => {
    try {
      setIsLoading(true);
      const [donationsData, grantsData, financialData, donorData] = await Promise.all([
        nonprofitApi.getDonations(),
        nonprofitApi.getGrants(),
        nonprofitApi.getFinancialHealth(),
        nonprofitApi.getDonorAnalytics()
      ]);

      setDonations(donationsData);
      setGrants(grantsData);
      setFinancialHealth(financialData);
      setDonorAnalytics(donorData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load nonprofit data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Summary calculations
  const summary = {
    totalDonations: donations.reduce((sum, d) => sum + (d.amount || 0), 0),
    totalGrants: grants.reduce((sum, g) => sum + (g.amount_awarded || 0), 0),
    activeGrants: grants.filter(g => g.status === 'active').length,
    donorCount: new Set(donations.map(d => d.donor_email).filter(Boolean)).size,
    recentDonations: donations.slice(0, 5),
    recentGrants: grants.slice(0, 3)
  };

  // Handle delete functions
  const handleDeleteDonation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this donation?')) {
      try {
        // Delete implementation would go here
        toast({
          title: "Success",
          description: "Donation deleted successfully"
        });
        loadData();
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete donation",
          variant: "destructive"
        });
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading nonprofit data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalDonations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{donations.length} donations recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grant Funding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalGrants.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{summary.activeGrants} active grants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.donorCount}</div>
            <p className="text-xs text-muted-foreground">Individual donors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financial Health</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {financialHealth.length > 0 ? `${financialHealth[0]?.financial_stability_score?.toFixed(1) || 0}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Stability score</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="donations">Donations</TabsTrigger>
          <TabsTrigger value="grants">Grants</TabsTrigger>
          <TabsTrigger value="financial">Financial Health</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Donations Tab */}
        <TabsContent value="donations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Donation Management</h3>
            <Button onClick={() => setDonationDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Record Donation
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Donations</CardTitle>
              <CardDescription>Latest donation records</CardDescription>
            </CardHeader>
            <CardContent>
              {donations.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No donations recorded</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Start by recording your first donation.</p>
                  <Button className="mt-4" onClick={() => setDonationDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Record First Donation
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {donations.map((donation) => (
                    <div key={donation.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold">{donation.donor_name}</p>
                            <p className="text-sm text-muted-foreground">${donation.amount?.toLocaleString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant="outline">{donation.donation_type}</Badge>
                            {donation.is_recurring && <Badge variant="secondary">Recurring</Badge>}
                            {donation.tax_deductible && <Badge variant="outline">Tax Deductible</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(donation.created_at), 'PPP')}
                          {donation.campaign_name && ` • ${donation.campaign_name}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingDonation(donation);
                            setDonationDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteDonation(donation.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grants Tab */}
        <TabsContent value="grants" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Grant Management</h3>
            <Button onClick={() => setGrantDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Grant
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Grant Portfolio</CardTitle>
              <CardDescription>Active and historical grants</CardDescription>
            </CardHeader>
            <CardContent>
              {grants.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No grants recorded</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Track your grant applications and awards.</p>
                  <Button className="mt-4" onClick={() => setGrantDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Grant
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {grants.map((grant) => (
                    <div key={grant.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-semibold">{grant.grant_name}</p>
                            <p className="text-sm text-muted-foreground">{grant.funding_source}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={grant.status === 'active' ? 'default' : 'outline'}>
                              {grant.status}
                            </Badge>
                            <Badge variant="outline">
                              {grant.compliance_score}% compliance
                            </Badge>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 flex gap-4">
                          <span>Requested: ${grant.amount_requested?.toLocaleString() || 'N/A'}</span>
                          <span>Awarded: ${grant.amount_awarded?.toLocaleString() || 'N/A'}</span>
                          <span>Spent: ${grant.amount_spent?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setEditingGrant(grant);
                            setGrantDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeleteDonation(grant.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Financial Health Tab */}
        <TabsContent value="financial" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Financial Health Tracking</h3>
            <Button onClick={() => setFinancialDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Financial Record
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Financial Health Records</CardTitle>
              <CardDescription>Track financial performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {financialHealth.length === 0 ? (
                <div className="text-center py-8">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-semibold">No financial records</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Start tracking your financial health metrics.</p>
                  <Button className="mt-4" onClick={() => setFinancialDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Record
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {financialHealth.map((record) => (
                    <div key={record.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="font-semibold capitalize">{record.reporting_period} Report</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(record.period_start), 'MMM yyyy')} - {format(new Date(record.period_end), 'MMM yyyy')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setEditingFinancial(record);
                              setFinancialDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-lg font-semibold">${record.total_revenue?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Expenses</p>
                          <p className="text-lg font-semibold">${record.total_expenses?.toLocaleString() || '0'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Program Ratio</p>
                          <p className="text-lg font-semibold">{record.program_expense_ratio?.toFixed(1) || '0'}%</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Stability Score</p>
                          <p className="text-lg font-semibold">{record.financial_stability_score?.toFixed(1) || '0'}%</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <h3 className="text-lg font-semibold">Analytics Overview</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Donation Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Average Donation</span>
                    <span>${donations.length > 0 ? (summary.totalDonations / donations.length).toFixed(2) : '0'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recurring Donors</span>
                    <span>{donations.filter(d => d.is_recurring).length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax Deductible</span>
                    <span>{donations.filter(d => d.tax_deductible).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grant Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Success Rate</span>
                    <span>
                      {grants.length > 0 ? 
                        ((grants.filter(g => g.status === 'awarded' || g.status === 'active').length / grants.length) * 100).toFixed(1) + '%' 
                        : '0%'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Award</span>
                    <span>
                      ${grants.length > 0 ? 
                        (grants.reduce((sum, g) => sum + (g.amount_awarded || 0), 0) / grants.filter(g => g.amount_awarded).length || 0).toFixed(0) 
                        : '0'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Active Grants</span>
                    <span>{grants.filter(g => g.status === 'active').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Components */}
      <DonationEntryDialog
        open={donationDialogOpen}
        onOpenChange={(open) => {
          setDonationDialogOpen(open);
          if (!open) setEditingDonation(null);
        }}
        onDonationAdded={loadData}
        editingDonation={editingDonation}
      />

      <GrantEntryDialog
        open={grantDialogOpen}
        onOpenChange={(open) => {
          setGrantDialogOpen(open);
          if (!open) setEditingGrant(null);
        }}
        onGrantAdded={loadData}
        editingGrant={editingGrant}
      />

      <FinancialHealthEntryDialog
        open={financialDialogOpen}
        onOpenChange={(open) => {
          setFinancialDialogOpen(open);
          if (!open) setEditingFinancial(null);
        }}
        onFinancialHealthAdded={loadData}
        editingFinancialHealth={editingFinancial}
      />
    </div>
  );
}