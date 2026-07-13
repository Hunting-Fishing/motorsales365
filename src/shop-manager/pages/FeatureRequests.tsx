import React, { useState } from 'react';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ThumbsUp, MessageSquare } from 'lucide-react';
import { AddFeatureRequestDialog } from '@/components/feature-requests/AddFeatureRequestDialog';
import { formatDistanceToNow } from 'date-fns';

export default function FeatureRequests() {
  const { featureRequests, isLoading } = useFeatureRequests();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      ui_ux: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      functionality: 'bg-green-500/10 text-green-700 dark:text-green-300',
      integration: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      performance: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
      security: 'bg-red-500/10 text-red-700 dark:text-red-300',
      other: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
    };
    return colors[category] || colors.other;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-slate-500/10 text-slate-700 dark:text-slate-300',
      under_review: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      approved: 'bg-green-500/10 text-green-700 dark:text-green-300',
      in_development: 'bg-purple-500/10 text-purple-700 dark:text-purple-300',
      testing: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
      completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      rejected: 'bg-red-500/10 text-red-700 dark:text-red-300',
      on_hold: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
    };
    return colors[status] || colors.submitted;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-500/10 text-gray-700 dark:text-gray-300',
      medium: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
      high: 'bg-orange-500/10 text-orange-700 dark:text-orange-300',
      critical: 'bg-red-500/10 text-red-700 dark:text-red-300',
    };
    return colors[priority] || colors.low;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Feature Requests</h1>
          <p className="text-muted-foreground mt-2">
            Submit and track application improvement requests
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="grid gap-4">
        {featureRequests?.map((request) => (
          <Card key={request.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">{request.title}</CardTitle>
                  <CardDescription>{request.description}</CardDescription>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Badge className={getStatusColor(request.status)}>
                    {request.status.replace('_', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex gap-4">
                  <Badge className={getCategoryColor(request.category)}>
                    {request.category.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      {request.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      0
                    </span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                </div>
              </div>
              {request.submitter_name && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Submitted by {request.submitter_name}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {!featureRequests?.length && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No feature requests yet. Be the first to submit one!
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <AddFeatureRequestDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
