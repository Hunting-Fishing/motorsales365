import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, Clock, User, MoreVertical, Bell, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { BookingWaitlist, BookableService, useUpdateWaitlistEntry } from '@/hooks/useBookingSystem';

interface BookingWaitlistViewProps {
  waitlist: BookingWaitlist[];
  services: BookableService[];
}

const FLEXIBILITY_LABELS = {
  exact: 'Exact Time Only',
  flexible: 'Somewhat Flexible',
  any: 'Very Flexible',
};

export function BookingWaitlistView({ waitlist, services }: BookingWaitlistViewProps) {
  const updateWaitlist = useUpdateWaitlistEntry();

  const getServiceName = (serviceId: string | null) => {
    if (!serviceId) return 'Any Service';
    return services.find(s => s.id === serviceId)?.name || 'Unknown Service';
  };

  const handleStatusChange = async (id: string, status: BookingWaitlist['status']) => {
    await updateWaitlist.mutateAsync({ id, status });
  };

  if (waitlist.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Waitlist Entries</h3>
          <p className="text-muted-foreground">
            When customers request to be notified about openings, they'll appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Waitlist ({waitlist.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Preferred Date/Time</TableHead>
              <TableHead>Flexibility</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {waitlist.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">
                      {entry.customers?.first_name} {entry.customers?.last_name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {entry.customers?.email}
                    </div>
                    {entry.customers?.phone && (
                      <div className="text-sm text-muted-foreground">
                        {entry.customers.phone}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getServiceName(entry.service_id)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    {entry.preferred_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(entry.preferred_date), 'MMM d, yyyy')}
                      </span>
                    )}
                    {entry.preferred_time_start && entry.preferred_time_end && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {entry.preferred_time_start} - {entry.preferred_time_end}
                      </span>
                    )}
                    {!entry.preferred_date && !entry.preferred_time_start && (
                      <span className="text-muted-foreground">Any time</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {FLEXIBILITY_LABELS[entry.flexibility]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(parseISO(entry.created_at), 'MMM d, h:mm a')}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'notified')}>
                        <Bell className="h-4 w-4 mr-2" />
                        Mark as Notified
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'booked')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Booked
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleStatusChange(entry.id, 'cancelled')}>
                        <XCircle className="h-4 w-4 mr-2" />
                        Remove from Waitlist
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Create Booking
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
