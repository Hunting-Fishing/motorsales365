import { useState } from 'react';
import { Camera, Download, Eye, Calendar, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import type { ProjectBudgetSnapshot } from '@/types/projectBudget';

interface BudgetSnapshotListProps {
  snapshots: ProjectBudgetSnapshot[];
  onCreateSnapshot: () => void;
  isCreating?: boolean;
}

export function BudgetSnapshotList({ 
  snapshots, 
  onCreateSnapshot,
  isCreating 
}: BudgetSnapshotListProps) {
  const [selectedSnapshot, setSelectedSnapshot] = useState<ProjectBudgetSnapshot | null>(null);

  const getSnapshotTypeBadge = (type: string) => {
    switch (type) {
      case 'baseline':
        return <Badge className="bg-blue-500">Baseline</Badge>;
      case 'monthly':
        return <Badge className="bg-green-500">Monthly</Badge>;
      case 'milestone':
        return <Badge className="bg-purple-500">Milestone</Badge>;
      case 'change_order':
        return <Badge className="bg-orange-500">Change Order</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (snapshots.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Snapshots Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create budget snapshots to track changes over time
          </p>
          <Button onClick={onCreateSnapshot} disabled={isCreating}>
            <Camera className="h-4 w-4 mr-2" />
            Create First Snapshot
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreateSnapshot} disabled={isCreating}>
          <Camera className="h-4 w-4 mr-2" />
          {isCreating ? 'Creating...' : 'Create Snapshot'}
        </Button>
      </div>

      <div className="grid gap-4">
        {snapshots.map((snapshot) => (
          <Card key={snapshot.id} className="hover:shadow-md transition-shadow">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-muted rounded-full">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {format(new Date(snapshot.snapshot_date), 'MMMM d, yyyy')}
                      </span>
                      {getSnapshotTypeBadge(snapshot.snapshot_type)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {snapshot.notes || 'No notes'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Budget</div>
                    <div className="font-medium">{formatCurrency(snapshot.total_budget || 0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Spent</div>
                    <div className="font-medium">{formatCurrency(snapshot.total_spent || 0)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Committed</div>
                    <div className="font-medium">{formatCurrency(snapshot.total_committed || 0)}</div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setSelectedSnapshot(snapshot)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Snapshot Details Dialog */}
      <Dialog open={!!selectedSnapshot} onOpenChange={() => setSelectedSnapshot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Budget Snapshot
              {selectedSnapshot && getSnapshotTypeBadge(selectedSnapshot.snapshot_type)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedSnapshot && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(selectedSnapshot.snapshot_date), 'MMMM d, yyyy h:mm a')}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Total Budget</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedSnapshot.total_budget || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Committed</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedSnapshot.total_committed || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Spent</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedSnapshot.total_spent || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">Forecasted</div>
                    <div className="text-xl font-bold">
                      {formatCurrency(selectedSnapshot.forecasted_total || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedSnapshot.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-muted-foreground">{selectedSnapshot.notes}</p>
                </div>
              )}

              {selectedSnapshot.phase_data && (
                <div>
                  <h4 className="font-medium mb-2">Phase Data at Snapshot</h4>
                  <div className="bg-muted rounded-lg p-4 text-sm overflow-auto max-h-48">
                    <pre>{JSON.stringify(selectedSnapshot.phase_data, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
