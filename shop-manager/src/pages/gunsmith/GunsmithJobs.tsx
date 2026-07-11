import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ClipboardList,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { useGunsmithJobs, useUpdateGunsmithJob, useDeleteGunsmithJob } from '@/hooks/useGunsmith';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { MobilePageContainer } from '@/components/mobile/MobilePageContainer';
import { MobilePageHeader } from '@/components/mobile/MobilePageHeader';

const JOB_STATUSES = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'awaiting_parts', label: 'Awaiting Parts' },
  { value: 'completed', label: 'Completed' },
  { value: 'picked_up', label: 'Picked Up' }
];

export default function GunsmithJobs() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<{ id: string; jobNumber: string } | null>(null);

  const { data: jobs, isLoading } = useGunsmithJobs(statusFilter === 'all' ? undefined : statusFilter);
  const updateJob = useUpdateGunsmithJob();
  const deleteJob = useDeleteGunsmithJob();

  const handleDeleteClick = (e: React.MouseEvent, job: { id: string; job_number: string }) => {
    e.stopPropagation();
    setJobToDelete({ id: job.id, jobNumber: job.job_number });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (jobToDelete) {
      deleteJob.mutate(jobToDelete.id);
      setDeleteDialogOpen(false);
      setJobToDelete(null);
    }
  };

  const assigneeOptions = useMemo(() => {
    const assignees = new Set<string>();
    (jobs || []).forEach((job) => {
      if (job.assigned_to) {
        assignees.add(job.assigned_to);
      }
    });
    return Array.from(assignees);
  }, [jobs]);

  const filteredJobs = jobs?.filter((job) => {
    const matchesSearch =
      job.job_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customers?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customers?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.gunsmith_firearms?.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.gunsmith_firearms?.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAssignee = assigneeFilter === 'all' || job.assigned_to === assigneeFilter;

    const today = new Date();
    const dueDate = job.estimated_completion ? new Date(job.estimated_completion) : null;
    const isOverdue = dueDate ? dueDate < today : false;
    const isDueSoon = dueDate
      ? dueDate >= today && dueDate <= new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      : false;

    const matchesDue =
      dueFilter === 'all' ||
      (dueFilter === 'overdue' && isOverdue) ||
      (dueFilter === 'due_soon' && isDueSoon);

    return matchesSearch && matchesAssignee && matchesDue;
  });

  const isOverdue = (job: any) => {
    if (!job.estimated_completion) return false;
    return new Date(job.estimated_completion) < new Date();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'awaiting_parts': return 'bg-yellow-500';
      case 'picked_up': return 'bg-gray-500';
      default: return 'bg-amber-500';
    }
  };

  return (
    <MobilePageContainer>
      <MobilePageHeader
        title="Jobs"
        subtitle="Manage repair and service work orders"
        icon={<ClipboardList className="h-6 w-6 md:h-8 md:w-8 text-amber-600" />}
        onBack={() => navigate('/gunsmith')}
        actions={
          <Button 
            onClick={() => navigate('/gunsmith/jobs/new')}
            size="sm"
            className="w-full md:w-auto"
          >
            <Plus className="h-4 w-4 mr-1 md:mr-2" />
            New Job
          </Button>
        }
      />

      {/* Filters - Stack on mobile */}
      <div className="space-y-2 md:space-y-0 md:flex md:flex-wrap md:gap-4 mb-4 md:mb-6">
        <div className="relative flex-1 md:min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 md:flex md:gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {JOB_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {assigneeOptions.map((assignee) => (
                <SelectItem key={assignee} value={assignee}>
                  {assignee}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dueFilter} onValueChange={setDueFilter}>
            <SelectTrigger className="w-full md:w-36">
              <SelectValue placeholder="Due" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="due_soon">Due 7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Jobs List */}
      <Card>
        <CardHeader className="px-3 md:px-6 py-3 md:py-4">
          <CardTitle className="text-base md:text-lg">Work Orders</CardTitle>
        </CardHeader>
        <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
          {isLoading ? (
            <div className="space-y-2 md:space-y-3">
              {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 md:h-24 w-full" />)}
            </div>
          ) : filteredJobs?.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-muted-foreground">
              <ClipboardList className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-3 md:mb-4 opacity-50" />
              <p className="text-sm md:text-base">No jobs found</p>
              <Button variant="link" size="sm" onClick={() => navigate('/gunsmith/jobs/new')}>
                Create your first job
              </Button>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {filteredJobs?.map((job) => (
                <div
                  key={job.id}
                  className="p-3 md:p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate(`/gunsmith/jobs/${job.id}`)}
                >
                  {/* Mobile: Stack layout */}
                  <div className="space-y-2 md:space-y-0 md:flex md:items-center md:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-sm md:text-base">{job.ro_number || job.job_number}</span>
                        <Badge className={`${getStatusColor(job.status)} text-white text-xs`}>
                          {job.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{job.priority}</Badge>
                        {isOverdue(job) && (
                          <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        )}
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {job.customers?.first_name} {job.customers?.last_name} - {job.job_type}
                      </p>
                      {job.gunsmith_firearms && (
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {job.gunsmith_firearms.make} {job.gunsmith_firearms.model}
                          {job.gunsmith_firearms.serial_number && ` - S/N: ${job.gunsmith_firearms.serial_number}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between md:flex-col md:items-end md:justify-start gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
                      {job.total_cost && (
                        <p className="font-medium text-green-600 text-sm">${job.total_cost.toFixed(2)}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {job.received_date && format(new Date(job.received_date), 'MMM d, yyyy')}
                      </p>
                      <div className="flex items-center gap-2">
                        <Select
                          value={job.status}
                          onValueChange={(v) => {
                            updateJob.mutate({ id: job.id, status: v });
                          }}
                        >
                          <SelectTrigger className="w-28 md:w-36 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {JOB_STATUSES.filter(s => s.value !== 'all').map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(e, job)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete job <strong>{jobToDelete?.jobNumber}</strong>? 
              This action cannot be undone and will permanently remove this work order and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MobilePageContainer>
  );
}
