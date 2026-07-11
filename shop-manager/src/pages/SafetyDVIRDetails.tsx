import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Truck,
  Calendar,
  Clock,
  User,
  Wrench,
  FileSignature,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { DVIRReport } from '@/types/safety';

const INSPECTION_ITEMS = [
  { key: 'brakes_ok', label: 'Brakes' },
  { key: 'lights_ok', label: 'Lights' },
  { key: 'tires_ok', label: 'Tires' },
  { key: 'mirrors_ok', label: 'Mirrors' },
  { key: 'horn_ok', label: 'Horn' },
  { key: 'windshield_ok', label: 'Windshield' },
  { key: 'wipers_ok', label: 'Wipers' },
  { key: 'steering_ok', label: 'Steering' },
  { key: 'emergency_equipment_ok', label: 'Emergency Equipment' },
  { key: 'fluid_levels_ok', label: 'Fluid Levels' },
  { key: 'exhaust_ok', label: 'Exhaust System' },
  { key: 'coupling_devices_ok', label: 'Coupling Devices' },
  { key: 'cargo_securement_ok', label: 'Cargo Securement' }
];

export default function SafetyDVIRDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dvir, setDvir] = useState<DVIRReport | null>(null);
  const [mechanicNotes, setMechanicNotes] = useState('');
  const [repairsCompleted, setRepairsCompleted] = useState(false);
  const [repairsDescription, setRepairsDescription] = useState('');

  useEffect(() => {
    if (id) {
      fetchDVIR();
    }
  }, [id]);

  const fetchDVIR = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase
        .from('dvir_reports' as any)
        .select('*')
        .eq('id', id)
        .single() as any);

      if (error) throw error;
      setDvir(data as DVIRReport);
      
      if (data.mechanic_notes) setMechanicNotes(data.mechanic_notes);
      if (data.repairs_completed) setRepairsCompleted(data.repairs_completed);
      if (data.repairs_description) setRepairsDescription(data.repairs_description);
    } catch (error: any) {
      console.error('Error fetching DVIR:', error);
      toast({
        title: 'Error',
        description: 'Failed to load DVIR report',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMechanicReview = async () => {
    if (!dvir) return;
    
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await (supabase
        .from('dvir_reports' as any)
        .update({
          mechanic_reviewed_by: userData.user.id,
          mechanic_review_date: new Date().toISOString(),
          mechanic_notes: mechanicNotes || null,
          repairs_completed: repairsCompleted,
          repairs_description: repairsDescription || null,
          mechanic_signature: userData.user.email
        })
        .eq('id', dvir.id) as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Mechanic review submitted successfully'
      });
      
      fetchDVIR();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit review',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!dvir) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">DVIR Not Found</h3>
            <p className="text-muted-foreground mb-4">This report could not be found</p>
            <Button onClick={() => navigate('/safety/dvir')}>
              Back to DVIR List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const needsReview = dvir.mechanic_review_required && !dvir.mechanic_reviewed_by;

  return (
    <>
      <Helmet>
        <title>DVIR Report Details | Safety</title>
        <meta name="description" content="View and review Driver Vehicle Inspection Report" />
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/safety/dvir')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Truck className="h-6 w-6" />
                DVIR Report
              </h1>
              <p className="text-muted-foreground">
                {dvir.inspection_type.replace('_', ' ')} inspection
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {dvir.vehicle_safe_to_operate ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle className="h-3 w-3 mr-1" />
                Safe to Operate
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="h-3 w-3 mr-1" />
                Unsafe
              </Badge>
            )}
            {needsReview && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                <Wrench className="h-3 w-3 mr-1" />
                Review Required
              </Badge>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Inspection Details */}
          <Card>
            <CardHeader>
              <CardTitle>Inspection Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(dvir.inspection_date), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{dvir.inspection_time}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>{dvir.driver_name}</span>
                </div>
                {dvir.odometer_reading && (
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span>{dvir.odometer_reading.toLocaleString()} mi</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inspection Items */}
          <Card>
            <CardHeader>
              <CardTitle>Inspection Checklist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {INSPECTION_ITEMS.map((item) => {
                  const value = dvir[item.key as keyof DVIRReport];
                  if (value === null || value === undefined) return null;
                  
                  return (
                    <div key={item.key} className="flex items-center gap-2 text-sm">
                      {value ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={value ? '' : 'text-red-600 font-medium'}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Defects Section */}
        {dvir.defects_found && (
          <Card className="border-red-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                Defects Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{dvir.defects_description || 'No description provided'}</p>
            </CardContent>
          </Card>
        )}

        {/* Mechanic Review Section */}
        <Card className={needsReview ? 'border-amber-300' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Mechanic Review
            </CardTitle>
            <CardDescription>
              {dvir.mechanic_reviewed_by 
                ? `Reviewed on ${format(new Date(dvir.mechanic_review_date!), 'MMM d, yyyy')}`
                : 'Pending mechanic review'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dvir.mechanic_reviewed_by ? (
              <>
                {dvir.mechanic_notes && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Mechanic Notes</p>
                    <p className="text-sm">{dvir.mechanic_notes}</p>
                  </div>
                )}
                
                {dvir.repairs_completed && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Repairs Completed</span>
                  </div>
                )}
                
                {dvir.repairs_description && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-1">Repairs Description</p>
                    <p className="text-sm">{dvir.repairs_description}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileSignature className="h-4 w-4" />
                  <span>Signed by: {dvir.mechanic_signature}</span>
                </div>
              </>
            ) : needsReview ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mechanic_notes">Mechanic Notes</Label>
                  <Textarea
                    id="mechanic_notes"
                    placeholder="Enter notes about the inspection and any issues found..."
                    value={mechanicNotes}
                    onChange={(e) => setMechanicNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="repairs_completed"
                    checked={repairsCompleted}
                    onCheckedChange={(c) => setRepairsCompleted(c as boolean)}
                  />
                  <Label htmlFor="repairs_completed">Repairs Completed</Label>
                </div>

                {repairsCompleted && (
                  <div className="space-y-2">
                    <Label htmlFor="repairs_description">Repairs Description</Label>
                    <Textarea
                      id="repairs_description"
                      placeholder="Describe the repairs performed..."
                      value={repairsDescription}
                      onChange={(e) => setRepairsDescription(e.target.value)}
                      rows={2}
                    />
                  </div>
                )}

                <Button 
                  onClick={handleMechanicReview} 
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <FileSignature className="h-4 w-4 mr-2" />
                  Submit Mechanic Review
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No mechanic review required</p>
            )}
          </CardContent>
        </Card>

        {/* Driver Signature */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSignature className="h-4 w-4" />
                <span>Driver Signature: {dvir.driver_signature}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Created: {format(new Date(dvir.created_at), 'MMM d, yyyy h:mm a')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}