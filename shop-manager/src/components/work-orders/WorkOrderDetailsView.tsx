
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router-dom';
import { WorkOrderErrorBoundary } from './WorkOrderErrorBoundary';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { useWorkOrderData } from '@/hooks/useWorkOrderData';
import { WorkOrderDetailsHeader } from './details/WorkOrderDetailsHeader';
import { WorkOrderDetailsTabs } from './details/WorkOrderDetailsTabs';
import { WorkOrderStatsCards } from './details/WorkOrderStatsCards';
import { useWorkOrderEditMode } from '@/hooks/useWorkOrderEditMode';
import { useWorkOrderStatus } from '@/hooks/useWorkOrderStatus';
import { useToast } from '@/hooks/use-toast';
import { WorkOrderPrintLayout } from './WorkOrderPrintLayout';
import { WorkOrderViewModeToggle, WorkOrderViewMode } from './details/WorkOrderViewModeToggle';
import { WorkOrderDetailedForm } from './details/WorkOrderDetailedForm';

interface WorkOrderDetailsViewProps {
  workOrderId?: string;
}

function WorkOrderDetailsContent({ workOrderId }: { workOrderId: string }) {
  const navigate = useNavigate();
  
  const {
    workOrder,
    jobLines,
    allParts,
    timeEntries,
    customer,
    isLoading,
    error,
    refreshData
  } = useWorkOrderData(workOrderId);

  const [localJobLines, setLocalJobLines] = useState(jobLines);

  const { isEditMode, isReadOnly, canEdit, isCompleted, forceEditMode, setForceEditMode } = useWorkOrderEditMode(workOrder);
  const { toast } = useToast();
  
  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState<WorkOrderViewMode>(() => {
    const saved = localStorage.getItem('workOrder-view-mode');
    return (saved as WorkOrderViewMode) || 'tabbed';
  });

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('workOrder-view-mode', viewMode);
  }, [viewMode]);
  
  // Use the actual work order status hook for updates
  const {
    status: currentStatus,
    isUpdating: isUpdatingStatus,
    error: statusError,
    updateStatus,
    clearError
  } = useWorkOrderStatus(workOrderId, workOrder?.status || 'draft');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Error loading work order: {error}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/work-orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Work Orders
          </Button>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Work order not found. It may have been deleted or you may not have permission to view it.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate('/work-orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Work Orders
          </Button>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    if (statusError) {
      clearError();
    }
    
    const result = await updateStatus(newStatus);
    
    if (result.success) {
      toast({
        title: "Status Updated",
        description: `Work order status changed to ${newStatus}`,
      });
      await refreshData(); // Refresh to get latest data
    } else {
      toast({
        title: "Update Failed",
        description: result.error || "Failed to update work order status",
        variant: "destructive",
      });
    }
  };

  const handleWorkOrderUpdate = async () => {
    await refreshData();
  };

  const handlePartsChange = async () => {
    await refreshData();
  };

  return (
    <>
      {/* Hidden Print Layout */}
      <div className="hidden print:block">
        <WorkOrderPrintLayout
          workOrder={workOrder}
          customer={customer}
          jobLines={jobLines}
          parts={allParts}
          timeEntries={timeEntries}
        />
      </div>

      {/* Regular Screen Layout */}
      <div className="space-y-10 max-w-[1600px] mx-auto print:hidden px-2 sm:px-4 lg:px-8" id="work-order-printable-content">
        {/* Navigation */}
        <div className="flex items-center gap-3 pt-4">
          <Button 
            variant="ghost" 
            size="default" 
            onClick={() => navigate('/work-orders')}
            className="hover:bg-muted/60 transition-all duration-300 rounded-xl px-4 py-2 font-medium min-h-[44px] w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Work Orders
          </Button>
        </div>

        {/* Header with Enhanced Layout */}
        <div className="space-y-8">
          <WorkOrderDetailsHeader
            workOrder={workOrder}
            customer={customer}
            currentStatus={currentStatus}
            isUpdatingStatus={isUpdatingStatus}
            onStatusChange={handleStatusChange}
            isEditMode={isEditMode}
          />
          
          {/* Controls Section */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 modern-card border border-border/30">
            {/* Edit Mode Toggle for Completed Work Orders */}
            {canEdit && isCompleted && (
              <div className="flex items-center gap-3">
                <Button
                  variant={forceEditMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setForceEditMode(!forceEditMode)}
                  className="whitespace-nowrap rounded-xl px-4 py-2 font-medium transition-all duration-300"
                >
                  {forceEditMode ? "Exit Edit Mode" : "Enable Editing"}
                </Button>
                {forceEditMode && (
                  <span className="text-sm text-muted-foreground font-medium">
                    Editing enabled for completed work order
                  </span>
                )}
              </div>
            )}
            
            <WorkOrderViewModeToggle
              mode={viewMode}
              onModeChange={setViewMode}
            />
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="relative">
          <WorkOrderStatsCards
            workOrder={workOrder}
            jobLines={jobLines}
            parts={allParts}
            timeEntries={timeEntries}
          />
        </div>

        {/* Content based on view mode */}
        {viewMode === 'tabbed' ? (
        <WorkOrderDetailsTabs
          workOrder={workOrder}
          jobLines={jobLines}
          allParts={allParts}
          timeEntries={timeEntries}
          customer={customer}
          onWorkOrderUpdate={handleWorkOrderUpdate}
          onPartsChange={handlePartsChange}
          isEditMode={isEditMode}
          setJobLines={setLocalJobLines}
        />
        ) : (
          <WorkOrderDetailedForm
            workOrder={workOrder}
            jobLines={jobLines}
            allParts={allParts}
            timeEntries={timeEntries}
            customer={customer}
            onWorkOrderUpdate={handleWorkOrderUpdate}
            onPartsChange={handlePartsChange}
            isEditMode={isEditMode}
          />
        )}
      </div>
    </>
  );
}

export function WorkOrderDetailsView({ workOrderId: propWorkOrderId }: WorkOrderDetailsViewProps) {
  const navigate = useNavigate(); 
  const { id } = useParams();
  const workOrderId = propWorkOrderId || id;

  if (!workOrderId) {
    return (
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Work Order Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>No work order ID provided.</p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => navigate('/work-orders')}>
                  Back to Work Orders
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <WorkOrderErrorBoundary>
      <WorkOrderDetailsContent workOrderId={workOrderId} />
    </WorkOrderErrorBoundary>
  );
}
