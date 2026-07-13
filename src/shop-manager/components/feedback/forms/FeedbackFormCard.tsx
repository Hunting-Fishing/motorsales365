
import React from 'react';
import { format } from 'date-fns';
import { Settings, Trash, BarChart, FileText } from 'lucide-react';
import { FeedbackForm } from '@/types/feedback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface FeedbackFormCardProps {
  form: FeedbackForm;
  onEdit: (formId: string) => void;
  onViewResponses: (formId: string) => void;
  onViewAnalytics: (formId: string) => void;
  onDeleteClick: (formId: string) => void;
}

export const FeedbackFormCard: React.FC<FeedbackFormCardProps> = ({
  form,
  onEdit,
  onViewResponses,
  onViewAnalytics,
  onDeleteClick,
}) => {
  return (
    <Card key={form.id} className="overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl">{form.title}</CardTitle>
          <Badge variant={form.is_active ? "success" : "secondary"}>
            {form.is_active ? "Active" : "Inactive"}
          </Badge>
        </div>
        <CardDescription className="line-clamp-2">
          {form.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-gray-500">
          <p>Created: {format(new Date(form.created_at), 'PPP')}</p>
          <p>Last updated: {format(new Date(form.updated_at), 'PPP')}</p>
          <p>Created by: {form.created_by}</p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2">
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(form.id)}
          >
            <Settings className="h-4 w-4 mr-1" />
            Edit
          </Button>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => onDeleteClick(form.id)}
            >
              <Trash className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewAnalytics(form.id)}
          >
            <BarChart className="h-4 w-4 mr-1" />
            Analytics
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onViewResponses(form.id)}
          >
            <FileText className="h-4 w-4 mr-1" />
            Responses
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
