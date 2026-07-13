import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { BarChart3, Users, Wrench, Recycle, Heart, TrendingUp, Download, Calendar, Plus, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { nonprofitApi } from '@/lib/services/nonprofitApi';
import { donationsApi } from '@/lib/services/donationsApi';
import { successStoriesApi } from '@/lib/services/successStoriesApi';
import { AddSuccessStoryDialog } from '@/components/forms/AddSuccessStoryDialog';
import { ImpactMeasurementEntryDialog } from '@/components/forms/ImpactMeasurementEntryDialog';
import { ImpactMeasurementList } from '@/components/forms/ImpactMeasurementList';
import { Program, ImpactMeasurementData, CreateImpactMeasurementData } from '@/types/nonprofit';

interface EditMeasurementState {
  open: boolean;
  measurement: ImpactMeasurementData | null;
}

export const ImpactMeasurementTab = () => {
  const { toast } = useToast();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [impactMeasurements, setImpactMeasurements] = useState<ImpactMeasurementData[]>([]);
  const [successStories, setSuccessStories] = useState<any[]>([]);
  const [donationStats, setDonationStats] = useState({ totalDonations: 0, donationCount: 0, averageDonation: 0 });
  const [realAnalytics, setRealAnalytics] = useState({
    totalPeopleHelped: 0,
    vehiclesRestored: 0,
    toolKitsDistributed: 0,
    co2Saved: 0,
    metalRecycled: 0,
    environmentalMetrics: []
  });
  const [loading, setLoading] = useState(true);
  const [editState, setEditState] = useState<EditMeasurementState>({ open: false, measurement: null });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [programsData, volunteersData, measurementsData, storiesData, donationsData, analyticsData] = await Promise.all([
        nonprofitApi.getPrograms(),
        nonprofitApi.getVolunteers(),
        nonprofitApi.getImpactMeasurements(),
        successStoriesApi.getAll(),
        donationsApi.getStats(),
        nonprofitApi.getRealImpactAnalytics()
      ]);

      setPrograms(programsData);
      setVolunteers(volunteersData);
      setImpactMeasurements(measurementsData);
      setSuccessStories(storiesData);
      setDonationStats(donationsData);
      setRealAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load impact data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Use real analytics data instead of placeholder calculations
  const totalPeopleHelped = realAnalytics.totalPeopleHelped || 0;
  const vehiclesRestored = realAnalytics.vehiclesRestored || 0;
  const toolKitsDistributed = realAnalytics.toolKitsDistributed || 0;
  const totalVolunteerHours = volunteers.reduce((sum, v) => sum + (v.hours_logged || 0), 0);
  const co2Saved = realAnalytics.co2Saved || 0;
  const metalRecycled = realAnalytics.metalRecycled || 0;

  const handleEditMeasurement = (measurement: any) => {
    // Find the original measurement data
    const originalMeasurement = impactMeasurements.find(m => m.id === measurement.id);
    if (originalMeasurement) {
      setEditState({ open: true, measurement: originalMeasurement });
    }
  };

  const handleUpdateMeasurement = async (updatedData: Partial<ImpactMeasurementData>) => {
    if (!editState.measurement) return;
    
    try {
      await nonprofitApi.updateImpactMeasurement(editState.measurement.id, updatedData);
      await loadData();
      setEditState({ open: false, measurement: null });
      toast({
        title: "Success",
        description: "Impact measurement updated successfully",
      });
    } catch (error) {
      console.error('Error updating measurement:', error);
      toast({
        title: "Error",
        description: "Failed to update measurement",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMeasurement = async (id: string) => {
    try {
      await nonprofitApi.deleteImpactMeasurement(id);
      await loadData(); // Refresh data
      toast({
        title: "Success",
        description: "Impact measurement deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting measurement:', error);
      toast({
        title: "Error",
        description: "Failed to delete measurement",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading impact data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Impact Measurement</h2>
          <p className="text-muted-foreground">Track and measure your nonprofit's community impact</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
          <ImpactMeasurementEntryDialog onMeasurementAdded={loadData} />
          <AddSuccessStoryDialog onStoryAdded={loadData} />
        </div>
      </div>

      {/* Impact Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">People Helped</p>
                <p className="text-2xl font-bold text-foreground">{totalPeopleHelped.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {totalPeopleHelped > 0 ? 'From actual measurements' : 'No measurements yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Recycle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vehicles Restored</p>
                <p className="text-2xl font-bold text-foreground">{vehiclesRestored}</p>
                <p className="text-xs text-muted-foreground">
                  {vehiclesRestored > 0 ? 'From actual measurements' : 'No measurements yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Wrench className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tool Kits Distributed</p>
                <p className="text-2xl font-bold text-foreground">{toolKitsDistributed}</p>
                <p className="text-xs text-muted-foreground">
                  {toolKitsDistributed > 0 ? 'From actual measurements' : 'No measurements yet'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <Heart className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Volunteer Hours</p>
                <p className="text-2xl font-bold text-foreground">{totalVolunteerHours.toLocaleString() || 0}</p>
                <p className="text-xs text-muted-foreground">From {volunteers.length} volunteers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Program Impact Tracking */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Program Impact Tracking
          </CardTitle>
          <CardDescription>
            Monitor the effectiveness of your key programs ({programs.length} active programs)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {programs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Programs Found</h3>
                <p>Create programs to track their impact and effectiveness.</p>
              </div>
            ) : (
              programs.slice(0, 3).map((program) => {
                const programMeasurements = impactMeasurements.filter(m => (m as any).program_id === program.id);
                const programVolunteers = volunteers.filter(v => v.program_id === program.id);
                const totalValue = programMeasurements.length * 100;
                const participantCount = programMeasurements.length * 5;
                const progress = Math.min((participantCount / 50) * 100, 100);

                const statusColor = progress >= 90 ? 'green' : progress >= 70 ? 'blue' : 'yellow';
                const statusLabel = progress >= 90 ? 'On Track' : progress >= 70 ? 'Good Progress' : 'Needs Attention';

                return (
                  <div key={program.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-foreground">{program.name}</h4>
                      <Badge className={`bg-${statusColor}-500/10 text-${statusColor}-700 hover:bg-${statusColor}-500/20`}>
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Participants</p>
                        <p className="font-semibold text-foreground">
                          {participantCount} / 50
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Impact Value</p>
                        <p className="font-semibold text-foreground">{totalValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Active Volunteers</p>
                        <p className="font-semibold text-foreground">{programVolunteers.length}</p>
                      </div>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Outcome Stories */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Success Stories & Outcomes
          </CardTitle>
          <CardDescription>
            Document and share the real-world impact of your work ({successStories.length} stories recorded)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {successStories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Success Stories Yet</h3>
                <p>Add your first success story to showcase your impact.</p>
              </div>
            ) : (
              successStories.slice(0, 3).map((story) => {
                const program = programs.find(p => p.id === story.program_id);
                return (
                  <div key={story.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium text-foreground">
                        {story.participant_name ? `${story.participant_name} - ${story.story_title}` : story.story_title}
                      </h4>
                      {story.featured && <Badge variant="outline">Featured Story</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {story.story_content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {program && (
                        <>
                          <span>Program: {program.name}</span>
                          <span>•</span>
                        </>
                      )}
                      <span>Date: {story.date_occurred ? new Date(story.date_occurred).toLocaleDateString() : 'No date'}</span>
                      <span>•</span>
                      <span>Added: {new Date(story.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })
            )}
            {successStories.length > 3 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  View All {successStories.length} Stories
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Environmental Impact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Recycle className="h-5 w-5" />
            Environmental Impact
          </CardTitle>
          <CardDescription>
            Track your organization's environmental contributions from impact measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-green-600 mb-1">
                {co2Saved > 0 ? `${co2Saved.toLocaleString()} kg` : '0 kg'}
              </div>
              <p className="text-sm text-muted-foreground">
                CO2 Emissions Saved {co2Saved > 0 ? '(Measured)' : '(No data)'}
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-blue-600 mb-1">{vehiclesRestored}</div>
              <p className="text-sm text-muted-foreground">
                Vehicles Kept from Landfill {vehiclesRestored > 0 ? '(Measured)' : '(No data)'}
              </p>
            </div>
            <div className="text-center p-4">
              <div className="text-2xl font-bold text-purple-600 mb-1">
                {metalRecycled > 0 ? `${metalRecycled.toLocaleString()} kg` : '0 kg'}
              </div>
              <p className="text-sm text-muted-foreground">
                Metal Recycled {metalRecycled > 0 ? '(Measured)' : '(No data)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Impact Measurements Management */}
      <ImpactMeasurementList 
        measurements={impactMeasurements.map(m => ({
          id: m.id,
          measurement_name: m.metric_id, // Use metric_id as name for compatibility
          category: 'general', // Default category since not in current data structure
          measurement_type: 'quantitative', // Default type
          current_value: m.measured_value,
          target_value: undefined,
          unit_of_measure: '',
          measurement_period: 'monthly',
          data_source: '',
          verification_method: '',
          last_measured_date: m.measurement_date,
          next_measurement_date: undefined,
          baseline_value: undefined,
          baseline_date: undefined,
          notes: m.notes,
          created_at: m.created_at,
          updated_at: m.updated_at
        }))}
        onEdit={handleEditMeasurement}
        onDelete={handleDeleteMeasurement}
        loading={loading}
      />
    </div>
  );
};