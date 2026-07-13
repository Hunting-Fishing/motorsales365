import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  ExternalLink, 
  Settings, 
  Database, 
  BarChart, 
  MessageSquare, 
  CreditCard, 
  Zap, 
  Activity,
  CheckCircle
} from 'lucide-react';
import { IntegrationProvider } from '@/hooks/integrations/useIntegrationProviders';

const categoryIcons = {
  'crm': Database,
  'accounting': BarChart,
  'communication': MessageSquare,
  'payment': CreditCard,
  'automation': Zap,
  'analytics': Activity
};

const categoryColors = {
  'crm': 'bg-blue-100 text-blue-800',
  'accounting': 'bg-green-100 text-green-800',
  'communication': 'bg-purple-100 text-purple-800',
  'payment': 'bg-yellow-100 text-yellow-800',
  'automation': 'bg-orange-100 text-orange-800',
  'analytics': 'bg-pink-100 text-pink-800'
};

interface IntegrationProviderCardProps {
  provider: IntegrationProvider;
  isConnected: boolean;
  onConnect: () => void;
  onViewDetails: () => void;
}

export function IntegrationProviderCard({ 
  provider, 
  isConnected, 
  onConnect, 
  onViewDetails 
}: IntegrationProviderCardProps) {
  const IconComponent = categoryIcons[provider.category as keyof typeof categoryIcons] || Settings;
  const categoryColor = categoryColors[provider.category as keyof typeof categoryColors] || 'bg-gray-100 text-gray-800';

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {provider.logo_url ? (
              <img 
                src={provider.logo_url} 
                alt={`${provider.name} logo`}
                className="w-10 h-10 rounded-lg object-contain"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <IconComponent className="h-5 w-5" />
              </div>
            )}
            <div>
              <CardTitle className="text-lg">{provider.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={categoryColor}>
                  {provider.category}
                </Badge>
                {isConnected && (
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="line-clamp-3">
          {provider.description || 'No description available'}
        </CardDescription>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Auth:</span>
            <Badge variant="outline" className="text-xs">
              {provider.auth_type.toUpperCase()}
            </Badge>
          </div>
          
          {provider.webhook_support && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Webhook support</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {!isConnected ? (
            <Button onClick={onConnect} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Connect
            </Button>
          ) : (
            <Button onClick={onViewDetails} variant="outline" className="flex-1">
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          )}
          
          {provider.website_url && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(provider.website_url!, '_blank')}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}