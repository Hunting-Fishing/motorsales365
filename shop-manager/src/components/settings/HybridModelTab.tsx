import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, DollarSign, Target, CheckCircle, AlertTriangle, Plus } from "lucide-react";
import { AccountingStreamsManagement } from "@/components/nonprofit/AccountingStreamsManagement";
import { ImpactMeasurementManagement } from "@/components/nonprofit/ImpactMeasurementManagement";
import { HybridActivitiesDashboard } from "@/components/hybrid/HybridActivitiesDashboard";
import { ComplianceDashboard } from "@/components/hybrid/ComplianceDashboard";

interface HybridActivity {
  id: string;
  activity_name: string;
  activity_type: string;
  for_profit_percentage: number;
  non_profit_percentage: number;
  status: string;
  revenue_for_profit: number;
  revenue_non_profit: number;
}

interface ComplianceRequirement {
  id: string;
  requirement_name: string;
  applicable_to: string;
  completion_status: string;
  due_date: string;
  priority_level: string;
}

export function HybridModelTab() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<HybridActivity[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHybridData();
  }, []);

  const loadHybridData = async () => {
    try {
      const [activitiesResponse, complianceResponse] = await Promise.all([
        supabase.from("hybrid_activities").select("*").order("created_at", { ascending: false }),
        supabase.from("compliance_requirements").select("*").order("due_date", { ascending: true })
      ]);

      if (activitiesResponse.data) setActivities(activitiesResponse.data);
      if (complianceResponse.data) setCompliance(complianceResponse.data);
    } catch (error) {
      console.error("Error loading hybrid data:", error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'completed': return 'bg-blue-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'overdue': return 'text-red-600';
      case 'in_progress': return 'text-blue-600';
      default: return 'text-yellow-600';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Hybrid Model Management</h2>
        <p className="text-muted-foreground">
          Manage dual-purpose activities, separate accounting streams, and compliance tracking
        </p>
      </div>

      <Tabs defaultValue="activities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Accounting
          </TabsTrigger>
          <TabsTrigger value="impact" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Impact
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activities">
          <HybridActivitiesDashboard />
        </TabsContent>

        <TabsContent value="accounting">
          <AccountingStreamsManagement />
        </TabsContent>

        <TabsContent value="impact">
          <ImpactMeasurementManagement />
        </TabsContent>

        <TabsContent value="compliance">
          <ComplianceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}