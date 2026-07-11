import { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useProjectDetails } from '@/hooks/useProjectBudgets';
import { formatCurrency } from '@/lib/utils';
import type { ProjectCostItem, ProjectPhase } from '@/types/projectBudget';
import { COST_CATEGORIES } from '@/types/projectBudget';

interface CostItemListProps {
  costItems: ProjectCostItem[];
  phases: ProjectPhase[];
  projectId: string;
}

export function CostItemList({ costItems, phases, projectId }: CostItemListProps) {
  const { deleteCostItem } = useProjectDetails(projectId);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteItemId) return;
    await deleteCostItem.mutateAsync(deleteItemId);
    setDeleteItemId(null);
  };

  const getPhase = (phaseId: string | null) => {
    if (!phaseId) return null;
    return phases.find(p => p.id === phaseId);
  };

  const formatCategory = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Group by category for summary
  const categoryTotals = costItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = { budgeted: 0, committed: 0, spent: 0 };
    }
    acc[item.category].budgeted += item.budgeted_amount || 0;
    acc[item.category].committed += item.committed_amount || 0;
    acc[item.category].spent += item.actual_spent || 0;
    return acc;
  }, {} as Record<string, { budgeted: number; committed: number; spent: number }>);

  if (costItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No cost items yet. Add cost items to track spending by category.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(categoryTotals).map(([category, totals]) => {
          const spentPercent = totals.budgeted > 0 ? (totals.spent / totals.budgeted) * 100 : 0;
          return (
            <Card key={category} className="p-4">
              <h4 className="text-sm font-medium text-muted-foreground">{formatCategory(category)}</h4>
              <div className="text-lg font-bold mt-1">
                {formatCurrency(totals.spent)} / {formatCurrency(totals.budgeted)}
              </div>
              <Progress value={spentPercent} className="h-1.5 mt-2" />
            </Card>
          );
        })}
      </div>

      {/* Cost Items Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Phase</TableHead>
              <TableHead className="text-right">Budgeted</TableHead>
              <TableHead className="text-right">Committed</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {costItems.map((item) => {
              const phase = getPhase(item.phase_id);
              const variance = (item.budgeted_amount || 0) - (item.actual_spent || 0);
              const isOverBudget = variance < 0;

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.description || 'No description'}</p>
                      {item.purchase_order_number && (
                        <p className="text-xs text-muted-foreground">PO: {item.purchase_order_number}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatCategory(item.category)}</Badge>
                  </TableCell>
                  <TableCell>
                    {phase ? (
                      <span className="text-sm">{phase.phase_name}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">General</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.budgeted_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.committed_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.actual_spent)}
                  </TableCell>
                  <TableCell className={`text-right ${isOverBudget ? 'text-destructive' : 'text-green-600'}`}>
                    {isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(variance))}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteItemId(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Cost Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this cost item.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
