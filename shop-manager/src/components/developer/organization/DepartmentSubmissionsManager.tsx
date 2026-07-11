import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2, Users, TrendingUp, Check, X, MessageSquare, Search, Filter } from 'lucide-react';
import { departmentSubmissionService, DepartmentSubmission } from '@/services/team/departmentSubmissionService';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export function DepartmentSubmissionsManager() {
  const [submissions, setSubmissions] = useState<DepartmentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<DepartmentSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setIsLoading(true);
      const data = await departmentSubmissionService.getAllSubmissions();
      setSubmissions(data);
    } catch (error) {
      console.error('Failed to load department submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load department submissions.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewSubmission = async (id: string, status: 'approved' | 'rejected') => {
    try {
      await departmentSubmissionService.updateSubmissionStatus(id, status, reviewNotes);
      await loadSubmissions();
      setSelectedSubmission(null);
      setReviewNotes('');
      
      toast({
        title: "Success",
        description: `Department submission ${status} successfully.`,
      });
    } catch (error) {
      console.error('Failed to review submission:', error);
      toast({
        title: "Error",
        description: "Failed to update submission status.",
        variant: "destructive"
      });
    }
  };

  // Filter submissions based on search and status
  const filteredSubmissions = submissions.filter(submission => {
    const matchesSearch = submission.department_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         submission.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || submission.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group submissions by status for stats
  const stats = {
    total: submissions.length,
    pending: submissions.filter(s => s.status === 'pending_review').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    rejected: submissions.filter(s => s.status === 'rejected').length
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return <Badge variant="secondary">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-700 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold">Department Submissions</h3>
          <p className="text-sm text-muted-foreground">
            Review custom department submissions from users across all shops.
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Total Submissions</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium">Pending Review</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Approved</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="modern-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium">Rejected</p>
                <p className="text-2xl font-bold">{stats.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search department submissions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending_review">Pending Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Submissions List */}
      <div className="grid gap-4">
        {filteredSubmissions.length === 0 ? (
          <Card className="modern-card">
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {searchQuery || statusFilter !== 'all' ? (
                  <p>No submissions found matching your filters.</p>
                ) : (
                  <p>No department submissions yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredSubmissions.map((submission) => (
            <Card key={submission.id} className="modern-card hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-base font-heading">
                        {submission.department_name}
                      </CardTitle>
                      {getStatusBadge(submission.status)}
                    </div>
                    
                    {submission.description && (
                      <p className="text-sm text-muted-foreground mb-2">
                        {submission.description}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Submitted: {format(new Date(submission.submitted_at), 'MMM d, yyyy')}
                      </span>
                      <span>
                        Usage: {submission.usage_count} times
                      </span>
                      {submission.reviewed_at && (
                        <span>
                          Reviewed: {format(new Date(submission.reviewed_at), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {submission.status === 'pending_review' && (
                      <>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedSubmission(submission)}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Department Submission</DialogTitle>
                            </DialogHeader>
                            
                            <div className="space-y-4">
                              <div>
                                <h4 className="font-medium mb-2">Department Details</h4>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="font-medium">{submission.department_name}</p>
                                  {submission.description && (
                                    <p className="text-sm text-muted-foreground">
                                      {submission.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              <div>
                                <label className="text-sm font-medium">Review Notes (Optional)</label>
                                <Textarea
                                  value={reviewNotes}
                                  onChange={(e) => setReviewNotes(e.target.value)}
                                  placeholder="Add any notes about this submission..."
                                  className="mt-1"
                                />
                              </div>
                              
                              <div className="flex gap-2">
                                <Button
                                  onClick={() => handleReviewSubmission(submission.id, 'approved')}
                                  className="flex-1 bg-green-500 hover:bg-green-600"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => handleReviewSubmission(submission.id, 'rejected')}
                                  variant="destructive"
                                  className="flex-1"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                    
                    {submission.review_notes && (
                      <div className="max-w-xs">
                        <p className="text-xs text-muted-foreground">
                          <strong>Review Notes:</strong> {submission.review_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}