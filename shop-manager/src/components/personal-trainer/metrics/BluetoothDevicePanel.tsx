import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bluetooth, BluetoothOff, Heart, Scale, Loader2, Unplug, Activity } from 'lucide-react';
import { useBLEDevice, type BLEReading } from '@/hooks/useBLEDevice';
import { format } from 'date-fns';

interface Props {
  onReadingReceived?: (reading: BLEReading) => void;
}

export function BluetoothDevicePanel({ onReadingReceived }: Props) {
  const ble = useBLEDevice();

  // Forward readings to parent
  React.useEffect(() => {
    if (ble.lastReading && onReadingReceived) {
      onReadingReceived(ble.lastReading);
    }
  }, [ble.lastReading, onReadingReceived]);

  if (!ble.isSupported) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-muted-foreground">
          <BluetoothOff className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">Web Bluetooth Not Available</p>
          <p className="text-xs mt-1">Use Chrome or Edge on desktop/Android to connect BLE devices.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bluetooth className="h-4 w-4 text-primary" />
            Bluetooth Devices
          </CardTitle>
          {ble.isConnected && (
            <Badge variant="outline" className="text-xs border-primary/30 text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary mr-1.5 animate-pulse" />
              {ble.deviceName}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {!ble.isConnected ? (
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={ble.connectHeartRate}
              disabled={ble.isConnecting}
            >
              {ble.isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Heart className="h-6 w-6 text-destructive" />
              )}
              <span className="text-xs">Heart Rate Monitor</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={ble.connectScale}
              disabled={ble.isConnecting}
            >
              {ble.isConnecting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Scale className="h-6 w-6 text-primary" />
              )}
              <span className="text-xs">Smart Scale</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Live reading */}
            {ble.lastReading && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-center">
                {ble.lastReading.heartRate != null && (
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="h-5 w-5 text-destructive animate-pulse" />
                    <span className="text-3xl font-bold text-foreground">{ble.lastReading.heartRate}</span>
                    <span className="text-sm text-muted-foreground">bpm</span>
                  </div>
                )}
                {ble.lastReading.weightKg != null && (
                  <div className="flex items-center justify-center gap-2">
                    <Scale className="h-5 w-5 text-primary" />
                    <span className="text-3xl font-bold text-foreground">{ble.lastReading.weightKg}</span>
                    <span className="text-sm text-muted-foreground">kg</span>
                  </div>
                )}
                {ble.lastReading.bodyFatPercent != null && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{ble.lastReading.bodyFatPercent}%</span>
                    <span className="text-xs text-muted-foreground">body fat</span>
                  </div>
                )}
              </div>
            )}

            {/* Recent readings */}
            {ble.readings.length > 1 && (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {ble.readings.slice(0, 10).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">{format(r.timestamp, 'h:mm:ss a')}</span>
                    <span className="font-medium">
                      {r.heartRate != null && `${r.heartRate} bpm`}
                      {r.weightKg != null && `${r.weightKg} kg`}
                      {r.bodyFatPercent != null && ` · ${r.bodyFatPercent}% fat`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <Button variant="outline" size="sm" className="w-full text-destructive" onClick={ble.disconnect}>
              <Unplug className="h-3.5 w-3.5 mr-1" /> Disconnect
            </Button>
          </>
        )}

        {ble.error && (
          <p className="text-xs text-destructive text-center">{ble.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
