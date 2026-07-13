import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardCheck, Plus, Eye, Loader2, Calendar } from 'lucide-react';
import { FormSelector } from '@/components/forms/FormSelector';
import { FormDialog } from '@/components/forms/FormDialog';
import { useFormSubmissions } from '@/hooks/useFormsByCategory';
import { FormBuilderTemplate } from '@/types/formBuilder';
import { format } from 'date-fns';

interface EquipmentInspectionFormsProps {
  equipmentId: string;
}

export function EquipmentInspectionForms({ equipmentId }: EquipmentInspectionFormsProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormBuilderTemplate | null>(null);
  
  // Note: You may need to add equipment_id to form_submissions table to filter by equipment
  const { submissions, loading, refetch } = useFormSubmissions();
  
  // Filter for equipment-related forms
  const equipmentSubmissions = submissions.filter(s => 
    s.form_templates?.category === 'Equipment' ||
    s.form_templates?.category === 'Safety'
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
            <ClipboardCheck className="h-5 w-5" />
            Inspection Forms
          </CardTitle>
          <Button size="sm" onClick={() => setSelectorOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Inspection
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : equipmentSubmissions.length > 0 ? (
            <div className="space-y-3">
              {equipmentSubmissions.slice(0, 5).map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <ClipboardCheck className="h-5 w-5 text-green-600" />
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
                    <Badge variant="outline" className="text-xs">
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
              <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No inspections recorded</p>
              <p className="text-xs mt-1">Click "New Inspection" to log an equipment inspection</p>
            </div>
          )}
        </CardContent>
      </Card>

      <FormSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectForm}
        category="Equipment"
        title="Select Inspection Form"
      />

      <FormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        template={selectedTemplate}
        onSubmitSuccess={handleFormSuccess}
      />
    </>
  );
}
