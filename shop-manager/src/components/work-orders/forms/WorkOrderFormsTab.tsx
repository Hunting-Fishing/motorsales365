
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, FileText, RefreshCw, Eye, Calendar, User } from 'lucide-react';
import { FormSelector } from '@/components/forms/FormSelector';
import { FormDialog } from '@/components/forms/FormDialog';
import { WorkOrderFormsList } from './WorkOrderFormsList';
import { useFormSubmissions } from '@/hooks/useFormsByCategory';
import { FormBuilderTemplate } from '@/types/formBuilder';
import { WorkOrder } from '@/types/workOrder';
import { format } from 'date-fns';

interface WorkOrderFormsTabProps {
  workOrder: WorkOrder;
}

export function WorkOrderFormsTab({ workOrder }: WorkOrderFormsTabProps) {
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormBuilderTemplate | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<any>(null);

  const { submissions, loading, refetch } = useFormSubmissions(
    workOrder.id,
    workOrder.customer_id,
    workOrder.vehicle_id
  );

  const handleSelectForm = (template: FormBuilderTemplate) => {
    setSelectedTemplate(template);
    setFormDialogOpen(true);
  };

  const handleFormSubmitSuccess = () => {
    refetch();
  };

  const handleViewSubmission = (submission: any) => {
    setViewSubmission(submission);
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Work Order Forms</h3>
          <span className="text-sm text-muted-foreground">
            ({submissions.length} submitted)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setSelectorOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Fill New Form
          </Button>
        </div>
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
          onClick={() => setSelectorOpen(true)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Inspection Form</p>
              <p className="text-xs text-muted-foreground">Vehicle or equipment inspection</p>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
          onClick={() => setSelectorOpen(true)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <FileText className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Authorization Form</p>
              <p className="text-xs text-muted-foreground">Customer approval & signatures</p>
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow border-dashed"
          onClick={() => setSelectorOpen(true)}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="font-medium text-sm">Safety Checklist</p>
              <p className="text-xs text-muted-foreground">Pre-service safety check</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submitted forms list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Submitted Forms</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkOrderFormsList
            submissions={submissions}
            loading={loading}
            onViewSubmission={handleViewSubmission}
          />
        </CardContent>
      </Card>

      {/* Form selector modal */}
      <FormSelector
        open={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        onSelect={handleSelectForm}
        title="Select Form to Fill"
      />

      {/* Form dialog */}
      <FormDialog
        open={formDialogOpen}
        onClose={() => {
          setFormDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        workOrderId={workOrder.id}
        customerId={workOrder.customer_id}
        vehicleId={workOrder.vehicle_id}
        onSubmitSuccess={handleFormSubmitSuccess}
      />

      {/* View Submission Dialog */}
      <Dialog open={!!viewSubmission} onOpenChange={(open) => !open && setViewSubmission(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Form Submission Details
            </DialogTitle>
          </DialogHeader>
          {viewSubmission && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted:</span>
                    <span>{format(new Date(viewSubmission.submitted_at || viewSubmission.created_at), 'PPp')}</span>
                  </div>
                  {viewSubmission.submitted_by_name && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">By:</span>
                      <span>{viewSubmission.submitted_by_name}</span>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Form Responses</h4>
                  <div className="space-y-3">
                    {viewSubmission.form_data && typeof viewSubmission.form_data === 'object' ? (
                      Object.entries(viewSubmission.form_data).map(([key, value]: [string, any]) => (
                        <div key={key} className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm font-medium text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="mt-1">
                            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                             typeof value === 'object' ? JSON.stringify(value, null, 2) : 
                             String(value) || '—'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No form data available</p>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
