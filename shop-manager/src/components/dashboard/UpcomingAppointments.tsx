import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  date: string;
  notes: string;
  duration: number;
  status: string;
  customers: {
    first_name: string;
    last_name: string;
  } | null;
  vehicles: {
    year: number;
    make: string;
    model: string;
  } | null;
}

export const UpcomingAppointments: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingAppointments = async () => {
      try {
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data, error } = await supabase
          .from('appointments')
          .select(`
            id,
            date,
            notes,
            duration,
            status,
            customers!appointments_customer_id_fkey (
              first_name,
              last_name
            ),
            vehicles!appointments_vehicle_id_fkey (
              year,
              make,
              model
            )
          `)
          .gte('date', now.toISOString())
          .lte('date', nextWeek.toISOString())
          .eq('status', 'scheduled')
          .order('date', { ascending: true })
          .limit(3);

        if (error) {
          console.error('Error fetching appointments:', error);
        } else {
          // Transform the data to match our interface since Supabase returns arrays
          const transformedData: Appointment[] = (data || []).map((item: any) => ({
            id: item.id,
            date: item.date,
            notes: item.notes,
            duration: item.duration,
            status: item.status,
            customers: Array.isArray(item.customers) && item.customers.length > 0 
              ? item.customers[0] as { first_name: string; last_name: string }
              : null,
            vehicles: Array.isArray(item.vehicles) && item.vehicles.length > 0 
              ? item.vehicles[0] as { year: number; make: string; model: string }
              : null
          }));
          setAppointments(transformedData);
        }
      } catch (error) {
        console.error('Failed to fetch appointments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingAppointments();
  }, []);

  const formatAppointmentTime = (dateString: string) => {
    return format(new Date(dateString), 'h:mm a');
  };

  const getCustomerName = (appointment: Appointment) => {
    if (appointment.customers) {
      return `${appointment.customers.first_name} ${appointment.customers.last_name}`;
    }
    return 'Unknown Customer';
  };

  const getVehicleInfo = (appointment: Appointment) => {
    if (appointment.vehicles) {
      return `${appointment.vehicles.year} ${appointment.vehicles.make} ${appointment.vehicles.model}`;
    }
    return 'Vehicle info unavailable';
  };

  return (
    <Card data-tour="dashboard-upcoming-appointments">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Upcoming Appointments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-32"></div>
                  <div className="h-3 bg-muted-foreground/20 rounded w-48"></div>
                </div>
                <div className="h-4 bg-muted-foreground/20 rounded w-16"></div>
              </div>
            ))}
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">{appointment.notes || 'Service Appointment'}</p>
                  <p className="text-sm text-muted-foreground">
                    {getCustomerName(appointment)} - {getVehicleInfo(appointment)}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatAppointmentTime(appointment.date)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar className="h-6 w-6 text-muted-foreground" aria-hidden />}
            title="No upcoming appointments"
            description="Schedule an appointment to keep your bay full."
            actionLink={{ label: 'Open Calendar', to: '/calendar' }}
          />
        )}
      </CardContent>
    </Card>
  );
};