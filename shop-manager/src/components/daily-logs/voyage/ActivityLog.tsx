import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, MapPin, Clock } from 'lucide-react';
import { useVoyageLogs } from '@/hooks/useVoyageLogs';
import { VoyageLog, ActivityType, ActivityLogEntry, ACTIVITY_TYPE_LABELS } from '@/types/voyage';
import { format } from 'date-fns';

interface ActivityLogProps {
  voyage: VoyageLog;
}

export function ActivityLog({ voyage }: ActivityLogProps) {
  const { updateVoyage, isUpdating } = useVoyageLogs();
  const [activityType, setActivityType] = useState<ActivityType>('other');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const activities = voyage.activity_log || [];

  const addActivity = async () => {
    if (!description.trim()) return;

    const newEntry: ActivityLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: activityType,
      description: description.trim(),
      location: location.trim() || undefined
    };

    await updateVoyage({
      id: voyage.id,
      activity_log: [...activities, newEntry]
    });

    setDescription('');
    setLocation('');
    setActivityType('other');
  };

  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'departure':
      case 'arrival':
        return <MapPin className="h-4 w-4" />;
      case 'waypoint_arrival':
      case 'waypoint_departure':
        return <MapPin className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: ActivityType) => {
    switch (type) {
      case 'departure': return 'bg-green-500';
      case 'arrival': return 'bg-blue-500';
      case 'incident': return 'bg-red-500';
      case 'weather_change': return 'bg-yellow-500';
      case 'equipment_issue': return 'bg-orange-500';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Activity Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Log Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Activity Type</Label>
                <Select value={activityType} onValueChange={v => setActivityType(v as ActivityType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Location (optional)</Label>
                <Input 
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="Current location..."
                />
              </div>
            </div>
            <div>
              <Label>Description *</Label>
              <Textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What happened..."
                rows={2}
              />
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={addActivity} 
                disabled={!description.trim() || isUpdating}
                size="sm"
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-sm">No activities logged yet</p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {[...activities].reverse().map((activity, index) => (
                  <div key={activity.id} className="relative pl-10">
                    {/* Timeline dot */}
                    <div className={`absolute left-2.5 w-3 h-3 rounded-full ${getActivityColor(activity.type)}`} />
                    
                    <div className="p-3 border rounded-lg bg-card">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getActivityIcon(activity.type)}
                        <Badge variant="outline" className="text-xs">
                          {ACTIVITY_TYPE_LABELS[activity.type]}
                        </Badge>
                        {activity.location && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.location}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(activity.timestamp), 'MMM d, HH:mm:ss')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
