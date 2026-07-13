
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FollowUpsList } from '@/components/follow-ups/FollowUpsList';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Filter, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useShopName } from "@/hooks/useShopName";
import { getInitials } from '@/utils/teamUtils';

export default function CustomerFollowUps() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);
  
  const { followUps, isLoading, error } = useFollowUps();

  // Filter followUps based on search term, status, type, and date
  const filteredFollowUps = followUps.filter(followUp => {
    const matchesSearch = searchTerm === '' || 
      followUp.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      followUp.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || followUp.status === statusFilter;
    
    const matchesType = typeFilter === 'all' || followUp.type === typeFilter;
    
    const matchesDate = !date || 
      format(new Date(followUp.dueDate), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
    
    return matchesSearch && matchesStatus && matchesType && matchesDate;
  });
  
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setDate(undefined);
  };
  
  const activeFiltersCount = [
    statusFilter !== 'all' ? 1 : 0,
    typeFilter !== 'all' ? 1 : 0,
    date ? 1 : 0
  ].reduce((a, b) => a + b, 0);

  const { shopName } = useShopName();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Helmet>
        <title>{`Customer Follow-Ups | ${shopName || "All Business 365"}`}</title>
        <meta name="description" content="Manage and track customer follow-ups, callbacks, and scheduled contacts." />
      </Helmet>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Follow-Ups</h1>
          <p className="text-muted-foreground">Manage callbacks, scheduled contacts, and follow-up tasks</p>
        </div>
        <Button className="self-start">
          <PlusCircle className="mr-2 h-4 w-4" />
          New Follow-Up
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search customers or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
          
          {activeFiltersCount > 0 && (
            <Button variant="ghost" onClick={clearFilters} className="text-sm">
              Clear
            </Button>
          )}
        </div>
      </div>
      
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="callback">Callback</SelectItem>
                <SelectItem value="maintenance">Maintenance Reminder</SelectItem>
                <SelectItem value="survey">Survey</SelectItem>
                <SelectItem value="quote">Quote Follow-Up</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Filter by date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <FollowUpsList 
        followUps={filteredFollowUps} 
        isLoading={isLoading}
        error={error}
        getInitials={getInitials}
      />
    </div>
  );
}
