import React, { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, Gauge, Fuel, X, PenLine } from 'lucide-react';
import { VoyageLog } from '@/types/voyage';
import { useVoyageLogs } from '@/hooks/useVoyageLogs';
import SignatureCanvas from 'react-signature-canvas';

interface EndVoyageFormProps {
  voyage: VoyageLog;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormData {
  arrival_datetime: string;
  engine_hours_end: string;
  fuel_end: string;
  notes: string;
}

export function EndVoyageForm({ voyage, onSuccess, onCancel }: EndVoyageFormProps) {
  const { endVoyage, isEnding } = useVoyageLogs();
  const signatureRef = useRef<SignatureCanvas>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      arrival_datetime: new Date().toISOString().slice(0, 16),
      engine_hours_end: '',
      fuel_end: '',
      notes: ''
    }
  });

  const onSubmit = async (data: FormData) => {
    let signature: string | undefined;
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      signature = signatureRef.current.toDataURL();
    }

    await endVoyage({
      id: voyage.id,
      arrival_datetime: data.arrival_datetime,
      engine_hours_end: data.engine_hours_end ? parseFloat(data.engine_hours_end) : undefined,
      fuel_end: data.fuel_end ? parseFloat(data.fuel_end) : undefined,
      master_signature: signature,
      notes: data.notes || undefined
    });

    onSuccess();
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  // Calculate fuel consumed if we have both readings
  const calculateFuelConsumed = () => {
    if (voyage.fuel_start) {
      return `Start: ${voyage.fuel_start} L`;
    }
    return null;
  };

  // Calculate engine hours used if we have both readings
  const calculateEngineHours = () => {
    if (voyage.engine_hours_start) {
      return `Start: ${voyage.engine_hours_start} hrs`;
    }
    return null;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            End Voyage: {voyage.voyage_number}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Arrival Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Arrival Time *</Label>
              <Input 
                type="datetime-local" 
                {...register('arrival_datetime', { required: true })}
              />
              {errors.arrival_datetime && (
                <span className="text-destructive text-sm">Required</span>
              )}
            </div>
            <div>
              <Label>Destination</Label>
              <Input value={voyage.destination_location} disabled className="bg-muted" />
            </div>
          </div>

          {/* Equipment Readings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2">
                <Gauge className="h-3 w-3" /> Engine Hours (End)
              </Label>
              <Input 
                type="number" 
                step="0.1" 
                {...register('engine_hours_end')} 
                placeholder="0.0"
              />
              {calculateEngineHours() && (
                <p className="text-xs text-muted-foreground mt-1">{calculateEngineHours()}</p>
              )}
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Fuel className="h-3 w-3" /> Fuel Level (End) - Litres
              </Label>
              <Input 
                type="number" 
                step="0.1" 
                {...register('fuel_end')} 
                placeholder="0.0"
              />
              {calculateFuelConsumed() && (
                <p className="text-xs text-muted-foreground mt-1">{calculateFuelConsumed()}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label>Final Notes</Label>
            <Textarea 
              {...register('notes')} 
              placeholder="Any final notes about the voyage..."
              rows={3}
            />
          </div>

          {/* Signature */}
          <div>
            <Label className="flex items-center gap-2 mb-2">
              <PenLine className="h-3 w-3" />
              Master's Signature
            </Label>
            <div className="border rounded-lg bg-white">
              <SignatureCanvas
                ref={signatureRef}
                penColor="black"
                canvasProps={{
                  className: 'w-full h-32 rounded-lg',
                  style: { width: '100%', height: '128px' }
                }}
              />
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={clearSignature}
              className="mt-1"
            >
              Clear Signature
            </Button>
          </div>

          {/* Summary */}
          {voyage.has_incidents && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
              <p className="text-sm text-destructive">
                ⚠️ This voyage has {voyage.incidents?.length || 0} incident(s) reported
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isEnding} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              {isEnding ? 'Completing...' : 'Complete Voyage'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
