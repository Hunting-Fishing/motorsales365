import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Calendar, User, Loader2, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchFeedbackResponses, 
  submitStaffResponse, 
  updateFeedbackStatus,
  FeedbackItem 
} from '@/services/feedback/feedbackManagerService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'responded': return 'default';
    case 'reviewed': return 'secondary';
    case 'resolved': return 'outline';
    default: return 'destructive';
  }
};

const getCategoryColor = (category: string) => {
  switch (category) {
    case 'service': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'staff': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'pricing': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'facility': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    default: return 'bg-muted text-muted-foreground';
  }
};

const renderStars = (rating: number | null) => {
  const ratingValue = rating || 0;
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${
        i < ratingValue ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'
      }`}
    />
  ));
};

export function FeedbackManager() {
  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [responseText, setResponseText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getUser();
  }, []);

  // Fetch feedback data
  const { data: feedback = [], isLoading, refetch } = useQuery({
    queryKey: ['feedback-responses'],
    queryFn: fetchFeedbackResponses,
  });

  // Submit response mutation
  const submitResponseMutation = useMutation({
    mutationFn: async ({ feedbackId, text }: { feedbackId: string; text: string }) => {
      if (!currentUserId) throw new Error('User not authenticated');
      return submitStaffResponse(feedbackId, text, currentUserId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-responses'] });
      queryClient.invalidateQueries({ queryKey: ['feedback-stats'] });
      setResponseText('');
      // Update selected feedback to reflect response
      if (selectedFeedback) {
        setSelectedFeedback(prev => prev ? { ...prev, status: 'responded', response_text: responseText } : null);
      }
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ feedbackId, status }: { feedbackId: string; status: FeedbackItem['status'] }) => {
      return updateFeedbackStatus(feedbackId, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-responses'] });
      toast({ title: 'Status Updated', description: 'Feedback status has been updated.' });
    },
  });

  const filteredFeedback = feedback.filter(item => 
    statusFilter === 'all' || item.status === statusFilter
  );

  const handleRespond = () => {
    if (selectedFeedback && responseText.trim()) {
      submitResponseMutation.mutate({ feedbackId: selectedFeedback.id, text: responseText });
    }
  };

  const handleMarkAsReviewed = () => {
    if (selectedFeedback) {
      updateStatusMutation.mutate({ feedbackId: selectedFeedback.id, status: 'reviewed' });
    }
  };

  const handleMarkAsResolved = () => {
    if (selectedFeedback) {
      updateStatusMutation.mutate({ feedbackId: selectedFeedback.id, status: 'resolved' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Feedback List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Feedback</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="responded">Responded</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Feedback Yet</h3>
              <p className="text-muted-foreground">
                Customer feedback will appear here once they start leaving reviews.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {filteredFeedback.map((item) => (
                <Card
                  key={item.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                    selectedFeedback?.id === item.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedFeedback(item)}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{item.customer_name}</h3>
                        <Badge className={getCategoryColor(item.category)}>
                          {item.category}
                        </Badge>
                      </div>
                      <Badge variant={getStatusVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {renderStars(item.overall_rating)}
                      <span className="text-sm text-muted-foreground">
                        ({item.overall_rating || 0}/5)
                      </span>
                    </div>
                    
                    {item.comment && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.comment}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      {item.work_order_number ? (
                        <span>WO: {item.work_order_number}</span>
                      ) : (
                        <span>No work order</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Detail & Response */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedFeedback ? 'Feedback Details' : 'Select Feedback'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedFeedback ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{selectedFeedback.customer_name}</span>
                </div>
                {selectedFeedback.work_order_number && (
                  <div className="text-sm text-muted-foreground">
                    Work Order: {selectedFeedback.work_order_number}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Rating:</span>
                {renderStars(selectedFeedback.overall_rating)}
                <span className="text-sm">({selectedFeedback.overall_rating || 0}/5)</span>
              </div>

              {/* Feedback Content */}
              {selectedFeedback.comment && (
                <div>
                  <h4 className="font-medium mb-2">Customer Comment:</h4>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm">{selectedFeedback.comment}</p>
                  </div>
                </div>
              )}

              {/* Existing Response (if any) */}
              {selectedFeedback.response_text && (
                <div>
                  <h4 className="font-medium mb-2">Your Response:</h4>
                  <div className="bg-primary/10 p-3 rounded-md">
                    <p className="text-sm">{selectedFeedback.response_text}</p>
                    {selectedFeedback.responded_by_name && selectedFeedback.responded_at && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Responded by {selectedFeedback.responded_by_name} on{' '}
                        {new Date(selectedFeedback.responded_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Response Form */}
              {selectedFeedback.status !== 'responded' && selectedFeedback.status !== 'resolved' && (
                <div>
                  <h4 className="font-medium mb-2">Respond to Customer:</h4>
                  <Textarea
                    placeholder="Type your response..."
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    className="mb-3"
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleRespond} 
                      disabled={!responseText.trim() || submitResponseMutation.isPending}
                    >
                      {submitResponseMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <MessageSquare className="h-4 w-4 mr-2" />
                      )}
                      Send Response
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleMarkAsReviewed}
                      disabled={updateStatusMutation.isPending}
                    >
                      Mark as Reviewed
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleMarkAsResolved}
                  disabled={selectedFeedback.status === 'resolved'}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Mark Resolved
                </Button>
                <Button variant="outline" size="sm">
                  <ThumbsDown className="h-3 w-3 mr-1" />
                  Flag Issue
                </Button>
                {selectedFeedback.work_order_id && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open(`/work-orders/${selectedFeedback.work_order_id}`, '_blank')}
                  >
                    View Work Order
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No Feedback Selected</h3>
              <p className="text-muted-foreground">
                Select a feedback item from the list to view details and respond
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
