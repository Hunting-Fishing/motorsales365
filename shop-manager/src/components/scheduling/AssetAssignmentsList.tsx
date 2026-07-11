import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical, Trash2, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import type { AssetAssignment } from '@/types/assetAssignment';
import { useAssetAssignments } from '@/hooks/useAssetAssignments';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AssetAssignmentsListProps {
  assignments: AssetAssignment[];
}

const STATUS_COLORS = {
  scheduled: 'default',
  active: 'default',
  completed: 'secondary',
  cancelled: 'destructive'
} as const;

const ASSET_TYPE_LABELS = {
  equipment: 'Equipment',
  vessel: 'Vessel',
  vehicle: 'Vehicle'
};

export function AssetAssignmentsList({ assignments }: AssetAssignmentsListProps) {
  const { deleteAssignment, updateAssignment } = useAssetAssignments();

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No asset assignments found. Create one to get started.
      </div>
    );
  }

  const handleStatusChange = async (id: string, status: AssetAssignment['status']) => {
    await updateAssignment(id, { status });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this assignment?')) {
      await deleteAssignment(id);
    }
  };

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Asset Type</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignments.map((assignment) => (
            <TableRow key={assignment.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {assignment.is_recurring && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Repeat className="h-4 w-4 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Recurring: {assignment.recurrence_pattern}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {assignment.profiles?.first_name} {assignment.profiles?.last_name}
                </div>
              </TableCell>
            <TableCell>
              <Badge variant="outline">
                {ASSET_TYPE_LABELS[assignment.asset_type]}
              </Badge>
            </TableCell>
            <TableCell>
              {format(new Date(assignment.assignment_start), 'MMM d, yyyy')}
            </TableCell>
            <TableCell>
              {format(new Date(assignment.assignment_end), 'MMM d, yyyy')}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {assignment.purpose || '-'}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_COLORS[assignment.status]}>
                {assignment.status}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {assignment.status === 'scheduled' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(assignment.id, 'active')}>
                      Mark as Active
                    </DropdownMenuItem>
                  )}
                  {assignment.status === 'active' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(assignment.id, 'completed')}>
                      Mark as Completed
                    </DropdownMenuItem>
                  )}
                  {assignment.status !== 'cancelled' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(assignment.id, 'cancelled')}>
                      Cancel Assignment
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => handleDelete(assignment.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
