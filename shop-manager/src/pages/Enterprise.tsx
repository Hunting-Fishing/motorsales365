
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, AlertTriangle, BarChart, Settings, Lock, Key, Bell } from 'lucide-react';
import { PermissionsManager } from '@/components/enterprise/PermissionsManager';
import { AuditTrailViewer } from '@/components/enterprise/AuditTrailViewer';
import { SecurityEventsMonitor } from '@/components/enterprise/SecurityEventsMonitor';
import { BIReportManager } from '@/components/enterprise/BIReportManager';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export default function Enterprise() {
  const [activeTab, setActiveTab] = useState('permissions');
  const { toast } = useToast();
  
  // Settings state
  const [settings, setSettings] = useState({
    twoFactorRequired: false,
    sessionTimeout: 30,
    passwordMinLength: 8,
    auditLogRetention: 90,
    alertOnFailedLogins: true,
    maxLoginAttempts: 5
  });

  const handleSaveSettings = () => {
    // In production, this would save to database
    toast({
      title: 'Settings saved',
      description: 'Enterprise settings have been updated successfully.'
    });
  };

  return (
    <>
      <Helmet>
        <title>Enterprise & Security | All Business 365</title>
      </Helmet>

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            Enterprise & Security
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage permissions, security, audit trails, and business intelligence
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Audit Trail</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              <span className="hidden sm:inline">BI Reports</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-4">
            <PermissionsManager />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AuditTrailViewer />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <SecurityEventsMonitor />
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <BIReportManager />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-6">
              {/* Authentication Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Authentication Settings
                  </CardTitle>
                  <CardDescription>Configure login and authentication policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Require Two-Factor Authentication</Label>
                      <p className="text-sm text-muted-foreground">All users must enable 2FA</p>
                    </div>
                    <Switch
                      checked={settings.twoFactorRequired}
                      onCheckedChange={(checked) => setSettings({ ...settings, twoFactorRequired: checked })}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Session Timeout (minutes)</Label>
                      <Input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) || 30 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Login Attempts</Label>
                      <Input
                        type="number"
                        value={settings.maxLoginAttempts}
                        onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Password Policy */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    Password Policy
                  </CardTitle>
                  <CardDescription>Set password requirements</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label>Minimum Password Length</Label>
                    <Input
                      type="number"
                      min={6}
                      max={32}
                      value={settings.passwordMinLength}
                      onChange={(e) => setSettings({ ...settings, passwordMinLength: parseInt(e.target.value) || 8 })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Audit & Alerts */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Audit & Alerts
                  </CardTitle>
                  <CardDescription>Configure audit logging and security alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Audit Log Retention (days)</Label>
                    <Input
                      type="number"
                      min={30}
                      max={365}
                      value={settings.auditLogRetention}
                      onChange={(e) => setSettings({ ...settings, auditLogRetention: parseInt(e.target.value) || 90 })}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Alert on Failed Logins</Label>
                      <p className="text-sm text-muted-foreground">Send alerts for repeated failed login attempts</p>
                    </div>
                    <Switch
                      checked={settings.alertOnFailedLogins}
                      onCheckedChange={(checked) => setSettings({ ...settings, alertOnFailedLogins: checked })}
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings}>
                  Save Settings
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
