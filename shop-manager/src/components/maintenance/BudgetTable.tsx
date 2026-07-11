import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Eye, Download } from "lucide-react";
import { MaintenanceBudget } from "@/hooks/useBudgetFilters";
import { format } from "date-fns";

interface BudgetTableProps {
  budgets: MaintenanceBudget[];
  onEdit?: (budget: MaintenanceBudget) => void;
  onDelete?: (budgetId: string) => void;
  onView?: (budget: MaintenanceBudget) => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getStatusBadge = (status: string, utilization: number) => {
  if (utilization >= 100 || status === 'exceeded') {
    return <Badge variant="destructive">Exceeded</Badge>;
  }
  if (utilization >= 80) {
    return <Badge className="bg-yellow-500 hover:bg-yellow-600">At Risk</Badge>;
  }
  if (status === 'completed') {
    return <Badge variant="secondary">Completed</Badge>;
  }
  if (status === 'draft') {
    return <Badge variant="outline">Draft</Badge>;
  }
  return <Badge className="bg-emerald-500 hover:bg-emerald-600">On Track</Badge>;
};

const getPeriodBadge = (period: string) => {
  const colors: Record<string, string> = {
    monthly: 'bg-blue-100 text-blue-700',
    quarterly: 'bg-purple-100 text-purple-700',
    yearly: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <Badge variant="outline" className={`${colors[period] || ''} capitalize`}>
      {period}
    </Badge>
  );
};

export function BudgetTable({ budgets, onEdit, onDelete, onView }: BudgetTableProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === budgets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(budgets.map((b) => b.id));
    }
  };

  const exportToCSV = () => {
    const headers = ['Budget Name', 'Period', 'Start Date', 'End Date', 'Total Budget', 'Total Spent', 'Utilization', 'Status'];
    const rows = budgets.map((b) => {
      const utilization = b.total_budget > 0 ? Math.round((b.total_spent / b.total_budget) * 100) : 0;
      return [
        b.budget_name,
        b.budget_period,
        b.start_date,
        b.end_date,
        b.total_budget,
        b.total_spent,
        `${utilization}%`,
        b.status,
      ];
    });
    
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budgets-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  if (budgets.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p className="text-muted-foreground">No budgets found. Create your first budget to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedIds.length} selected
          </span>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-1" />
            Export Selected
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              selectedIds.forEach((id) => onDelete?.(id));
              setSelectedIds([]);
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === budgets.length && budgets.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Budget Name</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Date Range</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">Spent</TableHead>
              <TableHead>Utilization</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {budgets.map((budget) => {
              const utilization = budget.total_budget > 0
                ? Math.round((budget.total_spent / budget.total_budget) * 100)
                : 0;
              const remaining = budget.total_budget - budget.total_spent;

              return (
                <TableRow key={budget.id} className="hover:bg-muted/30">
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(budget.id)}
                      onCheckedChange={() => toggleSelect(budget.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{budget.budget_name}</p>
                      {budget.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {budget.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{getPeriodBadge(budget.budget_period)}</TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {format(new Date(budget.start_date), 'MMM d')} -{' '}
                      {format(new Date(budget.end_date), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(budget.total_budget)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-medium">{formatCurrency(budget.total_spent)}</p>
                      <p className={`text-xs ${remaining >= 0 ? 'text-muted-foreground' : 'text-destructive'}`}>
                        {remaining >= 0 ? `${formatCurrency(remaining)} left` : `${formatCurrency(Math.abs(remaining))} over`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress
                        value={Math.min(utilization, 100)}
                        className={`h-2 flex-1 ${
                          utilization >= 100
                            ? '[&>div]:bg-destructive'
                            : utilization >= 80
                            ? '[&>div]:bg-yellow-500'
                            : '[&>div]:bg-emerald-500'
                        }`}
                      />
                      <span className="text-sm font-medium w-10 text-right">{utilization}%</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(budget.status, utilization)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView?.(budget)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit?.(budget)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete?.(budget.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
