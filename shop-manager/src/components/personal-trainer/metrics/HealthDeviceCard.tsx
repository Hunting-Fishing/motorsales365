import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Watch, Activity, Scale, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DEVICES = [
  { provider: 'apple_health', name: 'Apple Health', icon: Smartphone, color: 'text-pink-500' },
  { provider: 'google_fit', name: 'Google Fit', icon: Activity, color: 'text-green-500' },
  { provider: 'fitbit', name: 'Fitbit', icon: Watch, color: 'text-cyan-500' },
  { provider: 'smart_scale', name: 'Smart Scale', icon: Scale, color: 'text-purple-500' },
];

interface HealthDeviceCardProps {
  integrations: any[];
  clientId?: string;
  onConnect?: (provider: string) => void;
}

export function HealthDeviceCard({ integrations, clientId, onConnect }: HealthDeviceCardProps) {
  const { toast } = useToast();

  const handleSync = (provider: string) => {
    toast({ title: 'Sync initiated', description: `${provider} sync will be available when the integration is fully connected.` });
  };

  const handleConnect = (provider: string) => {
    toast({ title: 'Connect Device', description: `${provider} integration setup will be available soon. The platform is ready for OAuth connection.` });
    onConnect?.(provider);
  };

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium mb-3">Connected Devices</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DEVICES.map(device => {
            const integration = integrations.find((i: any) => i.provider === device.provider);
            const connected = integration?.is_connected;
            const Icon = device.icon;

            return (
              <div
                key={device.provider}
                className={`relative rounded-lg border p-3 text-center space-y-2 transition-all ${
                  connected ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/30'
                }`}
              >
                <Icon className={`h-6 w-6 mx-auto ${connected ? device.color : 'text-muted-foreground'}`} />
                <p className="text-xs font-medium">{device.name}</p>
                {connected ? (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] gap-1" onClick={() => handleSync(device.name)}>
                    <RefreshCw className="h-3 w-3" /> Sync
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-[10px]"
                    disabled={!clientId}
                    onClick={() => handleConnect(device.provider)}
                  >
                    Connect
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
