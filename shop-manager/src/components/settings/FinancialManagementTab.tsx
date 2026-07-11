import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, FileText, Building, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { useFinancialDashboard } from "@/hooks/useFinancialDashboard";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export function FinancialManagementTab() {
  const currentYear = new Date().getFullYear();
  const { overview, budgetCategories, taxFilings, isLoading } = useFinancialDashboard();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'on_track':
        return <Badge variant="secondary">On Track</Badge>;
      case 'monitoring':
        return <Badge variant="outline">Monitoring</Badge>;
      case 'over_budget':
        return <Badge variant="destructive">Over Budget</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getFilingStatusBadge = (status: string) => {
    switch (status) {
      case 'filed':
        return <Badge className="bg-green-500">Filed</Badge>;
      case 'overdue':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'draft':
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Financial Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <DollarSign className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(overview.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">FY {currentYear}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(overview.ytdExpenses)}</div>
            <p className="text-xs text-muted-foreground">{overview.budgetUtilization.toFixed(0)}% of budget</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grant Funds</CardTitle>
            <Building className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(overview.grantFunds)}</div>
            <p className="text-xs text-muted-foreground">Active grants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tax Filings</CardTitle>
            <FileText className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{overview.taxFilingsDue}</div>
            <p className="text-xs text-muted-foreground">Due filings</p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Management */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Management</CardTitle>
          <CardDescription>
            Track and manage your organization's budget categories and spending
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {budgetCategories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No budget categories configured. Create categories to track spending.
              </p>
            ) : (
              budgetCategories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-semibold">{category.name}</h4>
                      {category.description && (
                        <p className="text-sm text-muted-foreground">{category.description}</p>
                      )}
                    </div>
                    {getStatusBadge(category.status)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(category.budgetLimit)} budgeted</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      <span>{formatCurrency(category.actualSpent)} spent</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={category.utilization > 100 ? 'text-red-600' : category.utilization > 80 ? 'text-yellow-600' : 'text-green-600'}>
                        {category.utilization.toFixed(0)}% utilized
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {category.status === 'over_budget' ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-600" />
                          <span className="text-red-600">Over budget</span>
                        </>
                      ) : category.status === 'monitoring' ? (
                        <>
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          <span>Watch closely</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>On track</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button asChild>
              <Link to="/accounting-integration">Manage Budgets</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/reports?tab=budget">Budget vs Actual Report</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Reports & Compliance */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tax Documents & Compliance</CardTitle>
            <CardDescription>
              Manage tax filings and compliance requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {taxFilings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No tax filings tracked yet.
                </p>
              ) : (
                taxFilings.map((filing) => (
                  <div key={filing.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{filing.filing_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(new Date(filing.due_date), 'MMMM d, yyyy')}
                      </p>
                    </div>
                    {getFilingStatusBadge(filing.status)}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm">Add Filing</Button>
              <Button size="sm" variant="outline">View Calendar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asset Tracking</CardTitle>
            <CardDescription>
              Monitor organization assets and depreciation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Asset Value</span>
                <span className="font-semibold">{formatCurrency(overview.totalAssetValue)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link to="/equipment">View Assets</Link>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <Link to="/equipment/dashboard">Asset Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Reports</CardTitle>
          <CardDescription>
            Generate and manage financial reports for stakeholders
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border rounded-lg p-4 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium mb-1">Cash Flow Statement</h4>
              <p className="text-sm text-muted-foreground mb-3">Monthly cash flow analysis</p>
              <Button size="sm" variant="outline" asChild>
                <Link to="/accounting-integration?tab=reports">Generate</Link>
              </Button>
            </div>

            <div className="border rounded-lg p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium mb-1">Budget vs Actual</h4>
              <p className="text-sm text-muted-foreground mb-3">Performance comparison</p>
              <Button size="sm" variant="outline" asChild>
                <Link to="/reports?tab=budget">Generate</Link>
              </Button>
            </div>

            <div className="border rounded-lg p-4 text-center">
              <Building className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-medium mb-1">Grant Utilization</h4>
              <p className="text-sm text-muted-foreground mb-3">Grant fund usage report</p>
              <Button size="sm" variant="outline" asChild>
                <Link to="/reports?tab=grants">Generate</Link>
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button asChild>
              <Link to="/accounting-integration?tab=reports">All Financial Reports</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/reports">Reports Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
