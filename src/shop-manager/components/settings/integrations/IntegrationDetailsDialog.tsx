import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Activity, 
  Webhook, 
  Database, 
  Trash2, 
  RefreshCw,
  TestTube,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Zap
} from 'lucide-react';
import { IntegrationWorkflowsTab } from './IntegrationWorkflowsTab';
import { ShopIntegration } from '@/hooks/integrations/useShopIntegrations';
import { useShopIntegrations } from '@/hooks/integrations/useShopIntegrations';
import { useToast } from '@/hooks/use-toast';

interface IntegrationDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integration: ShopIntegration | null;
}

export function IntegrationDetailsDialog({ 
  open, 
  onOpenChange, 
  integration 
}: IntegrationDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_active: true,
    configuration: {}
  });

  const { updateIntegration, deleteIntegration, testConnection, triggerSync } = useShopIntegrations();
  const { toast } = useToast();

  // Initialize form data when integration changes
  useEffect(() => {
    if (integration) {
      setFormData({
        name: integration.name,
        description: integration.description || '',
        is_active: integration.is_active,
        configuration: integration.configuration || {}
      });
    }
  }, [integration]);

  const handleSave = async () => {
    if (!integration) return;

    try {
      setIsLoading(true);
      await updateIntegration(integration.id, {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active,
        configuration: formData.configuration
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating integration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!integration) return;

    if (confirm('Are you sure you want to delete this integration? This action cannot be undone.')) {
      try {
        await deleteIntegration(integration.id);
        onOpenChange(false);
      } catch (error) {
        console.error('Error deleting integration:', error);
      }
    }
  };

  const handleTest = async () => {
    if (!integration) return;
    await testConnection(integration.id);
  };

  const handleSync = async () => {
    if (!integration) return;
    await triggerSync(integration.id);
  };

  if (!integration) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'syncing':
      case 'testing':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3">
                {integration.provider?.name} Integration
              </DialogTitle>
              <DialogDescription>
                Manage your {integration.provider?.name} integration settings and monitoring
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(integration.sync_status)}
              <Badge variant="outline">
                {integration.sync_status}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <p className="text-2xl font-bold">{integration.sync_status}</p>
                    </div>
                    {getStatusIcon(integration.sync_status)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Last Sync</p>
                      <p className="text-2xl font-bold">
                        {integration.last_sync_at ? 
                          new Date(integration.last_sync_at).toLocaleDateString() : 
                          'Never'
                        }
                      </p>
                    </div>
                    <RefreshCw className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Provider</p>
                      <p className="text-2xl font-bold">{integration.provider?.name}</p>
                    </div>
                    <Database className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integration Details</CardTitle>
                <CardDescription>Basic information about this integration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="text-sm text-muted-foreground">{integration.name}</p>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Badge variant="outline">{integration.provider?.category}</Badge>
                  </div>
                </div>
                
                {integration.description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Created</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(integration.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label>Last Updated</Label>
                    <p className="text-sm text-muted-foreground">
                      {new Date(integration.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {integration.error_details && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <h4 className="font-medium text-red-800">Error Details</h4>
                      <p className="text-sm text-red-700">{integration.error_details}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button onClick={handleTest} disabled={isLoading}>
                <TestTube className="h-4 w-4 mr-2" />
                Test Connection
              </Button>
              
              <Button onClick={handleSync} disabled={isLoading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync Now
              </Button>
              
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Settings
              </Button>
              
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <IntegrationWorkflowsTab integrationId={integration.id} />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Integration Settings</CardTitle>
                <CardDescription>Configure your integration preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Integration Name</Label>
                    <Input
                      id="name"
                      value={isEditing ? formData.name : integration.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={isEditing ? formData.description : integration.description || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Active</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable or disable this integration
                      </p>
                    </div>
                    <Switch
                      checked={isEditing ? formData.is_active : integration.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSave} disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Integration synchronization and connection logs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Activity className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Last Synchronization</p>
                        <p className="text-sm text-muted-foreground">
                          {integration.last_sync_at ? 
                            new Date(integration.last_sync_at).toLocaleString() : 
                            'No synchronization yet'
                          }
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{integration.sync_status}</Badge>
                  </div>
                  
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Detailed activity logs will be available soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Configuration</CardTitle>
                <CardDescription>Configure webhooks for real-time data updates</CardDescription>
              </CardHeader>
              <CardContent>
                {integration.provider?.webhook_support ? (
                  <div className="text-center py-8">
                    <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Webhook Support Available</h3>
                    <p className="text-muted-foreground mb-4">
                      This integration supports webhooks for real-time updates
                    </p>
                    <Button>
                      <Webhook className="h-4 w-4 mr-2" />
                      Configure Webhooks
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>This integration does not support webhooks</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}