import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Hash, 
  Bell, 
  Users, 
  Calendar,
  FileText,
  Save,
  Download,
  Upload
} from 'lucide-react';
import { WorkOrderNumberingTab } from '../WorkOrderNumberingTab';

const templates = [
  { id: '1', name: 'Oil Change Service', category: 'Maintenance', usage: 145 },
  { id: '2', name: 'Brake Inspection', category: 'Safety', usage: 89 },
  { id: '3', name: 'Engine Diagnostics', category: 'Diagnostics', usage: 67 },
  { id: '4', name: 'Tire Rotation', category: 'Maintenance', usage: 134 },
  { id: '5', name: 'AC Service', category: 'HVAC', usage: 45 }
];

const priorities = [
  { value: 'low', label: 'Low Priority', color: 'bg-green-100 text-green-800' },
  { value: 'normal', label: 'Normal Priority', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High Priority', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

export function WorkOrderManagement() {
  const [autoAssignment, setAutoAssignment] = useState(true);
  const [notifications, setNotifications] = useState({
    creation: true,
    statusUpdate: true,
    completion: true,
    overdue: true
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Work Order Management</h3>
      </div>

      <Tabs defaultValue="numbering" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="numbering">Numbering</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="import-export">Import/Export</TabsTrigger>
        </TabsList>

        <TabsContent value="numbering">
          <WorkOrderNumberingTab />
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Work Order Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Manage reusable work order templates to speed up creation
                  </p>
                  <Button size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.category} • Used {template.usage} times
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Duplicate</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Auto-Assignment Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-assignment">Enable Auto-Assignment</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign work orders to available technicians
                    </p>
                  </div>
                  <Switch
                    id="auto-assignment"
                    checked={autoAssignment}
                    onCheckedChange={setAutoAssignment}
                  />
                </div>
                
                {autoAssignment && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                      <Label>Assignment Strategy</Label>
                      <Select defaultValue="balanced">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="balanced">Balanced Workload</SelectItem>
                          <SelectItem value="skills">Skills-Based</SelectItem>
                          <SelectItem value="priority">Priority-Based</SelectItem>
                          <SelectItem value="round-robin">Round Robin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Max Work Orders per Technician</Label>
                      <Input type="number" defaultValue="5" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Scheduling Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Scheduling Buffer</Label>
                  <Select defaultValue="30">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Working Hours</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="time" defaultValue="08:00" />
                    <Input type="time" defaultValue="17:00" />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="weekend-scheduling">Allow Weekend Scheduling</Label>
                  <Switch id="weekend-scheduling" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">System Notifications</h4>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-creation">Work Order Creation</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when new work orders are created
                      </p>
                    </div>
                    <Switch
                      id="notify-creation"
                      checked={notifications.creation}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, creation: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-status">Status Updates</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when work order status changes
                      </p>
                    </div>
                    <Switch
                      id="notify-status"
                      checked={notifications.statusUpdate}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, statusUpdate: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-completion">Completion</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when work orders are completed
                      </p>
                    </div>
                    <Switch
                      id="notify-completion"
                      checked={notifications.completion}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, completion: checked }))
                      }
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notify-overdue">Overdue Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify when work orders become overdue
                      </p>
                    </div>
                    <Switch
                      id="notify-overdue"
                      checked={notifications.overdue}
                      onCheckedChange={(checked) => 
                        setNotifications(prev => ({ ...prev, overdue: checked }))
                      }
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Customer Notifications</h4>
                  
                  <div className="space-y-2">
                    <Label>Email Templates</Label>
                    <Select defaultValue="default">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Template</SelectItem>
                        <SelectItem value="professional">Professional Template</SelectItem>
                        <SelectItem value="friendly">Friendly Template</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>SMS Notifications</Label>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Switch id="sms-scheduled" />
                        <Label htmlFor="sms-scheduled">Appointment scheduled</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="sms-started" />
                        <Label htmlFor="sms-started">Work started</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id="sms-completed" />
                        <Label htmlFor="sms-completed">Work completed</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Save Notification Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import-export" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Import work orders from CSV or Excel files
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Upload className="h-4 w-4 mr-2" />
                    Choose File
                  </Button>
                  <Button variant="outline" size="sm" className="w-full">
                    Download Template
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Work Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Export work order data for analysis or backup
                </p>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export as CSV
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export as Excel
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Export as PDF Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}