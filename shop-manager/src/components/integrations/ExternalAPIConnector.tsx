import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Plug, 
  Check, 
  X, 
  RefreshCw, 
  Settings, 
  AlertCircle, 
  Globe,
  Database,
  Mail,
  MessageSquare,
  CreditCard,
  Truck,
  FileText,
  Calendar,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useIntegrationProviders } from '@/hooks/integrations/useIntegrationProviders';
import { useShopIntegrations } from '@/hooks/integrations/useShopIntegrations';
import { fetchAPIEndpoints, testAPIEndpoint, updateAPIEndpoint } from '@/services/integrations/apiEndpointService';

interface APIEndpointUI {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers: Record<string, string>;
  body?: string;
  enabled: boolean;
  schedule?: string;
  lastRun?: string;
  status: 'success' | 'error' | 'pending';
}

const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'accounting': case 'finance': return <Database className="h-5 w-5" />;
    case 'marketing': case 'email': return <Mail className="h-5 w-5" />;
    case 'communications': case 'sms': return <MessageSquare className="h-5 w-5" />;
    case 'payments': case 'billing': return <CreditCard className="h-5 w-5" />;
    case 'logistics': case 'shipping': return <Truck className="h-5 w-5" />;
    case 'documents': case 'signature': return <FileText className="h-5 w-5" />;
    case 'scheduling': case 'calendar': return <Calendar className="h-5 w-5" />;
    default: return <Globe className="h-5 w-5" />;
  }
};

export function ExternalAPIConnector() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [endpoints, setEndpoints] = useState<APIEndpointUI[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isLoadingEndpoints, setIsLoadingEndpoints] = useState(false);

  // Use our live data hooks
  const { providers, isLoading: isLoadingProviders, getProvidersByCategory } = useIntegrationProviders();
  const { integrations: shopIntegrations, isLoading: isLoadingIntegrations, createIntegration, toggleIntegration, deleteIntegration } = useShopIntegrations();

  // Create combined integration data
  const combinedIntegrations = providers.map(provider => {
    const shopIntegration = shopIntegrations.find(si => si.provider_id === provider.id);
    return {
      id: provider.id,
      name: provider.name,
      description: provider.description || '',
      category: provider.category,
      icon: getCategoryIcon(provider.category),
      status: shopIntegration ? (shopIntegration.is_active ? 'connected' : 'disconnected') : 'disconnected',
      config: shopIntegration?.configuration || {},
      features: [], // Could be added to provider schema
      pricing: '', // Could be added to provider schema
      website: provider.website_url || '',
      shopIntegrationId: shopIntegration?.id,
      provider
    };
  });

  const categories = ['all', ...Array.from(new Set(providers.map(p => p.category)))];

  const filteredIntegrations = selectedCategory === 'all' 
    ? combinedIntegrations 
    : combinedIntegrations.filter(i => i.category === selectedCategory);

  // Load API endpoints
  useEffect(() => {
    const loadEndpoints = async () => {
      setIsLoadingEndpoints(true);
      try {
        const endpointsData = await fetchAPIEndpoints();
        const uiEndpoints: APIEndpointUI[] = endpointsData.map(ep => ({
          id: ep.id,
          name: ep.name,
          method: ep.method as 'GET' | 'POST' | 'PUT' | 'DELETE',
          url: ep.endpoint_url,
          headers: ep.headers || {},
          body: ep.parameters ? JSON.stringify(ep.parameters) : undefined,
          enabled: ep.is_active,
          lastRun: ep.last_called_at,
          status: ep.success_rate === 100 ? 'success' : ep.success_rate === 0 ? 'error' : 'pending'
        }));
        setEndpoints(uiEndpoints);
      } catch (error) {
        console.error('Error loading endpoints:', error);
      } finally {
        setIsLoadingEndpoints(false);
      }
    };
    loadEndpoints();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'configuring': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Check className="h-4 w-4" />;
      case 'error': return <X className="h-4 w-4" />;
      case 'configuring': return <Settings className="h-4 w-4" />;
      default: return <Plug className="h-4 w-4" />;
    }
  };

  const handleConnect = (integration: any) => {
    setSelectedProvider(integration.provider);
    setIsConfiguring(true);
  };

  const handleDisconnect = async (integration: any) => {
    if (integration.shopIntegrationId) {
      await deleteIntegration(integration.shopIntegrationId);
    }
  };

  const handleSaveConfig = async (config: Record<string, any>) => {
    if (!selectedProvider) return;

    await createIntegration({
      provider_id: selectedProvider.id,
      name: selectedProvider.name,
      description: selectedProvider.description,
      auth_credentials: config,
      configuration: config
    });

    setIsConfiguring(false);
    setSelectedProvider(null);
  };

  const testEndpoint = async (endpoint: APIEndpointUI) => {
    toast({
      title: "Testing Endpoint",
      description: "Sending test request..."
    });

    try {
      // Find the actual API endpoint data
      const endpointsData = await fetchAPIEndpoints();
      const actualEndpoint = endpointsData.find(ep => ep.id === endpoint.id);
      
      if (actualEndpoint) {
        const result = await testAPIEndpoint(actualEndpoint);
        if (result.success) {
          toast({
            title: "Test Successful",
            description: `Endpoint responded in ${result.responseTime}ms`
          });
        } else {
          toast({
            title: "Test Failed",
            description: result.error || "The endpoint test failed",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Unable to test the endpoint",
        variant: "destructive"
      });
    }
  };

  const toggleEndpoint = async (endpointId: string) => {
    const endpoint = endpoints.find(e => e.id === endpointId);
    if (endpoint) {
      const newStatus = !endpoint.enabled;
      setEndpoints(prev => prev.map(e => 
        e.id === endpointId 
          ? { ...e, enabled: newStatus }
          : e
      ));
      
      // Update in database
      await updateAPIEndpoint(endpointId, { is_active: newStatus });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">External Integrations</h1>
          <p className="text-muted-foreground">
            Connect with external services to automate workflows and sync data
          </p>
        </div>
        
        <Button onClick={() => window.open('https://docs.api.example.com', '_blank')}>
          <Globe className="h-4 w-4 mr-2" />
          API Documentation
        </Button>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="integrations">Available Integrations</TabsTrigger>
          <TabsTrigger value="endpoints">Custom API Endpoints</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {/* Loading State */}
          {(isLoadingProviders || isLoadingIntegrations) && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading integrations...</span>
            </div>
          )}

          {!isLoadingProviders && !isLoadingIntegrations && (
            <>
              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="capitalize"
                  >
                    {category}
                  </Button>
                ))}
              </div>

              {/* Integrations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredIntegrations.map((integration) => (
                  <Card key={integration.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {integration.category}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(integration.status)}>
                        {getStatusIcon(integration.status)}
                        <span className="ml-1 capitalize">{integration.status}</span>
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {integration.description}
                  </p>
                  
                  <div>
                    <Label className="text-xs font-medium">Features</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {integration.features.map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Pricing: {integration.pricing}
                  </div>
                  
                  <div className="flex gap-2">
                    {integration.status === 'connected' ? (
                      <>
                        <Button size="sm" variant="outline" className="flex-1">
                          <Settings className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDisconnect(integration)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleConnect(integration)}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                  </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Custom API Endpoints</h2>
            <Button>
              <Globe className="h-4 w-4 mr-2" />
              Add Endpoint
            </Button>
          </div>

          {isLoadingEndpoints && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading endpoints...</span>
            </div>
          )}

          {!isLoadingEndpoints && (
            <div className="space-y-4">
              {endpoints.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                  No API endpoints configured yet. Click "Add Endpoint" to get started.
                </div>
               ) : (
                endpoints.map((endpoint) => (
                  <Card key={endpoint.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Switch
                        checked={endpoint.enabled}
                        onCheckedChange={() => toggleEndpoint(endpoint.id)}
                      />
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {endpoint.method}
                          </Badge>
                          <h3 className="font-medium">{endpoint.name}</h3>
                          <Badge className={getStatusColor(endpoint.status)}>
                            {endpoint.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground font-mono">
                          {endpoint.url}
                        </p>
                        {endpoint.schedule && (
                          <p className="text-xs text-muted-foreground">
                            Schedule: {endpoint.schedule}
                            {endpoint.lastRun && (
                              <span className="ml-2">
                                Last run: {new Date(endpoint.lastRun).toLocaleString()}
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => testEndpoint(endpoint)}>
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Test
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Webhook endpoints allow external services to send data to your application in real-time.
              Configure these URLs in your external service providers.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Work Order Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        value="https://api.yourapp.com/webhooks/work-orders"
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button size="sm" variant="outline">Copy</Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Events</Label>
                    <div className="space-y-1">
                      {['created', 'updated', 'completed', 'cancelled'].map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <Switch defaultChecked />
                          <Label className="text-sm">work_order.{event}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Updates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Webhook URL</Label>
                    <div className="flex gap-2">
                      <Input 
                        value="https://api.yourapp.com/webhooks/customers"
                        readOnly 
                        className="font-mono text-xs"
                      />
                      <Button size="sm" variant="outline">Copy</Button>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Events</Label>
                    <div className="space-y-1">
                      {['created', 'updated', 'vehicle_added'].map((event) => (
                        <div key={event} className="flex items-center space-x-2">
                          <Switch defaultChecked />
                          <Label className="text-sm">customer.{event}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Configuration Modal */}
      {isConfiguring && selectedProvider && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Configure {selectedProvider.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Key</Label>
                <Input placeholder="Enter your API key" />
              </div>
              <div>
                <Label>Environment</Label>
                <Select defaultValue="production">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  className="flex-1"
                  onClick={() => handleSaveConfig({ apiKey: 'test123', environment: 'production' })}
                >
                  Connect
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsConfiguring(false);
                    setSelectedProvider(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}