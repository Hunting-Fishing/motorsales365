import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Key, 
  Shield, 
  Globe, 
  Database, 
  BarChart, 
  MessageSquare, 
  CreditCard, 
  Zap, 
  Activity,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { IntegrationProvider } from '@/hooks/integrations/useIntegrationProviders';
import { useShopIntegrations } from '@/hooks/integrations/useShopIntegrations';
import { useToast } from '@/hooks/use-toast';

const categoryIcons = {
  'crm': Database,
  'accounting': BarChart,
  'communication': MessageSquare,
  'payment': CreditCard,
  'automation': Zap,
  'analytics': Activity
};

interface AddIntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProvider: IntegrationProvider | null;
  onClose: () => void;
}

export function AddIntegrationDialog({ 
  open, 
  onOpenChange, 
  selectedProvider, 
  onClose 
}: AddIntegrationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    credentials: {} as Record<string, any>,
    configuration: {} as Record<string, any>
  });

  const { createIntegration } = useShopIntegrations();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!selectedProvider) return;

    try {
      setIsLoading(true);
      
      await createIntegration({
        provider_id: selectedProvider.id,
        name: formData.name || `${selectedProvider.name} Integration`,
        description: formData.description,
        auth_credentials: formData.credentials,
        configuration: formData.configuration,
        sync_settings: {
          auto_sync: true,
          sync_interval: 'hourly',
          sync_direction: 'bidirectional'
        }
      });

      toast({
        title: 'Integration Added',
        description: `Successfully connected to ${selectedProvider.name}`
      });

      onClose();
      resetForm();
    } catch (error) {
      console.error('Error adding integration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      credentials: {},
      configuration: {}
    });
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  if (!selectedProvider) return null;

  const IconComponent = categoryIcons[selectedProvider.category as keyof typeof categoryIcons] || Globe;

  const renderCredentialsStep = () => {
    switch (selectedProvider.auth_type) {
      case 'api_key':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="api_key">API Key</Label>
              <Input
                id="api_key"
                type="password"
                placeholder="Enter your API key"
                value={formData.credentials.api_key || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  credentials: { ...prev.credentials, api_key: e.target.value }
                }))}
              />
            </div>
            {selectedProvider.slug === 'stripe' && (
              <div>
                <Label htmlFor="webhook_secret">Webhook Secret (Optional)</Label>
                <Input
                  id="webhook_secret"
                  type="password"
                  placeholder="Enter webhook endpoint secret"
                  value={formData.credentials.webhook_secret || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    credentials: { ...prev.credentials, webhook_secret: e.target.value }
                  }))}
                />
              </div>
            )}
          </div>
        );

      case 'oauth2':
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium">OAuth 2.0 Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      Secure authentication via {selectedProvider.name}
                    </p>
                  </div>
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // This would initiate OAuth flow
                    toast({
                      title: 'OAuth Flow',
                      description: 'Redirecting to authorization page...'
                    });
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Authorize with {selectedProvider.name}
                </Button>
              </CardContent>
            </Card>
          </div>
        );

      case 'basic':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={formData.credentials.username || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  credentials: { ...prev.credentials, username: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.credentials.password || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  credentials: { ...prev.credentials, password: e.target.value }
                }))}
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <h4 className="font-medium">Custom Authentication</h4>
                    <p className="text-sm text-muted-foreground">
                      This integration requires custom setup. Please refer to the documentation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <IconComponent className="h-6 w-6" />
            Add {selectedProvider.name} Integration
          </DialogTitle>
          <DialogDescription>
            Connect your {selectedProvider.name} account to sync data automatically
          </DialogDescription>
        </DialogHeader>

        <Tabs value={`step-${step}`} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="step-1" className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 1 ? <CheckCircle className="h-3 w-3" /> : '1'}
              </div>
              Details
            </TabsTrigger>
            <TabsTrigger value="step-2" className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 2 ? <CheckCircle className="h-3 w-3" /> : '2'}
              </div>
              Authentication
            </TabsTrigger>
            <TabsTrigger value="step-3" className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
                {step > 3 ? <CheckCircle className="h-3 w-3" /> : '3'}
              </div>
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="step-1" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {selectedProvider.logo_url ? (
                    <img 
                      src={selectedProvider.logo_url} 
                      alt={`${selectedProvider.name} logo`}
                      className="w-12 h-12 rounded-lg object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <IconComponent className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <CardTitle>{selectedProvider.name}</CardTitle>
                    <CardDescription>{selectedProvider.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Category</p>
                    <Badge variant="outline">
                      {selectedProvider.category}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Authentication</p>
                    <Badge variant="outline">
                      <Key className="h-3 w-3 mr-1" />
                      {selectedProvider.auth_type.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div>
                <Label htmlFor="integration_name">Integration Name</Label>
                <Input
                  id="integration_name"
                  placeholder={`${selectedProvider.name} Integration`}
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe how this integration will be used..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep(2)}>
                Next: Authentication
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="step-2" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Authentication</h3>
              <p className="text-muted-foreground mb-4">
                Configure your {selectedProvider.name} authentication credentials
              </p>
            </div>

            {renderCredentialsStep()}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next: Settings
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="step-3" className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Integration Settings</h3>
              <p className="text-muted-foreground mb-4">
                Configure synchronization and data mapping options
              </p>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Sync Settings</CardTitle>
                  <CardDescription>Configure how data is synchronized</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Auto Sync</Label>
                    <input 
                      type="checkbox" 
                      defaultChecked 
                      className="rounded border-gray-300"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Sync Interval</Label>
                    <select className="border rounded px-3 py-1">
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={isLoading}
                className="min-w-32"
              >
                {isLoading ? 'Adding...' : 'Add Integration'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}