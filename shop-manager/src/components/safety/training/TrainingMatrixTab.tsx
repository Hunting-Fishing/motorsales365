import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { isPast, addDays, isFuture } from 'date-fns';

interface Assignment {
  id: string;
  employee_id: string;
  course_id: string;
  due_date: string | null;
  completed_date: string | null;
  status: 'assigned' | 'in_progress' | 'completed' | 'expired' | 'overdue';
  employee?: { first_name: string | null; last_name: string | null };
  course?: { course_name: string };
}

interface Course {
  id: string;
  course_name: string;
  is_required: boolean;
}

interface Props {
  assignments: Assignment[];
  courses: Course[];
  loading: boolean;
}

export function TrainingMatrixTab({ assignments, courses, loading }: Props) {
  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  // Get unique employees
  const employeeMap = new Map<string, { id: string; name: string }>();
  assignments.forEach(a => {
    if (a.employee_id && a.employee) {
      employeeMap.set(a.employee_id, {
        id: a.employee_id,
        name: `${a.employee.first_name || ''} ${a.employee.last_name || ''}`.trim() || 'Unknown'
      });
    }
  });
  const employees = Array.from(employeeMap.values());

  const getStatus = (employeeId: string, courseId: string) => {
    const assignment = assignments.find(
      a => a.employee_id === employeeId && a.course_id === courseId
    );
    
    if (!assignment) return 'not_assigned';
    if (assignment.status === 'completed') return 'completed';
    if (assignment.due_date && isPast(new Date(assignment.due_date))) return 'overdue';
    if (assignment.due_date && isFuture(new Date(assignment.due_date)) && isPast(addDays(new Date(assignment.due_date), -7))) return 'due_soon';
    return 'assigned';
  };

  const getStatusCell = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-green-500" />
          </div>
        );
      case 'overdue':
        return (
          <div className="flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
        );
      case 'due_soon':
        return (
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 text-yellow-500" />
          </div>
        );
      case 'assigned':
        return (
          <div className="flex items-center justify-center">
            <Clock className="h-5 w-5 text-blue-500" />
          </div>
        );
      default:
        return (
          <div className="flex items-center justify-center">
            <XCircle className="h-5 w-5 text-muted-foreground/30" />
          </div>
        );
    }
  };

  if (courses.length === 0 || employees.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {courses.length === 0 
              ? 'No courses available. Create courses first to build the training matrix.'
              : 'No training assignments yet. Assign training to employees to see the matrix.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Training Compliance Matrix</CardTitle>
          <CardDescription>Visual overview of training status for all employees</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 text-sm flex-wrap">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>Assigned</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Due Soon</span>
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>Overdue</span>
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-muted-foreground/30" />
              <span>Not Assigned</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border p-2 bg-muted text-left font-medium">Employee</th>
                  {courses.map(course => (
                    <th key={course.id} className="border p-2 bg-muted text-center font-medium min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs">{course.course_name}</span>
                        {course.is_required && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">Required</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(employee => (
                  <tr key={employee.id}>
                    <td className="border p-2 font-medium">{employee.name}</td>
                    {courses.map(course => (
                      <td key={course.id} className="border p-2">
                        {getStatusCell(getStatus(employee.id, course.id))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
