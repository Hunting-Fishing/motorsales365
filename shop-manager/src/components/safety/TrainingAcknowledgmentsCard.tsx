import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Plus, Calendar, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { format } from 'date-fns';
import { TrainingAcknowledgmentDialog } from './TrainingAcknowledgmentDialog';
import { TRAINING_TYPE_LABELS, type TrainingType } from '@/types/safety';

interface TrainingRecord {
  id: string;
  staff_id: string;
  training_topic: string;
  training_type: TrainingType;
  acknowledged_at: string;
  staff?: {
    first_name: string;
    last_name: string;
  };
}

interface TrainingAcknowledgmentsCardProps {
  staffId?: string;
  limit?: number;
}

export function TrainingAcknowledgmentsCard({ staffId, limit = 10 }: TrainingAcknowledgmentsCardProps) {
  const { shopId } = useShopId();
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<TrainingRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [staffOptions, setStaffOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (shopId) {
      fetchTrainings();
      fetchStaff();
    }
  }, [shopId, staffId]);

  const fetchTrainings = async () => {
    if (!shopId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('safety_training_acknowledgments' as any)
        .select(`
          id,
          staff_id,
          training_topic,
          training_type,
          acknowledged_at
        `)
        .eq('shop_id', shopId)
        .order('acknowledged_at', { ascending: false })
        .limit(limit);

      if (staffId) {
        query = query.eq('staff_id', staffId);
      }

      const { data, error } = await (query as any);
      if (error) throw error;

      // Fetch staff names separately
      const staffIds = [...new Set((data || []).map((t: any) => t.staff_id))] as string[];
      let staffMap: Record<string, { first_name: string; last_name: string }> = {};
      
      if (staffIds.length > 0) {
        const { data: staffData } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', staffIds);
        
        staffData?.forEach(s => {
          staffMap[s.id] = { first_name: s.first_name || '', last_name: s.last_name || '' };
        });
      }

      const trainingsWithStaff = (data || []).map((t: any) => ({
        ...t,
        staff: staffMap[t.staff_id]
      }));

      setTrainings(trainingsWithStaff);
    } catch (error) {
      console.error('Error fetching trainings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    if (!shopId) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('shop_id', shopId);
    
    if (data) {
      setStaffOptions(data.map(p => ({
        id: p.id,
        name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown'
      })));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Training Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Training Records
            </CardTitle>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Training
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {trainings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No training records found</p>
              <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Training
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {trainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{training.training_topic}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {!staffId && training.staff && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {training.staff.first_name} {training.staff.last_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(training.acknowledged_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {TRAINING_TYPE_LABELS[training.training_type] || training.training_type}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TrainingAcknowledgmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchTrainings}
        staffOptions={staffOptions}
        preSelectedStaffId={staffId}
      />
    </>
  );
}
