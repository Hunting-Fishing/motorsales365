
import React, { useState, useEffect } from 'react';
import { WorkOrder } from '@/types/workOrder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Phone, Mail } from 'lucide-react';

interface WorkOrderCommunicationsProps {
  workOrder: WorkOrder;
  isEditMode?: boolean;
}

export function WorkOrderCommunications({ 
  workOrder, 
  isEditMode = false 
}: WorkOrderCommunicationsProps) {
  return (
    <div className="space-y-6">
      {/* Communications Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Communications
            </CardTitle>
            {isEditMode && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-8 px-3">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button size="sm" variant="outline" className="h-8 px-3">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button size="sm" className="h-8 px-3">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-sm">No communications recorded yet</p>
            {isEditMode && (
              <p className="text-xs mt-2">Add calls, emails, or notes related to this work order</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
