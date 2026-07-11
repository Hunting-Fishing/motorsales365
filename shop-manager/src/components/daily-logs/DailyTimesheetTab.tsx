import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, ChevronLeft, ChevronRight, Plus, RefreshCw, Save, Clock, Loader2 } from 'lucide-react';
import { format, addDays, subDays } from 'date-fns';
import { useDailyTimesheet, NewTimesheetEntry } from '@/hooks/useDailyTimesheet';
import { useActivityTypes } from '@/hooks/useActivityTypes';
import { TimeEntryRow } from './TimeEntryRow';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';

interface VesselEquipment {
  id: string;
  name: string;
  type: 'vessel' | 'equipment';
  category?: string;
}

const createEmptyEntry = (): NewTimesheetEntry => ({
  start_time: '',
  end_time: '',
  activity_type_id: '',
  vessel_id: null,
  work_location_type: 'on_site',
  work_description: '',
  comments: ''
});

export function DailyTimesheetTab() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [localEntries, setLocalEntries] = useState<NewTimesheetEntry[]>([createEmptyEntry()]);
  const [additionalComments, setAdditionalComments] = useState('');
  const [vesselEquipmentOptions, setVesselEquipmentOptions] = useState<VesselEquipment[]>([]);
  
  const { shopId } = useShopId();
  const { entries, loading, saving, userName, dailyTotal, calculateHours, saveEntries, refetch } = useDailyTimesheet(selectedDate);
  const { activityTypes, loading: loadingTypes } = useActivityTypes();

  // Load vessel/equipment options
  useEffect(() => {
    loadVesselEquipmentOptions();
  }, [shopId]);

  // Sync local entries with loaded entries
  useEffect(() => {
    if (entries.length > 0) {
      setLocalEntries(entries.map(e => ({
        start_time: e.start_time || '',
        end_time: e.end_time || '',
        activity_type_id: e.activity_type_id || '',
        vessel_id: e.vessel_id,
        work_location_type: e.work_location_type || 'on_site',
        work_description: e.work_description || '',
        comments: e.comments || ''
      })));
    } else if (!loading) {
      setLocalEntries([createEmptyEntry()]);
    }
  }, [entries, loading]);

  const loadVesselEquipmentOptions = async () => {
    try {
      const options: VesselEquipment[] = [];
      
      // Load all equipment from equipment_assets (includes vessels, forklifts, trucks, etc.)
      const { data: equipment, error } = await supabase
        .from('equipment_assets')
        .select('id, name, equipment_type, status')
        .in('status', ['operational', 'maintenance']) // Exclude 'down' equipment
        .order('equipment_type')
        .order('name');
      
      if (error) {
        console.error('Error loading equipment:', error);
        return;
      }

      if (equipment) {
        equipment.forEach(e => {
          // Categorize by equipment_type for grouping
          const equipmentType = e.equipment_type || 'other';
          const isVessel = equipmentType.toLowerCase().includes('vessel') || 
                          equipmentType.toLowerCase().includes('boat');
          
          // Format category name for display
          const categoryMap: Record<string, string> = {
            'vessel': 'Vessels',
            'boat': 'Vessels',
            'forklift': 'Forklifts',
            'heavy_truck': 'Heavy Trucks',
            'fleet_vehicle': 'Fleet Vehicles',
            'trailer': 'Trailers',
            'generator': 'Generators',
            'pump': 'Pumps',
            'compressor': 'Compressors',
            'welder': 'Welders',
            'crane': 'Cranes',
            'other': 'Other Equipment'
          };
          
          const category = categoryMap[equipmentType.toLowerCase()] || 
                          equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1);
          
          options.push({
            id: e.id,
            name: e.name,
            type: isVessel ? 'vessel' : 'equipment',
            category: category
          });
        });
      }

      setVesselEquipmentOptions(options);
    } catch (error) {
      console.error('Error loading vessel/equipment options:', error);
    }
  };

  const handleDateChange = (days: number) => {
    setSelectedDate(prev => days > 0 ? addDays(prev, days) : subDays(prev, Math.abs(days)));
  };

  const handleEntryChange = (index: number, field: string, value: string | null) => {
    setLocalEntries(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addEntry = () => {
    setLocalEntries(prev => [...prev, createEmptyEntry()]);
  };

  const deleteEntry = (index: number) => {
    if (localEntries.length > 1) {
      setLocalEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    // Auto-fill work_description from activity type if empty
    const entriesWithDescription = localEntries.map(entry => {
      if (!entry.work_description && entry.activity_type_id) {
        const activityType = activityTypes.find(t => t.id === entry.activity_type_id);
        return { ...entry, work_description: activityType?.name || 'Timesheet entry' };
      }
      return { ...entry, work_description: entry.work_description || 'Timesheet entry' };
    });
    await saveEntries(entriesWithDescription, additionalComments);
  };

  const runningTotal = localEntries.reduce((sum, entry) => {
    return sum + calculateHours(entry.start_time, entry.end_time);
  }, 0);

  if (loading || loadingTypes) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Daily Timesheet
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Employee: <span className="font-medium text-foreground">{userName}</span>
              </p>
            </div>
            
            {/* Date Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => handleDateChange(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-md min-w-[180px] justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className="border-0 bg-transparent p-0 h-auto text-center font-medium"
                />
              </div>
              
              <Button variant="outline" size="icon" onClick={() => handleDateChange(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button variant="outline" size="icon" onClick={refetch}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Time Entries */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Time Entries</CardTitle>
            <div className="text-sm">
              Running Total: <span className="font-bold text-primary">{runningTotal.toFixed(2)} hrs</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Column Headers */}
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-3">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-2 text-center">Start</div>
            <div className="col-span-2 text-center">Stop</div>
            <div className="col-span-2 text-center">Activity</div>
            <div className="col-span-2 text-center">Vessel/Equip</div>
            <div className="col-span-1 text-center">Hrs</div>
            <div className="col-span-1 text-center">Note</div>
            <div className="col-span-1 text-center">Del</div>
          </div>
          
          {/* Entry Rows */}
          {localEntries.map((entry, index) => (
            <TimeEntryRow
              key={index}
              index={index}
              entry={entry}
              activityTypes={activityTypes}
              vesselEquipmentOptions={vesselEquipmentOptions}
              duration={calculateHours(entry.start_time, entry.end_time)}
              onChange={(field, value) => handleEntryChange(index, field, value)}
              onDelete={() => deleteEntry(index)}
              canDelete={localEntries.length > 1}
            />
          ))}
          
          {/* Add Activity Button */}
          <Button
            variant="outline"
            onClick={addEntry}
            className="w-full mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Activity
          </Button>
        </CardContent>
      </Card>

      {/* Additional Comments & Save */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label htmlFor="additionalComments">Additional Comments</Label>
            <Textarea
              id="additionalComments"
              value={additionalComments}
              onChange={(e) => setAdditionalComments(e.target.value)}
              placeholder="Enter any additional notes for the day..."
              className="mt-2"
              rows={3}
            />
          </div>
          
          {/* Daily Total & Save */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 bg-primary/10 rounded-lg">
                <p className="text-xs text-muted-foreground">Daily Total</p>
                <p className="text-2xl font-bold text-primary">{runningTotal.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">hours</p>
              </div>
              
              {dailyTotal > 0 && dailyTotal !== runningTotal && (
                <div className="text-center px-4 py-2 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Saved Total</p>
                  <p className="text-xl font-semibold">{dailyTotal.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">hours</p>
                </div>
              )}
            </div>
            
            <Button
              onClick={handleSave}
              disabled={saving}
              size="lg"
              className="min-w-[150px]"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Timesheet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
