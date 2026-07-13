import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, List, CalendarDays } from 'lucide-react';
import { useAssetAssignments } from '@/hooks/useAssetAssignments';
import { AssetAssignmentsList } from './AssetAssignmentsList';
import { AddAssetAssignmentDialog } from './AddAssetAssignmentDialog';
import { AssetAssignmentTimeline } from './AssetAssignmentTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function AssetAssignments() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { assignments, loading } = useAssetAssignments();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5" />
              <CardTitle>Asset Assignments</CardTitle>
            </div>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Asset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading assignments...</div>
          ) : (
            <Tabs defaultValue="list" className="space-y-4">
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <List className="h-4 w-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="timeline" className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="list">
                <AssetAssignmentsList assignments={assignments} />
              </TabsContent>
              
              <TabsContent value="timeline">
                <AssetAssignmentTimeline assignments={assignments} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <AddAssetAssignmentDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
