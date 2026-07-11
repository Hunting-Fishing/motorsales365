
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, Activity, Database, Users } from "lucide-react";
import { systemService, SystemSetting, SystemHealthMetric } from '@/services/developer/systemService';
import { toast } from 'sonner';

export default function SystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, healthData] = await Promise.all([
        systemService.getSystemSettings(),
        systemService.getSystemHealth(),
      ]);
      setSettings(settingsData);
      setHealthMetrics(healthData);
    } catch (error) {
      toast.error('Failed to load system data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button variant="outline" size="sm" className="mb-4" asChild>
          <Link to="/system-admin">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Developer Portal
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <Settings className="h-8 w-8 text-emerald-600" />
          <h1 className="text-3xl font-bold">System Settings</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Configure application-wide settings and monitor system health
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
            <CardDescription>Monitor system performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthMetrics.slice(0, 5).map((metric) => (
                <div key={metric.id} className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{metric.metric_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {metric.metric_value}{metric.unit}
                    </p>
                  </div>
                  <Badge className={getStatusColor(metric.status)}>
                    {metric.status}
                  </Badge>
                </div>
              ))}
              {healthMetrics.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No health metrics available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Configuration Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Configuration
            </CardTitle>
            <CardDescription>Application configuration settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.slice(0, 5).map((setting) => (
                <div key={setting.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{setting.key}</p>
                      <p className="text-sm text-muted-foreground">
                        {setting.description}
                      </p>
                    </div>
                    <Badge variant="outline">{setting.category}</Badge>
                  </div>
                </div>
              ))}
              {settings.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No settings configured
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Stats
            </CardTitle>
            <CardDescription>System overview statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{settings.length}</p>
                <p className="text-sm text-muted-foreground">Settings</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{healthMetrics.length}</p>
                <p className="text-sm text-muted-foreground">Metrics</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {healthMetrics.filter(m => m.status === 'healthy').length}
                </p>
                <p className="text-sm text-muted-foreground">Healthy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {healthMetrics.filter(m => m.status === 'critical').length}
                </p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <CardDescription>Current system status and information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Application Status</span>
                <Badge className="bg-green-100 text-green-800">Running</Badge>
              </div>
              <div className="flex justify-between">
                <span>Database Status</span>
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
              </div>
              <div className="flex justify-between">
                <span>Last Updated</span>
                <span className="text-sm text-muted-foreground">
                  {new Date().toLocaleString()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
