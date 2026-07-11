import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ship, Clock, MapPin, AlertTriangle, ChevronRight, Users, Package } from 'lucide-react';
import { VoyageLog, VOYAGE_TYPE_LABELS } from '@/types/voyage';
import { format, formatDistanceStrict } from 'date-fns';
import { useVoyageLogs } from '@/hooks/useVoyageLogs';
import { VoyagePdfExport } from './VoyagePdfExport';
export function VoyageHistoryList() {
  const { voyageLogs, isLoading } = useVoyageLogs();

  const completedVoyages = voyageLogs.filter(v => v.voyage_status === 'completed');

  if (isLoading) {
    return <p className="text-muted-foreground">Loading voyage history...</p>;
  }

  if (completedVoyages.length === 0) {
    return (
      <div className="text-center py-12">
        <Ship className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No completed voyages yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {completedVoyages.map(voyage => (
        <VoyageCard key={voyage.id} voyage={voyage} />
      ))}
    </div>
  );
}

function VoyageCard({ voyage }: { voyage: VoyageLog }) {
  const duration = voyage.arrival_datetime 
    ? formatDistanceStrict(new Date(voyage.departure_datetime), new Date(voyage.arrival_datetime))
    : 'N/A';

  const fuelConsumed = voyage.fuel_start && voyage.fuel_end 
    ? voyage.fuel_start - voyage.fuel_end 
    : null;

  const engineHoursUsed = voyage.engine_hours_start && voyage.engine_hours_end
    ? voyage.engine_hours_end - voyage.engine_hours_start
    : null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{voyage.voyage_number}</span>
              <Badge variant="outline">{voyage.voyage_type ? VOYAGE_TYPE_LABELS[voyage.voyage_type] : 'N/A'}</Badge>
              {voyage.has_incidents && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {voyage.incidents?.length || 0} Incident(s)
                </Badge>
              )}
            </div>

            {/* Vessel & Date */}
            <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Ship className="h-3 w-3" />
                {voyage.vessel?.name || 'Unknown vessel'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(voyage.departure_datetime), 'MMM d, yyyy')}
              </span>
            </div>

            {/* Route */}
            <div className="mt-2 flex items-center gap-2 text-sm">
              <MapPin className="h-3 w-3 text-green-500" />
              <span>{voyage.origin_location}</span>
              <span className="text-muted-foreground">→</span>
              <MapPin className="h-3 w-3 text-primary" />
              <span>{voyage.destination_location}</span>
            </div>

            {/* Details */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Duration: {duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span>Master: {voyage.master_name}</span>
              </div>
              {fuelConsumed !== null && (
                <div>
                  <span className="text-muted-foreground">Fuel: </span>
                  <span>{fuelConsumed.toFixed(1)} L</span>
                </div>
              )}
              {engineHoursUsed !== null && (
                <div>
                  <span className="text-muted-foreground">Engine: </span>
                  <span>{engineHoursUsed.toFixed(1)} hrs</span>
                </div>
              )}
            </div>

            {/* Cargo info */}
            {voyage.barge_name && (
              <div className="mt-2 text-xs flex items-center gap-1">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span>Barge: {voyage.barge_name}</span>
                {voyage.cargo_weight && (
                  <span className="text-muted-foreground">
                    ({voyage.cargo_weight} {voyage.cargo_weight_unit})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <VoyagePdfExport voyage={voyage} />
            <Button variant="ghost" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
