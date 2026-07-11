
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Eye, Clock, User } from 'lucide-react';
import { format } from 'date-fns';

interface FormSubmission {
  id: string;
  submitted_at: string;
  submitted_by: string | null;
  status: string;
  submitted_data: Record<string, any>;
  form_templates: {
    id: string;
    name: string;
    category: string;
    description: string | null;
  } | null;
}

interface WorkOrderFormsListProps {
  submissions: FormSubmission[];
  loading: boolean;
  onViewSubmission?: (submission: FormSubmission) => void;
}

export function WorkOrderFormsList({
  submissions,
  loading,
  onViewSubmission
}: WorkOrderFormsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-pulse text-muted-foreground">Loading submissions...</div>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-30" />
        <p className="text-sm font-medium">No forms submitted yet</p>
        <p className="text-xs mt-1">Click "Fill New Form" to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => (
        <Card key={submission.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm">
                    {submission.form_templates?.name || 'Unknown Form'}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                    </span>
                    {submission.submitted_by && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {submission.submitted_by}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {submission.form_templates?.category || 'General'}
                    </Badge>
                    <Badge 
                      variant={submission.status === 'submitted' ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {submission.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewSubmission?.(submission)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
