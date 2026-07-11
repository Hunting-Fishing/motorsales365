
import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Shield, AlertTriangle, Lock, Eye, Key } from "lucide-react";
import { securityService, SecuritySetting, SecurityAuditLog, SecurityAlert } from '@/services/developer/securityService';
import { toast } from 'sonner';

export default function SecuritySettings() {
  const [settings, setSettings] = useState<SecuritySetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settingsData, auditData, alertsData] = await Promise.all([
        securityService.getSecuritySettings(),
        securityService.getSecurityAuditLogs(),
        securityService.getSecurityAlerts(),
      ]);
      setSettings(settingsData);
      setAuditLogs(auditData.slice(0, 10)); // Show latest 10
      setAlerts(alertsData.slice(0, 5)); // Show latest 5
    } catch (error) {
      toast.error('Failed to load security data');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggleSetting = async (settingId: string, currentValue: boolean) => {
    try {
      await securityService.updateSecuritySetting(settingId, !currentValue);
      setSettings(prev => prev.map(s => 
        s.id === settingId ? { ...s, value: !currentValue } : s
      ));
      toast.success('Security setting updated');
    } catch (error) {
      toast.error('Failed to update setting');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded"></div>
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
          <Shield className="h-8 w-8 text-cyan-600" />
          <h1 className="text-3xl font-bold">Security Settings</h1>
        </div>
        <p className="text-slate-600 dark:text-slate-300">
          Manage security configurations and access controls
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security Configuration
            </CardTitle>
            <CardDescription>Configure security policies and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {settings.map((setting) => (
                <div key={setting.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{setting.name}</p>
                      <Badge className={getSeverityColor(setting.severity)}>
                        {setting.severity}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {setting.description}
                    </p>
                  </div>
                  {typeof setting.value === 'boolean' && (
                    <Switch
                      checked={setting.value}
                      onCheckedChange={() => handleToggleSetting(setting.id, setting.value as boolean)}
                    />
                  )}
                  {typeof setting.value === 'number' && (
                    <span className="text-sm font-mono">{setting.value}</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Security Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Security Alerts
            </CardTitle>
            <CardDescription>Recent security alerts and warnings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="border rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {alert.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{alert.category}</span>
                    <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No active security alerts
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Recent Audit Logs
            </CardTitle>
            <CardDescription>Security-related activities and events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div className="flex items-center gap-3">
                    <Badge className={getRiskLevelColor(log.risk_level)}>
                      {log.risk_level}
                    </Badge>
                    <span className="font-medium">{log.action}</span>
                    <span className="text-muted-foreground">{log.resource}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{log.ip_address}</span>
                    <span>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {auditLogs.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No audit logs available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Security Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Security Summary
            </CardTitle>
            <CardDescription>Overview of current security status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {settings.filter(s => typeof s.value === 'boolean' && s.value).length}
                </p>
                <p className="text-sm text-muted-foreground">Active Policies</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {alerts.filter(a => a.severity === 'critical').length}
                </p>
                <p className="text-sm text-muted-foreground">Critical Alerts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {auditLogs.filter(l => l.risk_level === 'high').length}
                </p>
                <p className="text-sm text-muted-foreground">High Risk Events</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{auditLogs.length}</p>
                <p className="text-sm text-muted-foreground">Recent Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
