import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkOrders } from '@/hooks/useWorkOrders';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Clock, AlertTriangle, CheckCircle, Wrench, Search, Filter, X } from 'lucide-react';
import { format } from 'date-fns';

export default function WorkOrders() {
  const navigate = useNavigate();
  const { workOrders, loading, error, refetch } = useWorkOrders();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [equipmentFilter, setEquipmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Get unique equipment names for filter dropdown
  const uniqueEquipment = useMemo(() => {
    const equipment = [...new Set(
      workOrders
        .map(wo => wo.equipment_name)
        .filter(Boolean)
    )].sort();
    return equipment;
  }, [workOrders]);

  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        wo.work_order_number?.toLowerCase().includes(searchLower) ||
        wo.equipment_name?.toLowerCase().includes(searchLower) ||
        wo.customer_name?.toLowerCase().includes(searchLower) ||
        wo.customer?.toLowerCase().includes(searchLower) ||
        wo.description?.toLowerCase().includes(searchLower) ||
        wo.technician?.toLowerCase().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        wo.status?.toLowerCase() === statusFilter.toLowerCase();

      // Priority filter
      const matchesPriority = priorityFilter === 'all' || 
        wo.priority?.toLowerCase() === priorityFilter.toLowerCase();

      // Equipment filter
      const matchesEquipment = equipmentFilter === 'all' || 
        wo.equipment_name === equipmentFilter;

      // Date filter
      let matchesDate = true;
      if (dateFilter !== 'all' && wo.created_at) {
        const woDate = new Date(wo.created_at);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = woDate.toDateString() === now.toDateString();
            break;
          case 'this_week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = woDate >= weekAgo;
            break;
          case 'this_month':
            matchesDate = woDate.getMonth() === now.getMonth() && 
                         woDate.getFullYear() === now.getFullYear();
            break;
          case 'this_year':
            matchesDate = woDate.getFullYear() === now.getFullYear();
            break;
          case 'custom':
            if (customDate) {
              const selectedDate = new Date(customDate);
              matchesDate = woDate.toDateString() === selectedDate.toDateString();
            }
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesPriority && matchesEquipment && matchesDate;
    });
  }, [workOrders, searchQuery, statusFilter, priorityFilter, equipmentFilter, dateFilter, customDate]);

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || 
                          equipmentFilter !== 'all' || dateFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setPriorityFilter('all');
    setEquipmentFilter('all');
    setDateFilter('all');
    setCustomDate('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading work orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => refetch()} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-3 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Work Orders</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage service work orders and track inventory usage
              </p>
            </div>
            <Button 
              onClick={() => navigate('/work-orders/create')} 
              size="lg"
              className="w-full sm:w-auto min-h-[44px]"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Work Order
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-3 sm:px-6 py-6">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3">
            {/* Search Bar */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by work order, equipment, customer, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              {/* Equipment Filter */}
              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Wrench className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {uniqueEquipment.map((equipment) => (
                    <SelectItem key={equipment} value={equipment}>
                      {equipment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <Clock className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="this_year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Date</SelectItem>
                </SelectContent>
              </Select>

              {/* Custom Date Input */}
              {dateFilter === 'custom' && (
                <Input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  className="w-full sm:w-[180px]"
                />
              )}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">
                Showing {filteredWorkOrders.length} of {workOrders.length} work orders
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                Clear filters
              </Button>
            </div>
          )}
        </div>

        {filteredWorkOrders.length === 0 && workOrders.length > 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-foreground mb-2">
                No work orders match your filters
              </p>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search or filters
              </p>
              <Button onClick={clearFilters} variant="outline">
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : workOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold text-foreground mb-2">
                No work orders yet. Create one to get started.
              </p>
              <Button 
                onClick={() => navigate('/work-orders/create')} 
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Work Order
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWorkOrders.map((workOrder) => (
              <Card 
                key={workOrder.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/work-orders/${workOrder.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">
                        {workOrder.work_order_number || workOrder.id}
                      </CardTitle>
                      {(workOrder.equipment_name || workOrder.customer_name) && (
                        <p className="text-sm font-semibold text-primary mb-2">
                          {workOrder.equipment_name || workOrder.customer_name}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {workOrder.description?.substring(0, 50) || 'No description'}
                      </p>
                    </div>
                    <Badge 
                      className={`${getStatusColor(workOrder.status)} text-white`}
                    >
                      {workOrder.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Priority</span>
                      <Badge 
                        variant="outline" 
                        className={getPriorityColor(workOrder.priority)}
                      >
                        {workOrder.priority}
                      </Badge>
                    </div>
                    
                    {workOrder.customer && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Customer</span>
                        <span className="text-sm font-medium">{workOrder.customer}</span>
                      </div>
                    )}
                    
                    {workOrder.technician && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Technician</span>
                        <span className="text-sm font-medium">{workOrder.technician}</span>
                      </div>
                    )}
                    
                    {workOrder.created_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Created</span>
                        <span className="text-sm">
                          {format(new Date(workOrder.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
