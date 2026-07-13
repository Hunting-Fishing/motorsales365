import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, FileText, Plus, Search, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ComplianceTab = () => {
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from('compliance_requirements')
        .select('*')
        .order('due_date', { ascending: true });

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      toast({
        title: "Error loading compliance data",
        description: "Failed to load compliance requirements",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading compliance data...</div>;
  }

  const now = new Date();
  const compliant = requirements.filter(r => r.completion_status === 'completed').length;
  const dueSoon = requirements.filter(r => {
    const dueDate = new Date(r.due_date);
    const daysDiff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return r.completion_status !== 'completed' && daysDiff <= 30 && daysDiff > 0;
  }).length;
  const overdue = requirements.filter(r => {
    const dueDate = new Date(r.due_date);
    return r.completion_status !== 'completed' && dueDate < now;
  }).length;

  const complianceRate = requirements.length > 0 ? Math.round((compliant / requirements.length) * 100) : 0;
  const criticalRequirements = requirements.filter(r => 
    r.completion_status !== 'completed' && 
    (r.priority_level === 'high' || new Date(r.due_date) < now)
  );

  const upcomingDeadlines = requirements
    .filter(r => r.completion_status !== 'completed' && new Date(r.due_date) > now)
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Compliance Requirements</h2>
          <p className="text-muted-foreground">Track and manage regulatory compliance requirements</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search Requirements
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Requirement
          </Button>
        </div>
      </div>

      {/* Compliance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliant</p>
                <p className="text-2xl font-bold text-foreground">{compliant}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Soon</p>
                <p className="text-2xl font-bold text-foreground">{dueSoon}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-foreground">{overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Requirements</p>
                <p className="text-2xl font-bold text-foreground">{requirements.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Compliance Status</CardTitle>
          <CardDescription>
            Track your organization's compliance across all requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Compliance Rate</span>
              <span className="text-sm text-muted-foreground">{complianceRate}%</span>
            </div>
            <Progress value={complianceRate} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {compliant} of {requirements.length} requirements are up to date. {dueSoon} require attention within the next 30 days.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Critical Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Critical Requirements
          </CardTitle>
          <CardDescription>
            Requirements that need immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criticalRequirements.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No critical requirements at this time</p>
            ) : (
              criticalRequirements.map((requirement) => {
                const isOverdue = new Date(requirement.due_date) < now;
                return (
                  <div 
                    key={requirement.id} 
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isOverdue ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                    }`}
                  >
                    <div>
                      <h4 className="font-medium text-foreground">{requirement.requirement_name}</h4>
                      <p className="text-sm text-muted-foreground">{requirement.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={isOverdue ? "bg-red-500/10 text-red-700 hover:bg-red-500/20" : "bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20"}>
                          {isOverdue ? 'Overdue' : `Due ${Math.ceil((new Date(requirement.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} days`}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Due: {new Date(requirement.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant={isOverdue ? "destructive" : "outline"}>
                        {isOverdue ? 'File Now' : 'Review'}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Deadlines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Deadlines
          </CardTitle>
          <CardDescription>
            Stay ahead of important compliance deadlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingDeadlines.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No upcoming deadlines</p>
            ) : (
              upcomingDeadlines.map((requirement) => {
                const daysUntilDue = Math.ceil((new Date(requirement.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={requirement.id} className="flex items-center justify-between p-4 border border-border rounded-lg">
                    <div>
                      <h4 className="font-medium text-foreground">{requirement.requirement_name}</h4>
                      <p className="text-sm text-muted-foreground">{requirement.description}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Due in {daysUntilDue} days</span>
                      <Button size="sm" variant="outline">
                        Take Action
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};