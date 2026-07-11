import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopUsageByUser } from '@/hooks/useShopUsageByUser';
import { 
  Brain, 
  MessageSquare, 
  Phone, 
  Mail, 
  DollarSign,
  RefreshCw,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

export function TeamUsageDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  
  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    switch (selectedMonth) {
      case 'last':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'two_months':
        const twoMonths = subMonths(now, 2);
        return { start: startOfMonth(twoMonths), end: endOfMonth(twoMonths) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getDateRange();
  const { users, totals, isLoading, error, refetch } = useShopUsageByUser(start, end);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getMonthLabel = () => {
    switch (selectedMonth) {
      case 'last':
        return format(subMonths(new Date(), 1), 'MMMM yyyy');
      case 'two_months':
        return format(subMonths(new Date(), 2), 'MMMM yyyy');
      default:
        return format(new Date(), 'MMMM yyyy');
    }
  };

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive">Error loading usage data: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team API Usage</h2>
          <p className="text-muted-foreground">
            Monitor usage by team member for {getMonthLabel()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month</SelectItem>
              <SelectItem value="last">Last Month</SelectItem>
              <SelectItem value="two_months">2 Months Ago</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon" onClick={refetch} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Users</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{users.length}</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">AI Calls</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{totals.openai_calls.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">SMS</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{totals.sms_count.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Voice (min)</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{totals.voice_minutes.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Emails</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{totals.email_count.toLocaleString()}</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Est. Cost</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1 text-primary">
                {formatCurrency(totals.total_cost_cents)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage by Team Member
          </CardTitle>
          <CardDescription>
            Detailed breakdown of API usage per user, sorted by cost
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No usage data for this period</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Brain className="h-4 w-4 text-purple-500" />
                      AI
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      SMS
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Phone className="h-4 w-4 text-green-500" />
                      Voice
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Mail className="h-4 w-4 text-orange-500" />
                      Email
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Est. Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user, index) => (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index === 0 && users.length > 1 && (
                          <Badge variant="secondary" className="text-xs">Top</Badge>
                        )}
                        <div>
                          <p className="font-medium">{user.user_name || 'Unknown User'}</p>
                          <p className="text-xs text-muted-foreground">{user.user_email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono">{user.openai_calls.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono">{user.sms_count.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono">{user.voice_minutes.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono">{user.email_count.toLocaleString()}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(user.total_cost_cents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
