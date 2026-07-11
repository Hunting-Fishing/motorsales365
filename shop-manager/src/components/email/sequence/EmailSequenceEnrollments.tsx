
import React, { useEffect, useState } from 'react';
import { 
  Card, CardContent, CardDescription, CardHeader, CardTitle 
} from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Play, Pause, X, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { useEmailSequences } from '@/hooks/email/useEmailSequences';
import { Skeleton } from '@/components/ui/skeleton';
import { EmailSequenceEnrollment } from '@/types/email';
import { ProcessEnrollmentStepButton } from './ProcessEnrollmentStepButton';

interface EmailSequenceEnrollmentsProps {
  sequenceId: string;
}

export function EmailSequenceEnrollments({ sequenceId }: EmailSequenceEnrollmentsProps) {
  const { 
    enrollments, 
    enrollmentsLoading, 
    fetchCustomerEnrollments,
    pauseEnrollment,
    resumeEnrollment,
    cancelEnrollment
  } = useEmailSequences();
  
  useEffect(() => {
    if (sequenceId) {
      fetchCustomerEnrollments(sequenceId);
    }
  }, [sequenceId, fetchCustomerEnrollments]);
  
  if (enrollmentsLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-48" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="h-4 w-64" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const handlePause = async (enrollmentId: string) => {
    await pauseEnrollment(enrollmentId);
    fetchCustomerEnrollments(sequenceId);
  };
  
  const handleResume = async (enrollmentId: string) => {
    await resumeEnrollment(enrollmentId);
    fetchCustomerEnrollments(sequenceId);
  };
  
  const handleCancel = async (enrollmentId: string) => {
    await cancelEnrollment(enrollmentId);
    fetchCustomerEnrollments(sequenceId);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'paused':
        return <Badge variant="warning">Paused</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const handleStepProcessed = () => {
    // Refresh the enrollments after processing a step
    fetchCustomerEnrollments(sequenceId);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Customer Enrollments</CardTitle>
        <CardDescription>
          Customers currently enrolled in this sequence
        </CardDescription>
      </CardHeader>
      <CardContent>
        {enrollments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No customers are currently enrolled in this sequence</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Next Send</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">{enrollment.customer_id}</TableCell>
                    <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                    <TableCell>{format(new Date(enrollment.created_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell>
                      {enrollment.nextSendTime 
                        ? format(new Date(enrollment.nextSendTime), 'MMM d, yyyy h:mm a')
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        {enrollment.status === 'active' && (
                          <>
                            <ProcessEnrollmentStepButton 
                              enrollmentId={enrollment.id}
                              onSuccess={handleStepProcessed}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePause(enrollment.id)}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                          </>
                        )}
                        
                        {enrollment.status === 'paused' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResume(enrollment.id)}
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Resume
                          </Button>
                        )}
                        
                        {(enrollment.status === 'active' || enrollment.status === 'paused') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancel(enrollment.id)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
