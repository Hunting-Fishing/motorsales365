import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTimeCards } from '@/hooks/useTimeCards';
import { usePayPeriods } from '@/hooks/usePayPeriods';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { useToast } from '@/hooks/use-toast';
import { format, isWithinInterval } from 'date-fns';
import { 
  CheckCircle, 
  Search,
  Filter,
  Edit,
  User,
  X,
  Calendar
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeCardEditDialog } from './TimeCardEditDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TimeCardWithProfile {
  id: string;
  employee_id: string;
  clock_in_time: string;
  clock_out_time: string | null;
  total_hours: number | null;
  overtime_hours: number | null;
  total_pay: number | null;
  status: string;
  employee_name?: string;
}

export function EnhancedTimeCardManager() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const { approveTimeCard, refetch } = useTimeCards();
  const { payPeriods } = usePayPeriods();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');
  const [payPeriodFilter, setPayPeriodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editingTimeCard, setEditingTimeCard] = useState<any>(null);
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());

  // Fetch time cards
  const { data: timeCardsRaw, isLoading } = useQuery({
    queryKey: ['time-cards-raw', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data, error } = await supabase
        .from('time_card_entries')
        .select('*')
        .eq('shop_id', shopId)
        .order('clock_in_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!shopId,
  });

  // Fetch profiles separately
  const { data: profiles } = useQuery({
    queryKey: ['profiles-list', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, job_title')
        .eq('shop_id', shopId);
      
      return data || [];
    },
    enabled: !!shopId,
  });

  // Merge time cards with profile names
  const timeCardsWithNames: TimeCardWithProfile[] = useMemo(() => {
    if (!timeCardsRaw || !profiles) return [];
    
    return timeCardsRaw.map((tc: any) => {
      const profile = profiles.find((p: any) => p.id === tc.employee_id);
      return {
        ...tc,
        employee_name: profile ? `${profile.first_name} ${profile.last_name}` : 'Unknown',
      };
    });
  }, [timeCardsRaw, profiles]);

  // Get unique employees for filter
  const employees = useMemo(() => {
    return profiles || [];
  }, [profiles]);

  // Filter time cards
  const filteredTimeCards = useMemo(() => {
    return timeCardsWithNames.filter((tc: TimeCardWithProfile) => {
      if (statusFilter !== 'all' && tc.status !== statusFilter) return false;
      if (employeeFilter !== 'all' && tc.employee_id !== employeeFilter) return false;
      if (searchTerm && !tc.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      
      // Date range filter
      if (dateFrom || dateTo) {
        const cardDate = new Date(tc.clock_in_time);
        if (dateFrom && cardDate < new Date(dateFrom)) return false;
        if (dateTo && cardDate > new Date(dateTo + 'T23:59:59')) return false;
      }

      // Pay period filter
      if (payPeriodFilter !== 'all') {
        const period = payPeriods?.find((p: any) => p.id === payPeriodFilter);
        if (period) {
          const cardDate = new Date(tc.clock_in_time);
          const periodStart = new Date(period.start_date);
          const periodEnd = new Date(period.end_date);
          if (!isWithinInterval(cardDate, { start: periodStart, end: periodEnd })) {
            return false;
          }
        }
      }

      return true;
    });
  }, [timeCardsWithNames, statusFilter, employeeFilter, searchTerm, dateFrom, dateTo, payPeriodFilter, payPeriods]);

  // Calculate totals
  const totals = useMemo(() => {
    return filteredTimeCards.reduce((acc, tc) => ({
      hours: acc.hours + (tc.total_hours || 0),
      overtime: acc.overtime + (tc.overtime_hours || 0),
      pay: acc.pay + (tc.total_pay || 0),
    }), { hours: 0, overtime: 0, pay: 0 });
  }, [filteredTimeCards]);

  // Handle select all
  const handleSelectAll = () => {
    if (selectedCards.size === filteredTimeCards.length) {
      setSelectedCards(new Set());
    } else {
      setSelectedCards(new Set(filteredTimeCards.map(c => c.id)));
    }
  };

  // Handle individual selection
  const handleSelectCard = (cardId: string) => {
    const newSelected = new Set(selectedCards);
    if (newSelected.has(cardId)) {
      newSelected.delete(cardId);
    } else {
      newSelected.add(cardId);
    }
    setSelectedCards(newSelected);
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    const toApprove = filteredTimeCards.filter(
      c => selectedCards.has(c.id) && c.status === 'completed'
    );

    if (toApprove.length === 0) {
      toast({
        title: 'No Cards to Approve',
        description: 'Select completed time cards to approve',
        variant: 'destructive',
      });
      return;
    }

    let successCount = 0;
    for (const card of toApprove) {
      try {
        await approveTimeCard(card.id);
        successCount++;
      } catch (error) {
        console.error('Failed to approve card:', card.id);
      }
    }

    toast({
      title: 'Bulk Approve Complete',
      description: `Approved ${successCount} of ${toApprove.length} time cards`,
    });

    setSelectedCards(new Set());
    refetch();
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setEmployeeFilter('all');
    setPayPeriodFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || employeeFilter !== 'all' || 
    payPeriodFilter !== 'all' || dateFrom || dateTo;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'secondary';
      case 'approved': return 'bg-blue-500';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>

            <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={payPeriodFilter} onValueChange={setPayPeriodFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Pay Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {payPeriods?.map((period: any) => (
                  <SelectItem key={period.id} value={period.id}>
                    {format(new Date(period.start_date), 'MMM d')} - {format(new Date(period.end_date), 'MMM d')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-3">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Hours</p>
              <p className="text-2xl font-bold">{totals.hours.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Overtime Hours</p>
              <p className="text-2xl font-bold text-orange-500">{totals.overtime.toFixed(1)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Total Pay</p>
              <p className="text-2xl font-bold text-green-600">${totals.pay.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time Cards List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Time Cards ({filteredTimeCards.length})</CardTitle>
              <CardDescription>
                Review and approve employee time entries
              </CardDescription>
            </div>
            {selectedCards.size > 0 && (
              <Button onClick={handleBulkApprove} className="bg-blue-600 hover:bg-blue-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Selected ({selectedCards.size})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {/* Header Row */}
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg font-medium text-sm mb-2">
              <Checkbox
                checked={selectedCards.size === filteredTimeCards.length && filteredTimeCards.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <div className="flex-1">Employee</div>
              <div className="w-48">Date/Time</div>
              <div className="w-24 text-right">Hours</div>
              <div className="w-24 text-right">Pay</div>
              <div className="w-24">Status</div>
              <div className="w-20">Actions</div>
            </div>

            <div className="space-y-2">
              {filteredTimeCards.map((tc) => (
                <div 
                  key={tc.id} 
                  className={`flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                    selectedCards.has(tc.id) ? 'bg-primary/5 border-primary/30' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedCards.has(tc.id)}
                    onCheckedChange={() => handleSelectCard(tc.id)}
                  />
                  <div className="flex-1 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{tc.employee_name}</span>
                  </div>
                  <div className="w-48">
                    <p className="text-sm">
                      {format(new Date(tc.clock_in_time), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(tc.clock_in_time), 'h:mm a')}
                      {tc.clock_out_time && ` - ${format(new Date(tc.clock_out_time), 'h:mm a')}`}
                    </p>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-medium">{tc.total_hours?.toFixed(2) || '—'}h</p>
                    {tc.overtime_hours && tc.overtime_hours > 0 && (
                      <p className="text-xs text-orange-500">+{tc.overtime_hours.toFixed(1)} OT</p>
                    )}
                  </div>
                  <div className="w-24 text-right">
                    {tc.total_pay ? (
                      <span className="font-medium text-green-600">${tc.total_pay.toFixed(2)}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="w-24">
                    <Badge className={tc.status === 'active' ? 'bg-green-500' : tc.status === 'approved' ? 'bg-blue-500' : ''} variant={tc.status === 'completed' ? 'secondary' : 'default'}>
                      {tc.status}
                    </Badge>
                  </div>
                  <div className="w-20 flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingTimeCard(tc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    {tc.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => approveTimeCard(tc.id)}
                        className="text-blue-600"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {filteredTimeCards.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No time cards found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingTimeCard && (
        <TimeCardEditDialog
          timeCard={editingTimeCard}
          open={!!editingTimeCard}
          onOpenChange={(open) => !open && setEditingTimeCard(null)}
          onSave={() => {
            setEditingTimeCard(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
