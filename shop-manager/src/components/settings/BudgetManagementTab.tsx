import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, Target, Plus, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const BudgetManagementTab = () => {
  const [budgetEntries, setBudgetEntries] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [grants, setGrants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      const [entriesData, categoriesData, grantsData] = await Promise.all([
        supabase.from('budget_entries').select('*'),
        supabase.from('budget_categories').select('*').eq('is_active', true),
        supabase.from('grants').select('*')
      ]);

      setBudgetEntries(entriesData.data || []);
      setBudgetCategories(categoriesData.data || []);
      setGrants(grantsData.data || []);
    } catch (error) {
      toast({
        title: "Error loading budget data",
        description: "Failed to load budget information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading budget data...</div>;
  }

  const currentYear = new Date().getFullYear();
  const currentYearEntries = budgetEntries.filter(entry => entry.fiscal_year === currentYear);
  
  const totalBudget = currentYearEntries.reduce((sum, entry) => sum + entry.planned_amount, 0);
  const totalSpent = currentYearEntries.reduce((sum, entry) => sum + entry.actual_amount, 0);
  const remaining = totalBudget - totalSpent;
  const utilizationRate = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  const categoriesWithBudget = budgetCategories.map(category => {
    const categoryEntries = currentYearEntries.filter(entry => entry.category_id === category.id);
    const planned = categoryEntries.reduce((sum, entry) => sum + entry.planned_amount, 0);
    const actual = categoryEntries.reduce((sum, entry) => sum + entry.actual_amount, 0);
    const utilization = planned > 0 ? (actual / planned) * 100 : 0;
    return {
      ...category,
      planned,
      actual,
      utilization
    };
  });

  const overBudgetCategories = categoriesWithBudget.filter(cat => cat.utilization > 100).length;
  const activeGrants = grants.filter(grant => grant.status === 'active');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Budget Management</h2>
          <p className="text-muted-foreground">Track budgets, expenses, and financial performance</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Budget
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Budget
          </Button>
        </div>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Budget</p>
                <p className="text-2xl font-bold text-foreground">${(totalBudget / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Spent</p>
                <p className="text-2xl font-bold text-foreground">${(totalSpent / 1000).toFixed(0)}K</p>
                <p className="text-xs text-green-600">{utilizationRate}% utilized</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Target className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Remaining</p>
                <p className="text-2xl font-bold text-foreground">${(remaining / 1000).toFixed(0)}K</p>
                <p className="text-xs text-yellow-600">{Math.round((remaining / totalBudget) * 100)}% available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Over Budget</p>
                <p className="text-2xl font-bold text-foreground">{overBudgetCategories}</p>
                <p className="text-xs text-red-600">categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress by Category */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Progress by Category</CardTitle>
          <CardDescription>
            Track spending across different budget categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categoriesWithBudget.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No budget categories found</p>
            ) : (
              categoriesWithBudget.map((category) => (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-foreground">{category.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        ${(category.actual / 1000).toFixed(0)}K / ${(category.planned / 1000).toFixed(0)}K
                      </span>
                      <Badge className={
                        category.utilization > 100 ? "bg-red-500/10 text-red-700 hover:bg-red-500/20" :
                        category.utilization > 80 ? "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20" :
                        "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                      }>
                        {category.utilization > 100 ? 'Over Budget' : 
                         category.utilization > 80 ? 'Watch' : 'On Track'}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={Math.min(category.utilization, 100)} className="h-2" />
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grant-Specific Budgets */}
      {activeGrants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Grant-Specific Budgets</CardTitle>
            <CardDescription>
              Track restricted funding and compliance with grant requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeGrants.map((grant) => {
                const grantEntries = budgetEntries.filter(entry => entry.grant_id === grant.id);
                const totalSpent = grantEntries.reduce((sum, entry) => sum + entry.actual_amount, 0);
                const utilization = grant.award_amount > 0 ? (totalSpent / grant.award_amount) * 100 : 0;
                
                return (
                  <div key={grant.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">{grant.grant_title}</h4>
                      <p className="text-sm text-muted-foreground">{grant.program_description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Grant Period: {new Date(grant.start_date).toLocaleDateString()} - {new Date(grant.end_date).toLocaleDateString()}
                        </span>
                        <span className="text-xs text-muted-foreground">Total Award: ${grant.award_amount?.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-foreground">${totalSpent.toLocaleString()} spent</div>
                      <div className="text-xs text-blue-600">{Math.round(utilization)}% utilized</div>
                      <Progress value={utilization} className="h-1 w-20 mt-1" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Budget Alerts & Recommendations
          </CardTitle>
          <CardDescription>
            Important budget notifications and suggested actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {overBudgetCategories === 0 ? (
              <p className="text-muted-foreground text-center py-8">No budget alerts at this time</p>
            ) : (
              categoriesWithBudget
                .filter(cat => cat.utilization > 80)
                .map((category) => (
                  <div 
                    key={category.id} 
                    className={`p-4 border rounded-lg ${
                      category.utilization > 100 ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">
                          {category.utilization > 100 ? `${category.name} Budget Exceeded` : `${category.name} Budget Alert`}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {category.utilization > 100 
                            ? `You're ${(category.utilization - 100).toFixed(1)}% over budget in this category`
                            : `You've used ${category.utilization.toFixed(1)}% of your budget for this category`
                          }
                        </p>
                      </div>
                      <Button size="sm" variant="outline">
                        Review Expenses
                      </Button>
                    </div>
                  </div>
                ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};