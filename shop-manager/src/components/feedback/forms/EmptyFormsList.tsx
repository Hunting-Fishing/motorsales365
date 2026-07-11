
import React from 'react';
import { FileText, PlusCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface EmptyFormsListProps {
  onCreateForm: () => void;
}

export const EmptyFormsList: React.FC<EmptyFormsListProps> = ({ onCreateForm }) => {
  return (
    <Card>
      <CardContent className="pt-6 flex flex-col items-center justify-center h-48">
        <FileText className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg text-gray-600">No feedback forms created yet</p>
        <p className="text-sm text-gray-500 mt-1">Create a form to start collecting customer feedback</p>
        <Button className="mt-4" onClick={onCreateForm}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create First Form
        </Button>
      </CardContent>
    </Card>
  );
};
