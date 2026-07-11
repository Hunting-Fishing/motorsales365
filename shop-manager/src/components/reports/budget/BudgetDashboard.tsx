import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useBudgetData } from '@/hooks/useBudgetData';
import { BudgetCategoryManager } from './BudgetCategoryManager';
import { BudgetEntryForm } from './BudgetEntryForm';
import { BudgetVsActualChart } from './BudgetVsActualChart';
import { BudgetAlertsPanel } from './BudgetAlertsPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, PlusCircle } from 'lucide-react';

export function BudgetDashboard() {
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [showEntryForm, setShowEntryForm] = useState(false);
  
  const { categories, entries, summary, loading, error, refetch, createEntry } = useBudgetData(fiscalYear);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const overBudgetCategories = summary?.categorySummaries.filter(c => c.utilizationPercent > 100) || [];
  const nearBudgetCategories = summary?.categorySummaries.filter(c => c.utilizationPercent >= 80 && c.utilizationPercent <= 100) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Budget Management</h2>
          <p className="text-muted-foreground">Track and manage your organization's budget</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={fiscalYear.toString()} onValueChange={(v) => setFiscalYear(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Fiscal Year" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={year.toString()}>FY {year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowEntryForm(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Planned
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalPlanned || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Actual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalActual || 0)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              {(summary?.variance || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              Variance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(summary?.variance || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.variance || 0)}
            </p>
            <p className="text-sm text-muted-foreground">
              {(summary?.variancePercent || 0).toFixed(1)}% {(summary?.variance || 0) >= 0 ? 'under' : 'over'} budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {overBudgetCategories.length > 0 && (
                <Badge variant="destructive">{overBudgetCategories.length} Over Budget</Badge>
              )}
              {nearBudgetCategories.length > 0 && (
                <Badge variant="secondary">{nearBudgetCategories.length} Near Limit</Badge>
              )}
              {overBudgetCategories.length === 0 && nearBudgetCategories.length === 0 && (
                <Badge variant="outline">All Good</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Budget vs Actual Chart */}
          <BudgetVsActualChart 
            categorySummaries={summary?.categorySummaries || []} 
          />

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Utilization by Category</CardTitle>
              <CardDescription>Track spending across budget categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {summary?.categorySummaries.map((cat) => (
                  <div key={cat.categoryId} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{cat.categoryName}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatCurrency(cat.actual)} / {formatCurrency(cat.planned)}
                        </span>
                        <Badge 
                          variant={
                            cat.utilizationPercent > 100 ? 'destructive' : 
                            cat.utilizationPercent >= 80 ? 'secondary' : 'outline'
                          }
                        >
                          {cat.utilizationPercent.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(cat.utilizationPercent, 100)} 
                      className={cat.utilizationPercent > 100 ? 'bg-red-100' : ''}
                    />
                  </div>
                ))}
                {(!summary?.categorySummaries || summary.categorySummaries.length === 0) && (
                  <p className="text-center text-muted-foreground py-4">
                    No budget data available. Add budget entries to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <BudgetCategoryManager 
            categories={categories} 
            onRefresh={refetch} 
          />
        </TabsContent>

        <TabsContent value="alerts">
          <BudgetAlertsPanel 
            categorySummaries={summary?.categorySummaries || []} 
          />
        </TabsContent>
      </Tabs>

      {/* Entry Form Dialog */}
      <BudgetEntryForm
        open={showEntryForm}
        onOpenChange={setShowEntryForm}
        categories={categories}
        fiscalYear={fiscalYear}
        onSubmit={async (data) => {
          await createEntry(data);
          setShowEntryForm(false);
        }}
      />
    </div>
  );
}
