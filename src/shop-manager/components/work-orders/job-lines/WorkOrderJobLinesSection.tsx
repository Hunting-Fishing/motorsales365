
import React, { useState } from 'react';
import { WorkOrderJobLine } from '@/types/jobLine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wrench, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { EnhancedJobLineItem } from './EnhancedJobLineItem';
import { AddJobLineDialog } from './AddJobLineDialog';
import { toast } from '@/hooks/use-toast';
import { getWorkOrderJobLines } from '@/services/workOrder/jobLinesService';

interface WorkOrderJobLinesSectionProps {
  workOrderId: string;
  jobLines: WorkOrderJobLine[];
  onJobLinesChange: (jobLines: WorkOrderJobLine[]) => void;
  isEditMode: boolean;
}

export function WorkOrderJobLinesSection({
  workOrderId,
  jobLines,
  onJobLinesChange,
  isEditMode
}: WorkOrderJobLinesSectionProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  console.log('🏗️ WorkOrderJobLinesSection render:', {
    workOrderId,
    jobLinesCount: jobLines.length,
    isEditMode,
    jobLines: jobLines.map(jl => ({ id: jl.id, name: jl.name }))
  });

  const handleJobLineUpdate = (updatedJobLine: WorkOrderJobLine) => {
    console.log('🔧 WorkOrderJobLinesSection - Job line updated:', updatedJobLine);
    const updatedJobLines = jobLines.map(jl => 
      jl.id === updatedJobLine.id ? updatedJobLine : jl
    );
    onJobLinesChange(updatedJobLines);
    
    toast({
      title: 'Success',
      description: 'Job line updated successfully',
    });
  };

  const handleJobLineAdd = (newJobLines: WorkOrderJobLine[]) => {
    console.log('➕ WorkOrderJobLinesSection - Job lines added:', newJobLines);
    const updatedJobLines = [...jobLines, ...newJobLines];
    onJobLinesChange(updatedJobLines);
    setShowAddDialog(false);
    
    toast({
      title: 'Success',
      description: `${newJobLines.length} job line(s) added successfully`,
    });
  };

  const handleRefresh = async () => {
    console.log('🔄 WorkOrderJobLinesSection - Manual refresh requested');
    setIsRefreshing(true);
    
    try {
      const refreshedJobLines = await getWorkOrderJobLines(workOrderId);
      
      console.log('✅ WorkOrderJobLinesSection - Refreshed job lines:', refreshedJobLines.length);
      onJobLinesChange(refreshedJobLines);
      
      toast({
        title: 'Refreshed',
        description: `Loaded ${refreshedJobLines.length} job lines from database`,
      });
    } catch (error: any) {
      console.error('❌ WorkOrderJobLinesSection - Refresh failed:', error);
      toast({
        title: 'Refresh Failed',
        description: error.message || 'Failed to refresh job lines',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Job Lines ({jobLines.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {isEditMode && (
                <Button 
                  onClick={() => setShowAddDialog(true)} 
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Job Line
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Debug: {jobLines.length} job lines loaded. Work Order ID: {workOrderId}
              </AlertDescription>
            </Alert>
          )}

          {jobLines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No job lines added yet.</p>
              {isEditMode && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Job Line
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {jobLines.map((jobLine) => (
                <EnhancedJobLineItem
                  key={jobLine.id}
                  jobLine={jobLine}
                  onUpdate={handleJobLineUpdate}
                  isEditMode={isEditMode}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AddJobLineDialog
        workOrderId={workOrderId}
        onJobLineAdd={handleJobLineAdd}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </>
  );
}
