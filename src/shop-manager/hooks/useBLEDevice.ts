import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

// Standard Bluetooth GATT Service UUIDs
const HEART_RATE_SERVICE = 'heart_rate';
const HEART_RATE_MEASUREMENT = 'heart_rate_measurement';
const WEIGHT_SCALE_SERVICE = 0x181D;
const WEIGHT_MEASUREMENT = 0x2A9D;
const BODY_COMPOSITION_SERVICE = 0x181B;
const BODY_COMPOSITION_MEASUREMENT = 0x2A9C;

export type BLEDeviceType = 'heart_rate' | 'weight_scale' | 'body_composition';

export interface BLEReading {
  type: BLEDeviceType;
  timestamp: Date;
  deviceName: string;
  heartRate?: number;
  weightKg?: number;
  bodyFatPercent?: number;
  muscleMassKg?: number;
  waterPercent?: number;
  bmi?: number;
}

interface UseBLEDeviceReturn {
  isSupported: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  deviceName: string | null;
  lastReading: BLEReading | null;
  readings: BLEReading[];
  connectHeartRate: () => Promise<void>;
  connectScale: () => Promise<void>;
  disconnect: () => void;
  error: string | null;
}

export function useBLEDevice(): UseBLEDeviceReturn {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [lastReading, setLastReading] = useState<BLEReading | null>(null);
  const [readings, setReadings] = useState<BLEReading[]>([]);
  const [error, setError] = useState<string | null>(null);
  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);

  const isSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

  const addReading = useCallback((reading: BLEReading) => {
    setLastReading(reading);
    setReadings(prev => [reading, ...prev].slice(0, 50));
  }, []);

  const connectHeartRate = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser. Use Chrome or Edge.');
      toast({ title: 'Not Supported', description: 'Web Bluetooth requires Chrome or Edge browser.', variant: 'destructive' });
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [HEART_RATE_SERVICE] }],
        optionalServices: ['battery_service'],
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'Heart Rate Monitor');

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDeviceName(null);
        toast({ title: 'Device disconnected' });
      });

      const server = await device.gatt!.connect();
      serverRef.current = server;
      const service = await server.getPrimaryService(HEART_RATE_SERVICE);
      const characteristic = await service.getCharacteristic(HEART_RATE_MEASUREMENT);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value as DataView;
        const flags = value.getUint8(0);
        const is16Bit = flags & 0x01;
        const hr = is16Bit ? value.getUint16(1, true) : value.getUint8(1);

        addReading({
          type: 'heart_rate',
          timestamp: new Date(),
          deviceName: device.name || 'HR Monitor',
          heartRate: hr,
        });
      });

      setIsConnected(true);
      toast({ title: 'Connected!', description: `${device.name || 'HR Monitor'} is streaming heart rate data.` });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setError(err.message);
        toast({ title: 'Connection Failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, addReading, toast]);

  const connectScale = useCallback(async () => {
    if (!isSupported) {
      setError('Web Bluetooth is not supported in this browser.');
      toast({ title: 'Not Supported', description: 'Web Bluetooth requires Chrome or Edge browser.', variant: 'destructive' });
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [WEIGHT_SCALE_SERVICE] },
          { services: [BODY_COMPOSITION_SERVICE] },
        ],
        optionalServices: [WEIGHT_SCALE_SERVICE, BODY_COMPOSITION_SERVICE, 'battery_service'],
      });

      deviceRef.current = device;
      setDeviceName(device.name || 'Smart Scale');

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setDeviceName(null);
        toast({ title: 'Scale disconnected' });
      });

      const server = await device.gatt!.connect();
      serverRef.current = server;

      // Try body composition first, fall back to weight
      try {
        const bodyService = await server.getPrimaryService(BODY_COMPOSITION_SERVICE);
        const bodyChar = await bodyService.getCharacteristic(BODY_COMPOSITION_MEASUREMENT);
        await bodyChar.startNotifications();
        bodyChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value as DataView;
          const flags = value.getUint16(0, true);
          let offset = 2;

          // Body fat percentage (resolution 0.1%)
          const bodyFat = value.getUint16(offset, true) / 10;
          offset += 2;

          const reading: BLEReading = {
            type: 'body_composition',
            timestamp: new Date(),
            deviceName: device.name || 'Smart Scale',
            bodyFatPercent: bodyFat,
          };

          // Check flags for additional fields
          if (flags & 0x0002) { // Basal metabolism present
            offset += 2;
          }
          if (flags & 0x0004) { // Muscle percentage present
            reading.muscleMassKg = value.getUint16(offset, true) / 10;
            offset += 2;
          }

          addReading(reading);
        });
      } catch {
        // Fall back to weight scale
        const weightService = await server.getPrimaryService(WEIGHT_SCALE_SERVICE);
        const weightChar = await weightService.getCharacteristic(WEIGHT_MEASUREMENT);
        await weightChar.startNotifications();
        weightChar.addEventListener('characteristicvaluechanged', (event: any) => {
          const value = event.target.value as DataView;
          const flags = value.getUint8(0);
          const isImperial = flags & 0x01;
          let weight = value.getUint16(1, true);

          // Resolution is 0.005 kg or 0.01 lb
          const weightKg = isImperial ? (weight * 0.01 * 0.453592) : (weight * 0.005);

          addReading({
            type: 'weight_scale',
            timestamp: new Date(),
            deviceName: device.name || 'Smart Scale',
            weightKg: Math.round(weightKg * 10) / 10,
          });
        });
      }

      setIsConnected(true);
      toast({ title: 'Connected!', description: `${device.name || 'Smart Scale'} ready. Step on the scale to read.` });
    } catch (err: any) {
      if (err.name !== 'NotFoundError') {
        setError(err.message);
        toast({ title: 'Connection Failed', description: err.message, variant: 'destructive' });
      }
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, addReading, toast]);

  const disconnect = useCallback(() => {
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    deviceRef.current = null;
    serverRef.current = null;
    setIsConnected(false);
    setDeviceName(null);
  }, []);

  return {
    isSupported,
    isConnecting,
    isConnected,
    deviceName,
    lastReading,
    readings,
    connectHeartRate,
    connectScale,
    disconnect,
    error,
  };
}
