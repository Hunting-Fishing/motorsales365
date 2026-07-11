import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  RefreshCw, 
  TestTube, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Activity,
  Clock
} from 'lucide-react';
import { ShopIntegration } from '@/hooks/integrations/useShopIntegrations';

const statusIcons = {
  'pending': Clock,
  'active': CheckCircle,
  'error': AlertCircle,
  'disabled': AlertCircle,
  'syncing': Loader2,
  'testing': TestTube
};

const statusColors = {
  'pending': 'bg-yellow-100 text-yellow-800',
  'active': 'bg-green-100 text-green-800',
  'error': 'bg-red-100 text-red-800',
  'disabled': 'bg-gray-100 text-gray-800',
  'syncing': 'bg-blue-100 text-blue-800',
  'testing': 'bg-purple-100 text-purple-800'
};

interface IntegrationCardProps {
  integration: ShopIntegration;
  onEdit: () => void;
  onTest: () => void;
  onSync: () => void;
}

export function IntegrationCard({ 
  integration, 
  onEdit, 
  onTest, 
  onSync 
}: IntegrationCardProps) {
  const StatusIcon = statusIcons[integration.sync_status as keyof typeof statusIcons] || AlertCircle;
  const statusColor = statusColors[integration.sync_status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  
  const isLoading = integration.sync_status === 'syncing' || integration.sync_status === 'testing';

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {integration.provider?.name}
            </p>
          </div>
          <Badge variant="outline" className={statusColor}>
            <StatusIcon className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            {integration.sync_status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {integration.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {integration.description}
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last sync:</span>
            <span>
              {integration.last_sync_at ? 
                new Date(integration.last_sync_at).toLocaleDateString() : 
                'Never'
              }
            </span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Status:</span>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                integration.sync_status === 'active' ? 'bg-green-500' :
                integration.sync_status === 'error' ? 'bg-red-500' :
                'bg-yellow-500'
              }`} />
              {integration.sync_status === 'active' ? 'Connected' :
               integration.sync_status === 'error' ? 'Error' :
               'Pending'
              }
            </div>
          </div>
        </div>

        {integration.error_details && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              {integration.error_details}
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onEdit} 
            className="flex-1"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onTest}
            disabled={isLoading}
          >
            <TestTube className="h-4 w-4" />
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onSync}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}