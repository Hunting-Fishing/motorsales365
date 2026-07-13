import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, Edit, Trash2, TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hybridActivitiesService } from "@/services/hybridActivitiesService";
import { HybridActivity, HybridActivityAnalytics } from "@/types/hybrid";
import { HybridActivityForm } from "./HybridActivityForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function HybridActivitiesDashboard() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<HybridActivity[]>([]);
  const [analytics, setAnalytics] = useState<HybridActivityAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<HybridActivity | undefined>();
  const [deleteActivity, setDeleteActivity] = useState<HybridActivity | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [activitiesData, analyticsData] = await Promise.all([
        hybridActivitiesService.getActivities(),
        hybridActivitiesService.getAnalytics()
      ]);
      setActivities(activitiesData);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load hybrid activities data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadData();
    setShowForm(false);
    setEditingActivity(undefined);
  };

  const handleEdit = (activity: HybridActivity) => {
    setEditingActivity(activity);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteActivity) return;
    
    try {
      await hybridActivitiesService.deleteActivity(deleteActivity.id);
      toast({
        title: "Activity Deleted",
        description: "Hybrid activity has been deleted successfully.",
      });
      loadData();
    } catch (error) {
      console.error('Error deleting activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete activity",
        variant: "destructive",
      });
    } finally {
      setDeleteActivity(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'paused': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.activity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.activity_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesType = typeFilter === 'all' || activity.activity_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const uniqueTypes = [...new Set(activities.map(a => a.activity_type))];

  return (
    <div className="space-y-6">
      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalActivities}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.activeActivities} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(analytics.totalForProfitRevenue + analytics.totalNonProfitRevenue).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                For-profit: ${analytics.totalForProfitRevenue.toLocaleString()} | 
                Non-profit: ${analytics.totalNonProfitRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Impact Reach</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalBeneficiaries}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalParticipants} participants • {analytics.totalVolunteerHours} volunteer hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.complianceCompletionRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                Avg duration: {analytics.averageActivityDuration.toFixed(0)} days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Hybrid Activities Management
              </CardTitle>
              <CardDescription>
                Track activities with both for-profit and non-profit components
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {uniqueTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Activities List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading activities...
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {activities.length === 0 
                  ? "No hybrid activities yet. Create your first activity to start tracking dual-purpose initiatives."
                  : "No activities match your current filters."
                }
              </div>
            ) : (
              filteredActivities.map((activity) => (
                <div key={activity.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{activity.activity_name}</h4>
                        <Badge variant="outline">{activity.activity_type}</Badge>
                        <Badge className={getStatusColor(activity.status)}>
                          {activity.status}
                        </Badge>
                      </div>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      )}
                      {activity.start_date && activity.end_date && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.start_date).toLocaleDateString()} - {new Date(activity.end_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(activity)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDeleteActivity(activity)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">For-Profit Allocation</div>
                      <div className="flex items-center gap-2">
                        <Progress value={activity.for_profit_percentage} className="flex-1" />
                        <span className="text-sm font-medium">{activity.for_profit_percentage}%</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Revenue: ${activity.revenue_for_profit?.toLocaleString() || '0'}
                        {activity.expenses_for_profit !== undefined && (
                          <span> • Expenses: ${activity.expenses_for_profit.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Non-Profit Allocation</div>
                      <div className="flex items-center gap-2">
                        <Progress value={activity.non_profit_percentage} className="flex-1" />
                        <span className="text-sm font-medium">{activity.non_profit_percentage}%</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Revenue: ${activity.revenue_non_profit?.toLocaleString() || '0'}
                        {activity.expenses_non_profit !== undefined && (
                          <span> • Expenses: ${activity.expenses_non_profit.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Impact Metrics */}
                  {(activity.participants_count || activity.beneficiaries_count || activity.volunteer_hours) && (
                    <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                      {activity.participants_count !== undefined && (
                        <div className="text-center">
                          <div className="text-lg font-semibold">{activity.participants_count}</div>
                          <div className="text-xs text-muted-foreground">Participants</div>
                        </div>
                      )}
                      {activity.beneficiaries_count !== undefined && (
                        <div className="text-center">
                          <div className="text-lg font-semibold">{activity.beneficiaries_count}</div>
                          <div className="text-xs text-muted-foreground">Beneficiaries</div>
                        </div>
                      )}
                      {activity.volunteer_hours !== undefined && (
                        <div className="text-center">
                          <div className="text-lg font-semibold">{activity.volunteer_hours}</div>
                          <div className="text-xs text-muted-foreground">Volunteer Hours</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forms and Dialogs */}
      <HybridActivityForm
        open={showForm}
        onOpenChange={setShowForm}
        activity={editingActivity}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteActivity} onOpenChange={() => setDeleteActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteActivity?.activity_name}"? This action cannot be undone.
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