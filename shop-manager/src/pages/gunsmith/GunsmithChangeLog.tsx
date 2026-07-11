import React, { useState, useMemo } from 'react';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  Plus,
  Search,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { SubmitChangeRequestDialog } from '@/components/gunsmith/SubmitChangeRequestDialog';
import { ChangeRequestDetail } from '@/components/gunsmith/ChangeRequestDetail';
import { format } from 'date-fns';
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from '@/types/feature-requests';
import type { FeatureRequest } from '@/types/feature-requests';

export default function GunsmithChangeLog() {
  const { featureRequests, isLoading, exportFeatureRequests } = useFeatureRequests('gunsmith');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    return featureRequests.filter((request) => {
      const matchesSearch =
        request.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.submitter_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `RQ-${request.request_number}`.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [featureRequests, searchTerm, statusFilter]);

  const getStatusBadge = (status: FeatureRequest['status']) => {
    const statusOption = STATUS_OPTIONS.find((s) => s.value === status);
    return (
      <Badge className={`${statusOption?.color || 'bg-gray-500'} text-white text-xs`}>
        {statusOption?.label || status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: FeatureRequest['priority']) => {
    const priorityOption = PRIORITY_OPTIONS.find((p) => p.value === priority);
    return (
      <span className={`text-xs font-medium ${priorityOption?.color || 'text-gray-500'}`}>
        {priorityOption?.label || priority}
      </span>
    );
  };

  const toggleExpanded = (id: string) => {
    setExpandedRequestId(expandedRequestId === id ? null : id);
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Feedback Log"
        subtitle="Track feature requests and development progress"
        icon={<ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportFeatureRequests()}
              disabled={featureRequests.length === 0}
            >
              <Download className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button size="sm" onClick={() => setShowSubmitDialog(true)}>
              <Plus className="h-4 w-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New </span>Request
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{featureRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-xl font-bold text-purple-500">
              {featureRequests.filter((r) => r.status === 'in_development').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-bold text-green-500">
              {featureRequests.filter((r) => r.status === 'completed').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-amber-500">
              {featureRequests.filter((r) => ['submitted', 'under_review'].includes(r.status)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No change requests found</p>
              <Button onClick={() => setShowSubmitDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Submit Your First Request
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead className="min-w-[80px]">Date</TableHead>
                    <TableHead className="min-w-[120px]">Requested By</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="min-w-[180px]">Reason</TableHead>
                    <TableHead className="min-w-[80px]">Priority</TableHead>
                    <TableHead className="min-w-[120px]">Status</TableHead>
                    <TableHead className="w-[60px]">Votes</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => {
                    const isExpanded = expandedRequestId === request.id;
                    return [
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleExpanded(request.id)}
                      >
                        <TableCell className="font-mono text-sm">
                          RQ-{request.request_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {request.submitter_name || 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <p className="font-medium text-sm truncate">{request.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {request.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-muted-foreground truncate max-w-[180px]">
                            {request.reason_for_change || '—'}
                          </p>
                        </TableCell>
                        <TableCell>{getPriorityBadge(request.priority)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{request.vote_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </TableCell>
                      </TableRow>,
                      isExpanded && (
                        <TableRow key={`${request.id}-detail`}>
                          <TableCell colSpan={9} className="bg-muted/30 p-0">
                            <ChangeRequestDetail request={request} />
                          </TableCell>
                        </TableRow>
                      ),
                    ];
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Dialog */}
      <SubmitChangeRequestDialog
        open={showSubmitDialog}
        onOpenChange={setShowSubmitDialog}
        defaultModule="gunsmith"
      />
    </MobilePageContainer>
  );
}
