import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle, Clock, AlertTriangle, User } from 'lucide-react';
import { format, isPast, isFuture, addDays } from 'date-fns';

interface Assignment {
  id: string;
  employee_id: string;
  course_id: string;
  assigned_date: string;
  due_date: string | null;
  completed_date: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'overdue';
  score: number | null;
  employee?: { first_name: string | null; last_name: string | null };
  course?: { course_name: string };
}

interface Course {
  id: string;
  course_name: string;
}

interface Props {
  assignments: Assignment[];
  courses: Course[];
  loading: boolean;
  onAssign: (data: any) => Promise<boolean>;
  onUpdate: (id: string, data: any) => Promise<boolean>;
}

export function TrainingAssignmentsTab({ assignments, courses, loading, onAssign, onUpdate }: Props) {
  const [filter, setFilter] = useState<string>('all');

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.status === 'completed') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (assignment.due_date && isPast(new Date(assignment.due_date))) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    }
    if (assignment.due_date && isFuture(new Date(assignment.due_date)) && isPast(addDays(new Date(assignment.due_date), -7))) {
      return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Due Soon</Badge>;
    }
    if (assignment.status === 'in_progress') {
      return <Badge className="bg-blue-500">In Progress</Badge>;
    }
    return <Badge variant="outline">Assigned</Badge>;
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'overdue') return a.due_date && isPast(new Date(a.due_date)) && a.status !== 'completed';
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'pending') return a.status !== 'completed';
    return true;
  });

  const handleMarkComplete = async (assignment: Assignment) => {
    await onUpdate(assignment.id, {
      status: 'completed',
      completed_date: new Date().toISOString()
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No training assignments found
                </TableCell>
              </TableRow>
            ) : (
              filteredAssignments.map(assignment => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {assignment.employee?.first_name} {assignment.employee?.last_name}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {assignment.course?.course_name || 'Unknown Course'}
                  </TableCell>
                  <TableCell>
                    {format(new Date(assignment.assigned_date), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {assignment.due_date 
                      ? format(new Date(assignment.due_date), 'MMM d, yyyy')
                      : '-'
                    }
                  </TableCell>
                  <TableCell>{getStatusBadge(assignment)}</TableCell>
                  <TableCell className="text-right">
                    {assignment.status !== 'completed' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkComplete(assignment)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
