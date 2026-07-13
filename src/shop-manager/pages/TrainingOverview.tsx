import { useState, useMemo } from 'react';
import { useAllTeamTraining } from '@/hooks/team/useAllTeamTraining';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Calendar, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function TrainingOverview() {
  const { training, isLoading } = useAllTeamTraining();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('start_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const departments = useMemo(() => {
    const depts = new Set(training.map(t => t.profile?.department).filter(Boolean));
    return Array.from(depts);
  }, [training]);

  const stats = useMemo(() => {
    const overdue = training.filter(t => t.isOverdue).length;
    const comingDue = training.filter(t => t.isComingDue).length;
    const completed = training.filter(t => t.status === 'completed').length;
    const inProgress = training.filter(t => t.status === 'in_progress').length;

    return { overdue, comingDue, completed, inProgress };
  }, [training]);

  const filteredTraining = useMemo(() => {
    let filtered = [...training];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.training_name.toLowerCase().includes(query) ||
        t.profile?.full_name.toLowerCase().includes(query) ||
        t.provider.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(t => t.isOverdue);
      } else if (statusFilter === 'coming_due') {
        filtered = filtered.filter(t => t.isComingDue);
      } else {
        filtered = filtered.filter(t => t.status === statusFilter);
      }
    }

    // Department filter
    if (departmentFilter !== 'all') {
      filtered = filtered.filter(t => t.profile?.department === departmentFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'start_date':
          aVal = new Date(a.start_date).getTime();
          bVal = new Date(b.start_date).getTime();
          break;
        case 'completion_date':
          aVal = a.completion_date ? new Date(a.completion_date).getTime() : 0;
          bVal = b.completion_date ? new Date(b.completion_date).getTime() : 0;
          break;
        case 'name':
          aVal = a.profile?.full_name || '';
          bVal = b.profile?.full_name || '';
          break;
        case 'training_name':
          aVal = a.training_name;
          bVal = b.training_name;
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [training, searchQuery, statusFilter, departmentFilter, sortBy, sortOrder]);

  const getStatusBadge = (item: typeof training[0]) => {
    if (item.isOverdue) {
      return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" />Overdue</Badge>;
    }
    if (item.isComingDue) {
      return <Badge variant="secondary" className="flex items-center gap-1 bg-amber-100 text-amber-800"><Clock className="h-3 w-3" />Due in {item.daysUntilDue} days</Badge>;
    }
    if (item.status === 'completed') {
      return <Badge variant="default" className="flex items-center gap-1 bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3" />Completed</Badge>;
    }
    if (item.status === 'in_progress') {
      return <Badge variant="secondary" className="flex items-center gap-1 bg-blue-100 text-blue-800"><Clock className="h-3 w-3" />In Progress</Badge>;
    }
    if (item.status === 'scheduled') {
      return <Badge variant="outline">Scheduled</Badge>;
    }
    return <Badge variant="outline">{item.status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Training Overview</h1>
        <p className="text-muted-foreground">Monitor all team training across departments</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Coming Due (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.comingDue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, training, or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="coming_due">Coming Due</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept || ''}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="start_date">Start Date</SelectItem>
                <SelectItem value="completion_date">Completion Date</SelectItem>
                <SelectItem value="name">Team Member</SelectItem>
                <SelectItem value="training_name">Training Name</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
          {(searchQuery || statusFilter !== 'all' || departmentFilter !== 'all') && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setDepartmentFilter('all');
                }}
              >
                Clear Filters
              </Button>
              <span className="text-sm text-muted-foreground">
                Showing {filteredTraining.length} of {training.length} records
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Training Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading training data...</div>
          ) : filteredTraining.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No training records found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Training Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Completion Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTraining.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.profile?.full_name || 'N/A'}</TableCell>
                      <TableCell>{item.profile?.department || 'N/A'}</TableCell>
                      <TableCell>{item.training_name}</TableCell>
                      <TableCell>{item.training_type}</TableCell>
                      <TableCell>{item.provider}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(item.start_date), 'MMM d, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.completion_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(item.completion_date), 'MMM d, yyyy')}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(item)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
