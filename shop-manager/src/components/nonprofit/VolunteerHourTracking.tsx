import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Clock, Users, Calendar, MapPin, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VolunteerForm } from './forms/VolunteerForm';
import type { Database } from '@/integrations/supabase/types';

type VolunteerHour = Database['public']['Tables']['volunteer_hours']['Row'];
type Volunteer = Database['public']['Tables']['volunteers']['Row'];

export function VolunteerHourTracking() {
  const [volunteerHours, setVolunteerHours] = useState<VolunteerHour[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load volunteer hours
      const { data: hoursData, error: hoursError } = await supabase
        .from('volunteer_hours')
        .select('*')
        .order('date_worked', { ascending: false });

      if (hoursError) throw hoursError;

      // Transform the data to match expected format
      const transformedHours = hoursData?.map(hour => ({
        ...hour,
        volunteer_email: hour.volunteer_name, // Use volunteer_name field as email temporarily
      })) || [];

      setVolunteerHours(transformedHours as any);

      // Load volunteers
      const { data: volunteersData, error: volunteersError } = await supabase
        .from('volunteers')
        .select('*')
        .order('last_name', { ascending: true });

      if (volunteersError) throw volunteersError;

      // Transform volunteers data to match expected format
      const transformedVolunteers = volunteersData?.map(volunteer => ({
        ...volunteer,
        total_hours: volunteer.volunteer_hours || 0,
        volunteer_type: volunteer.status || 'active',
      })) || [];

      setVolunteers(transformedVolunteers as any);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load volunteer data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyHours = async (hourId: string) => {
    try {
      const { error } = await supabase
        .from('volunteer_hours')
        .update({ 
          verification_status: 'verified',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', hourId);

      if (error) throw error;
      
      await loadData();
      toast({
        title: 'Success',
        description: 'Volunteer hours verified'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to verify hours',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteHour = async (hourId: string) => {
    if (!confirm('Are you sure you want to delete this volunteer hour entry?')) return;

    try {
      const { error } = await supabase
        .from('volunteer_hours')
        .delete()
        .eq('id', hourId);

      if (error) throw error;
      
      await loadData();
      toast({
        title: 'Success',
        description: 'Volunteer hour entry deleted'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete hour entry',
        variant: 'destructive'
      });
    }
  };

  // Calculate summary statistics
  const totalHours = volunteerHours.reduce((sum, h) => sum + h.hours_worked, 0);
  const activeVolunteers = volunteers.filter(v => v.status === 'active').length;
  const pendingVerification = volunteerHours.filter(h => h.verification_status === 'pending').length;
  const thisMonthHours = volunteerHours
    .filter(h => {
      const hourDate = new Date(h.date_worked);
      const now = new Date();
      return hourDate.getMonth() === now.getMonth() && hourDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, h) => sum + h.hours_worked, 0);

  if (loading) {
    return <div className="p-6">Loading volunteer data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalHours.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All time volunteer hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Volunteers</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeVolunteers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{thisMonthHours}</div>
            <p className="text-xs text-muted-foreground">Hours this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
            <Clock className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingVerification}</div>
            <p className="text-xs text-muted-foreground">Hours awaiting verification</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Volunteer Hour Tracking</h2>
          <p className="text-muted-foreground">
            Track and verify volunteer hours and activities
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Volunteer</DialogTitle>
            </DialogHeader>
            <VolunteerForm onSuccess={() => {
              setIsDialogOpen(false);
              loadData();
            }} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Volunteer Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Volunteer Hours</CardTitle>
            <CardDescription>Latest volunteer activity entries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {volunteerHours.slice(0, 5).map((hour) => (
                <div key={hour.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{hour.volunteer_name}</p>
                    <p className="text-sm text-muted-foreground">{hour.activity_type}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {hour.hours_worked} hours
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(hour.date_worked).toLocaleDateString()}
                      </span>
                      {hour.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {hour.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={hour.verification_status === 'verified' ? 'default' : 'secondary'}>
                      {hour.verification_status || 'pending'}
                    </Badge>
                    {hour.verification_status !== 'verified' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerifyHours(hour.id)}
                      >
                        Verify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteHour(hour.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {volunteerHours.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No volunteer hours recorded yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Volunteers */}
        <Card>
          <CardHeader>
            <CardTitle>Active Volunteers</CardTitle>
            <CardDescription>Current volunteer roster</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {volunteers.filter(v => v.status === 'active').slice(0, 5).map((volunteer) => (
                <div key={volunteer.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{volunteer.first_name} {volunteer.last_name}</p>
                    {volunteer.email && (
                      <p className="text-sm text-muted-foreground">{volunteer.email}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {volunteer.volunteer_hours || 0} total hours
                      </span>
                      <Badge variant="outline">{volunteer.status}</Badge>
                    </div>
                  </div>
                </div>
              ))}
              {volunteers.filter(v => v.status === 'active').length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No active volunteers found.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}