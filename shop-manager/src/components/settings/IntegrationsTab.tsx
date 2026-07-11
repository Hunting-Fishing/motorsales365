
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Settings, 
  Link as LinkIcon, 
  CheckCircle, 
  XCircle,
  Mail,
  MessageSquare,
  CreditCard,
  Phone
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  status: 'connected' | 'disconnected' | 'error';
  enabled: boolean;
  lastSync?: string;
  category: 'communication' | 'payment' | 'productivity' | 'analytics';
}

interface IntegrationsTabProps {
  shopId?: string;
}

export const IntegrationsTab: React.FC<IntegrationsTabProps> = ({ shopId }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      id: 'email',
      name: 'Email Service',
      description: 'Connect your email service for automated communications',
      icon: Mail,
      status: 'disconnected',
      enabled: false,
      category: 'communication'
    },
    {
      id: 'sms',
      name: 'SMS Service', 
      description: 'Send SMS notifications and reminders to customers',
      icon: MessageSquare,
      status: 'disconnected',
      enabled: false,
      category: 'communication'
    },
    {
      id: 'payment',
      name: 'Payment Gateway',
      description: 'Process payments and manage transactions',
      icon: CreditCard,
      status: 'disconnected',
      enabled: false,
      category: 'payment'
    },
    {
      id: 'phone',
      name: 'Phone System',
      description: 'Integrate with your phone system for call logging',
      icon: Phone,
      status: 'disconnected',
      enabled: false,
      category: 'communication'
    }
  ]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (shopId) {
      fetchIntegrationSettings();
    } else {
      setLoading(false);
    }
  }, [shopId]);

  const fetchIntegrationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .eq('shop_id', shopId)
        .eq('settings_key', 'integrations')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching integration settings:', error);
        return;
      }

      if (data?.settings_value) {
        const savedSettings = data.settings_value as any;
        setIntegrations(prev => prev.map(integration => ({
          ...integration,
          ...savedSettings[integration.id]
        })));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIntegration = async (integrationId: string, enabled: boolean) => {
    try {
      const updatedIntegrations = integrations.map(integration =>
        integration.id === integrationId
          ? { ...integration, enabled }
          : integration
      );

      setIntegrations(updatedIntegrations);

      if (shopId) {
        const integrationsData = updatedIntegrations.reduce((acc, integration) => {
          acc[integration.id] = {
            status: integration.status,
            enabled: integration.enabled,
            lastSync: integration.lastSync
          };
          return acc;
        }, {} as any);

        const { error } = await supabase
          .from('company_settings')
          .upsert({
            shop_id: shopId,
            settings_key: 'integrations',
            settings_value: integrationsData
          });

        if (error) throw error;
      }

      toast.success(`${integrations.find(i => i.id === integrationId)?.name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error updating integration:', error);
      toast.error('Failed to update integration settings');
    }
  };

  const handleConnect = (integrationId: string) => {
    toast.info(`Connect ${integrations.find(i => i.id === integrationId)?.name} functionality will be implemented`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Connected</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  const categories = [
    { id: 'communication', name: 'Communication', icon: MessageSquare },
    { id: 'payment', name: 'Payment', icon: CreditCard },
    { id: 'productivity', name: 'Productivity', icon: Zap },
    { id: 'analytics', name: 'Analytics', icon: Settings }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Zap className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-semibold">Integrations</h2>
        <Badge variant="outline" className="ml-2">
          {integrations.filter(i => i.status === 'connected').length} connected
        </Badge>
      </div>

      {categories.map(category => {
        const categoryIntegrations = integrations.filter(i => i.category === category.id);
        if (categoryIntegrations.length === 0) return null;

        const CategoryIcon = category.icon;

        return (
          <Card key={category.id} className="bg-white shadow-md rounded-xl border border-gray-100">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <CategoryIcon className="h-5 w-5 text-blue-600" />
                {category.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {categoryIntegrations.map((integration) => {
                  const IconComponent = integration.icon;
                  return (
                    <div
                      key={integration.id}
                      className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <IconComponent className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                            {getStatusIcon(integration.status)}
                            {getStatusBadge(integration.status)}
                          </div>
                          <p className="text-sm text-gray-600">{integration.description}</p>
                          {integration.lastSync && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last synced: {new Date(integration.lastSync).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={integration.enabled}
                          onCheckedChange={(enabled) => handleToggleIntegration(integration.id, enabled)}
                          disabled={integration.status !== 'connected'}
                        />
                        <Button
                          variant={integration.status === 'connected' ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleConnect(integration.id)}
                        >
                          <LinkIcon className="h-4 w-4 mr-2" />
                          {integration.status === 'connected' ? 'Configure' : 'Connect'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
