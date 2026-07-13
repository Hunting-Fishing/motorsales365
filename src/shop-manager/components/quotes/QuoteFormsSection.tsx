import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Eye, Loader2, Calendar } from 'lucide-react';
import { FormSelector } from '@/components/forms/FormSelector';
import { FormDialog } from '@/components/forms/FormDialog';
import { useFormSubmissions } from '@/hooks/useFormsByCategory';
import { FormBuilderTemplate } from '@/types/formBuilder';
import { format } from 'date-fns';

interface QuoteFormsSectionProps {
  quoteId: string;
  customerId?: string;
}

export function QuoteFormsSection({ quoteId, customerId }: QuoteFormsSectionProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormBuilderTemplate | null>(null);
  
  const { submissions, loading, refetch } = useFormSubmissions(undefined, customerId);
  
  // Filter submissions related to quotes/authorization
  const quoteSubmissions = submissions.filter(s => 
    s.form_templates?.category === 'Authorization' || 
    s.form_templates?.category === 'Vehicle Intake'
  );

  const handleSelectForm = (template: FormBuilderTemplate) => {
    setSelectedTemplate(template);
    setSelectorOpen(false);
    setFormDialogOpen(true);
  };

  const handleFormSuccess = () => {
    refetch();
    setFormDialogOpen(false);
    setSelectedTemplate(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Forms & Documents
          </CardTitle>
          <Button size="sm" onClick={() => setSelectorOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Fill Form
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : quoteSubmissions.length > 0 ? (
            <div className="space-y-3">
              {quoteSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {submission.form_templates?.name || 'Unknown Form'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(submission.created_at), 'MMM d, yyyy h:mm a')}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {submission.form_templates?.category}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No forms submitted yet</p>
              <p className="text-xs mt-1">Click "Fill Form" to add authorization or intake forms</p>
            </div>
          )}
        </CardContent>
      </Card>

      <FormSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectForm}
        category="Authorization"
        title="Select a Form"
      />

      <FormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        template={selectedTemplate}
        customerId={customerId}
        onSubmitSuccess={handleFormSuccess}
      />
    </>
  );
}
