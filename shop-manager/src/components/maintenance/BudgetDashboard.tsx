import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, LayoutGrid, Table as TableIcon, BarChart3, Loader2, AlertCircle, 
  DollarSign, Users, Fuel, Wrench, Ship, Bell, TrendingUp, Shield 
} from "lucide-react";
import { useBudgetFilters, MaintenanceBudget } from "@/hooks/useBudgetFilters";
import { InsuranceBudgetTracker } from "@/components/insurance/InsuranceBudgetTracker";
import { useInsurancePolicies } from "@/hooks/useInsurancePolicies";
import { useInsuranceAnalytics } from "@/hooks/useInsuranceAnalytics";
import { BudgetFiltersBar } from "./BudgetFiltersBar";
import { BudgetCategoryCards } from "./BudgetCategoryCards";
import { BudgetAnalyticsCharts } from "./BudgetAnalyticsCharts";
import { BudgetTable } from "./BudgetTable";
import { LaborBudgetTracker } from "./LaborBudgetTracker";
import { FuelBudgetTracker } from "./FuelBudgetTracker";
import { RepairTrendsCard } from "./RepairTrendsCard";
import { AssetBudgetView } from "./AssetBudgetView";
import { BudgetAlerts } from "./BudgetAlerts";
import { BudgetForecast } from "./BudgetForecast";

export function BudgetDashboard() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Insurance data for the Insurance tab
  const { policies: insurancePolicies } = useInsurancePolicies();
  const insuranceAnalytics = useInsuranceAnalytics(insurancePolicies);

  // Form state for create budget
  const [formData, setFormData] = useState({
    budget_name: '',
    description: '',
    budget_period: 'monthly',
    start_date: '',
    end_date: '',
    total_budget: '',
    parts_budget: '',
    labor_budget: '',
    external_services_budget: '',
    safety_budget: '',
    tools_budget: '',
    fuel_budget: '',
    ppe_budget: '',
  });

  // Fetch budgets from database
  const { data: budgets = [], isLoading, error } = useQuery({
    queryKey: ['maintenance-budgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_budgets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as MaintenanceBudget[];
    },
  });

  // Use filter hook
  const { filters, filteredBudgets, stats, updateFilter, resetFilters } = useBudgetFilters(budgets);

  // Create budget mutation
  const createBudget = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('maintenance_budgets').insert({
        budget_name: data.budget_name,
        description: data.description || null,
        budget_period: data.budget_period,
        start_date: data.start_date,
        end_date: data.end_date,
        total_budget: parseFloat(data.total_budget) || 0,
        parts_budget: parseFloat(data.parts_budget) || 0,
        labor_budget: parseFloat(data.labor_budget) || 0,
        external_services_budget: parseFloat(data.external_services_budget) || 0,
        safety_budget: parseFloat(data.safety_budget) || 0,
        tools_budget: parseFloat(data.tools_budget) || 0,
        fuel_budget: parseFloat(data.fuel_budget) || 0,
        ppe_budget: parseFloat(data.ppe_budget) || 0,
        total_spent: 0,
        parts_spent: 0,
        labor_spent: 0,
        external_services_spent: 0,
        safety_spent: 0,
        tools_spent: 0,
        fuel_spent: 0,
        ppe_spent: 0,
        forecasted_total: 0,
        status: 'active',
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-budgets'] });
      setIsCreateDialogOpen(false);
      setFormData({
        budget_name: '',
        description: '',
        budget_period: 'monthly',
        start_date: '',
        end_date: '',
        total_budget: '',
        parts_budget: '',
        labor_budget: '',
        external_services_budget: '',
        safety_budget: '',
        tools_budget: '',
        fuel_budget: '',
        ppe_budget: '',
      });
      toast({
        title: "Budget Created",
        description: "Your maintenance budget has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create budget. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating budget:', error);
    },
  });

  // Delete budget mutation
  const deleteBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const { error } = await supabase
        .from('maintenance_budgets')
        .delete()
        .eq('id', budgetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-budgets'] });
      toast({
        title: "Budget Deleted",
        description: "The budget has been deleted successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete budget.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.budget_name.trim()) {
      toast({ title: 'Error', description: 'Budget name is required', variant: 'destructive' });
      return;
    }
    if (!formData.total_budget || parseFloat(formData.total_budget) <= 0) {
      toast({ title: 'Error', description: 'Total budget must be greater than 0', variant: 'destructive' });
      return;
    }
    createBudget.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">Failed to load budgets</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Budget Management</h2>
          <p className="text-muted-foreground">
            Track and manage maintenance budgets across all categories
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Budget
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Budget</DialogTitle>
              <DialogDescription>
                Set up a new maintenance budget with category allocations
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="budget_name">Budget Name *</Label>
                  <Input
                    id="budget_name"
                    value={formData.budget_name}
                    onChange={(e) => setFormData({ ...formData, budget_name: e.target.value })}
                    placeholder="Q1 2025 Maintenance Budget"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Budget for fleet and equipment maintenance..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="budget_period">Budget Period *</Label>
                  <Select
                    value={formData.budget_period}
                    onValueChange={(value) => setFormData({ ...formData, budget_period: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="total_budget">Total Budget *</Label>
                  <Input
                    id="total_budget"
                    type="number"
                    value={formData.total_budget}
                    onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
                    placeholder="50000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Category Allocations */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Category Allocations</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="parts_budget">Parts & Materials</Label>
                    <Input
                      id="parts_budget"
                      type="number"
                      value={formData.parts_budget}
                      onChange={(e) => setFormData({ ...formData, parts_budget: e.target.value })}
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="labor_budget">Labor Costs</Label>
                    <Input
                      id="labor_budget"
                      type="number"
                      value={formData.labor_budget}
                      onChange={(e) => setFormData({ ...formData, labor_budget: e.target.value })}
                      placeholder="15000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="safety_budget">Safety & Compliance</Label>
                    <Input
                      id="safety_budget"
                      type="number"
                      value={formData.safety_budget}
                      onChange={(e) => setFormData({ ...formData, safety_budget: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tools_budget">Tools & Equipment</Label>
                    <Input
                      id="tools_budget"
                      type="number"
                      value={formData.tools_budget}
                      onChange={(e) => setFormData({ ...formData, tools_budget: e.target.value })}
                      placeholder="8000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fuel_budget">Fuels & Lubricants</Label>
                    <Input
                      id="fuel_budget"
                      type="number"
                      value={formData.fuel_budget}
                      onChange={(e) => setFormData({ ...formData, fuel_budget: e.target.value })}
                      placeholder="12000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ppe_budget">PPE Equipment</Label>
                    <Input
                      id="ppe_budget"
                      type="number"
                      value={formData.ppe_budget}
                      onChange={(e) => setFormData({ ...formData, ppe_budget: e.target.value })}
                      placeholder="3000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="external_services_budget">External Services</Label>
                    <Input
                      id="external_services_budget"
                      type="number"
                      value={formData.external_services_budget}
                      onChange={(e) => setFormData({ ...formData, external_services_budget: e.target.value })}
                      placeholder="7000"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBudget.isPending}>
                  {createBudget.isPending ? 'Creating...' : 'Create Budget'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="pt-6">
          <BudgetFiltersBar
            filters={filters}
            onUpdateFilter={updateFilter}
            onResetFilters={resetFilters}
            resultCount={filteredBudgets.length}
          />
        </CardContent>
      </Card>

      {/* Category Cards Overview */}
      <BudgetCategoryCards stats={stats} />

      {/* Empty State */}
      {budgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Budgets Created</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Create your first maintenance budget to start tracking expenses and allocations.
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Main Content Tabs */
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="flex items-center justify-between overflow-x-auto">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="overview" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="budgets" className="gap-2">
                <TableIcon className="h-4 w-4" />
                All Budgets
              </TabsTrigger>
              <TabsTrigger value="labor" className="gap-2">
                <Users className="h-4 w-4" />
                Labor
              </TabsTrigger>
              <TabsTrigger value="fuel" className="gap-2">
                <Fuel className="h-4 w-4" />
                Fuel
              </TabsTrigger>
              <TabsTrigger value="repairs" className="gap-2">
                <Wrench className="h-4 w-4" />
                Repairs
              </TabsTrigger>
              <TabsTrigger value="assets" className="gap-2">
                <Ship className="h-4 w-4" />
                Assets
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-2">
                <Bell className="h-4 w-4" />
                Alerts
              </TabsTrigger>
              <TabsTrigger value="forecast" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Forecast
              </TabsTrigger>
              <TabsTrigger value="insurance" className="gap-2">
                <Shield className="h-4 w-4" />
                Insurance
              </TabsTrigger>
            </TabsList>

            {/* View Toggle for Budgets Tab */}
            <div className="flex items-center gap-2 ml-4">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('table')}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <BudgetAnalyticsCharts budgets={filteredBudgets} stats={stats} />
            
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Active Budgets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {filteredBudgets.filter(b => b.status === 'active').length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Over Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-destructive">
                    {filteredBudgets.filter(b => b.total_spent > b.total_budget).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.utilizationPercent}%</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* All Budgets Tab */}
          <TabsContent value="budgets">
            <BudgetTable
              budgets={filteredBudgets}
              onDelete={(id) => deleteBudget.mutate(id)}
            />
          </TabsContent>

          {/* Labor Tab */}
          <TabsContent value="labor">
            <LaborBudgetTracker 
              laborBudget={stats.laborBudget} 
              laborSpent={stats.laborSpent} 
            />
          </TabsContent>

          {/* Fuel Tab */}
          <TabsContent value="fuel">
            <FuelBudgetTracker 
              fuelBudget={stats.fuelBudget} 
              fuelSpent={stats.fuelSpent} 
            />
          </TabsContent>

          {/* Repairs Tab */}
          <TabsContent value="repairs">
            <RepairTrendsCard 
              partsBudget={stats.partsBudget}
              partsSpent={stats.partsSpent}
              externalServicesBudget={0}
              externalServicesSpent={0}
            />
          </TabsContent>

          {/* Assets Tab */}
          <TabsContent value="assets">
            <AssetBudgetView budgets={filteredBudgets} />
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts">
            <BudgetAlerts budgets={filteredBudgets} stats={stats} />
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast">
            <BudgetForecast budgets={filteredBudgets} stats={stats} />
          </TabsContent>

          {/* Insurance Tab */}
          <TabsContent value="insurance">
            <InsuranceBudgetTracker 
              annualPremiumTotal={insuranceAnalytics.annualPremiumTotal}
              premiumForecast={insuranceAnalytics.premiumForecast}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
