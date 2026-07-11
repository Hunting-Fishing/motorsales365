import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Ship, Clock, MapPin, Radio, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import { VoyageLog, VOYAGE_TYPE_LABELS } from '@/types/voyage';
import { formatDistanceToNow, format } from 'date-fns';
import { CommunicationsLog } from './CommunicationsLog';
import { ActivityLog } from './ActivityLog';
import { IncidentReport } from './IncidentReport';
import { EndVoyageForm } from './EndVoyageForm';

interface ActiveVoyagePanelProps {
  voyage: VoyageLog;
  onVoyageEnded: () => void;
}

export function ActiveVoyagePanel({ voyage, onVoyageEnded }: ActiveVoyagePanelProps) {
  const [showEndForm, setShowEndForm] = useState(false);

  const duration = formatDistanceToNow(new Date(voyage.departure_datetime), { addSuffix: false });

  if (showEndForm) {
    return (
      <EndVoyageForm 
        voyage={voyage} 
        onSuccess={() => {
          setShowEndForm(false);
          onVoyageEnded();
        }}
        onCancel={() => setShowEndForm(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Voyage Header */}
      <Card className="border-primary/50 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5 text-primary" />
              Active Voyage: {voyage.voyage_number}
            </CardTitle>
            <Badge variant="default" className="animate-pulse">In Progress</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Vessel</p>
              <p className="font-medium">{voyage.vessel?.name || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Master</p>
              <p className="font-medium">{voyage.master_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Voyage Type</p>
              <p className="font-medium">{voyage.voyage_type ? VOYAGE_TYPE_LABELS[voyage.voyage_type] : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Duration
              </p>
              <p className="font-medium">{duration}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-green-500" />
              <span className="font-medium">{voyage.origin_location}</span>
            </div>
            <span className="text-muted-foreground">→</span>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="font-medium">{voyage.destination_location}</span>
            </div>
          </div>

          {voyage.barge_name && (
            <div className="mt-2 text-sm">
              <span className="text-muted-foreground">Barge: </span>
              <span className="font-medium">{voyage.barge_name}</span>
            </div>
          )}

          <div className="mt-4 pt-4 border-t flex gap-2 justify-end">
            <Button variant="default" onClick={() => setShowEndForm(true)} className="gap-2">
              <CheckCircle className="h-4 w-4" />
              End Voyage
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for logging */}
      <Tabs defaultValue="communications" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="communications" className="gap-2">
            <Radio className="h-4 w-4" />
            <span className="hidden sm:inline">Communications</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Activity</span>
          </TabsTrigger>
          <TabsTrigger value="incidents" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">Incidents</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="communications">
          <CommunicationsLog voyageId={voyage.id} />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityLog voyage={voyage} />
        </TabsContent>

        <TabsContent value="incidents">
          <IncidentReport voyage={voyage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
