import React, { useState, useEffect } from 'react';
import { ChevronUp, ChevronDown, MessageSquare, Calendar, User, Clock, Filter, Search, Star, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { FeatureRequest, FeatureRequestVote } from '@/types/feature-requests';
import { supabase } from '@/integrations/supabase/client';

interface FeatureRequestBoardProps {
  onRequestFeature?: () => void;
}

export function FeatureRequestBoard({ onRequestFeature }: FeatureRequestBoardProps) {
  const { featureRequests, isLoading, voteOnFeatureRequest, getUserVote } = useFeatureRequests();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('votes');
  const [userVotes, setUserVotes] = useState<Record<string, FeatureRequestVote>>({});

  useEffect(() => {
    loadUserVotes();
  }, [featureRequests]);

  const loadUserVotes = async () => {
    const votes: Record<string, FeatureRequestVote> = {};
    
    for (const request of featureRequests) {
      const vote = await getUserVote(request.id);
      if (vote) {
        votes[request.id] = vote;
      }
    }
    
    setUserVotes(votes);
  };

  const handleVote = async (requestId: string, voteType: 'upvote' | 'downvote') => {
    const success = await voteOnFeatureRequest(requestId, voteType);
    if (success) {
      // Reload user votes
      loadUserVotes();
    }
  };

  const filteredRequests = featureRequests.filter(request => {
    const matchesSearch = request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         request.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || request.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesPriority && request.is_public;
  });

  const sortedRequests = [...filteredRequests].sort((a, b) => {
    switch (sortBy) {
      case 'votes':
        return b.vote_count - a.vote_count;
      case 'recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'priority':
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      default:
        return 0;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'secondary';
      case 'under_review': return 'warning';
      case 'approved': return 'success';
      case 'in_development': return 'primary';
      case 'testing': return 'warning';
      case 'completed': return 'success';
      case 'rejected': return 'destructive';
      case 'on_hold': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'secondary';
      case 'medium': return 'warning';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'secondary';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ui_ux': return '🎨';
      case 'functionality': return '⚙️';
      case 'integration': return '🔗';
      case 'performance': return '⚡';
      case 'security': return '🔒';
      default: return '💡';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Feature Requests
          </h2>
          <p className="text-muted-foreground">Vote on feature requests and suggest new ideas</p>
        </div>
        
        {onRequestFeature && (
          <Button onClick={onRequestFeature} className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Request Feature
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search feature requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="ui_ux">UI & UX</SelectItem>
            <SelectItem value="functionality">Functionality</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="security">Security</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="in_development">In Development</SelectItem>
            <SelectItem value="testing">Testing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="votes">Most Votes</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Feature Requests List */}
      <div className="space-y-4">
        {sortedRequests.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No feature requests found</h3>
              <p className="text-muted-foreground">
                {searchQuery || categoryFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Be the first to suggest a new feature!'
                }
              </p>
              {onRequestFeature && (
                <Button onClick={onRequestFeature} className="mt-4">
                  Request Feature
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedRequests.map((request) => {
            const userVote = userVotes[request.id];
            return (
              <Card key={request.id} className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    {/* Voting Section */}
                    <div className="flex flex-col items-center gap-1 min-w-[60px]">
                      <Button
                        variant={userVote?.vote_type === 'upvote' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleVote(request.id, 'upvote')}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <span className="font-bold text-lg">{request.upvotes - request.downvotes}</span>
                      <Button
                        variant={userVote?.vote_type === 'downvote' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleVote(request.id, 'downvote')}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getCategoryIcon(request.category)}</span>
                            <CardTitle className="text-lg">{request.title}</CardTitle>
                            {request.is_featured && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <CardDescription>{request.description}</CardDescription>
                          
                          {/* Tags */}
                          {request.tags && request.tags.length > 0 && (
                            <div className="flex gap-1 flex-wrap">
                              {request.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {request.submitter_name && (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {request.submitter_name}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(request.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {request.vote_count} votes
                            </div>
                          </div>
                        </div>

                        {/* Status and Priority */}
                        <div className="flex flex-col gap-2 items-end">
                          <Badge variant={getStatusColor(request.status) as any}>
                            {request.status.replace('_', ' ')}
                          </Badge>
                          <Badge variant={getPriorityColor(request.priority) as any}>
                            {request.priority}
                          </Badge>
                        </div>
                      </div>

                      {/* Technical Details */}
                      {(request.technical_requirements || request.implementation_notes) && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          {request.technical_requirements && (
                            <div>
                              <strong>Technical Requirements:</strong> {request.technical_requirements}
                            </div>
                          )}
                          {request.implementation_notes && (
                            <div>
                              <strong>Implementation Notes:</strong> {request.implementation_notes}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}