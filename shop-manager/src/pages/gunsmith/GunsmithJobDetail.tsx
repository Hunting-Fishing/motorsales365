import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Crosshair, Save, FileText, Clock, DollarSign, Wrench, User, Calendar } from 'lucide-react';
import { useUpdateGunsmithJob } from '@/hooks/useGunsmith';
import { format } from 'date-fns';
import GunsmithJobPartsPanel from './GunsmithJobPartsPanel';

const STATUS_OPTIONS = ['pending', 'in_progress', 'waiting_parts', 'completed', 'cancelled'];
const PRIORITY_OPTIONS = ['low', 'normal', 'high', 'rush'];

export default function GunsmithJobDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateJob = useUpdateGunsmithJob();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: job, isLoading } = useQuery({
    queryKey: ['gunsmith-job', id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('gunsmith_jobs')
        .select('*, customers(first_name, last_name, phone, email), gunsmith_firearms(make, model, serial_number, caliber, firearm_type)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  React.useEffect(() => {
    if (job && !isEditing) {
      setFormData({
        status: job.status,
        priority: job.priority,
        diagnosis: job.diagnosis || '',
        work_performed: job.work_performed || '',
        labor_hours: job.labor_hours || '',
        labor_rate: job.labor_rate || '',
        parts_cost: job.parts_cost || '',
        notes: job.notes || '',
        estimated_completion: job.estimated_completion || '',
        actual_completion: job.actual_completion || ''
      });
    }
  }, [job, isEditing]);

  const handleSave = () => {
    const laborHours = parseFloat(formData.labor_hours) || 0;
    const laborRate = parseFloat(formData.labor_rate) || 0;
    const partsCost = parseFloat(formData.parts_cost) || 0;
    const totalCost = (laborHours * laborRate) + partsCost;

    updateJob.mutate({
      id: id!,
      status: formData.status,
      priority: formData.priority,
      diagnosis: formData.diagnosis || null,
      work_performed: formData.work_performed || null,
      labor_hours: laborHours || null,
      labor_rate: laborRate || null,
      parts_cost: partsCost || null,
      total_cost: totalCost || null,
      notes: formData.notes || null,
      estimated_completion: formData.estimated_completion || null,
      actual_completion: formData.actual_completion || null
    }, {
      onSuccess: () => setIsEditing(false)
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-500';
      case 'in_progress': return 'bg-blue-500/10 text-blue-500';
      case 'waiting_parts': return 'bg-yellow-500/10 text-yellow-500';
      case 'cancelled': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'rush': return 'bg-red-500/10 text-red-500';
      case 'high': return 'bg-orange-500/10 text-orange-500';
      case 'normal': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading job...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Card className="max-w-lg mx-auto">
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Job not found</p>
            <Button onClick={() => navigate('/gunsmith/jobs')} className="mt-4">
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalCost = ((parseFloat(formData.labor_hours) || 0) * (parseFloat(formData.labor_rate) || 0)) + (parseFloat(formData.parts_cost) || 0);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith/jobs')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Crosshair className="h-8 w-8 text-amber-600" />
                {job.job_number}
              </h1>
              <p className="text-muted-foreground mt-1">{job.job_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(job.status)}>{job.status}</Badge>
            <Badge className={getPriorityColor(job.priority)}>{job.priority}</Badge>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.customers ? (
                <div className="space-y-1">
                  <p className="font-medium">{job.customers.first_name} {job.customers.last_name}</p>
                  <p className="text-sm text-muted-foreground">{job.customers.phone}</p>
                  <p className="text-sm text-muted-foreground">{job.customers.email}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No customer assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Firearm Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Crosshair className="h-4 w-4" />
                Firearm
              </CardTitle>
            </CardHeader>
            <CardContent>
              {job.gunsmith_firearms ? (
                <div className="space-y-1">
                  <p className="font-medium">{job.gunsmith_firearms.make} {job.gunsmith_firearms.model}</p>
                  <p className="text-sm text-muted-foreground">S/N: {job.gunsmith_firearms.serial_number || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground">{job.gunsmith_firearms.caliber} - {job.gunsmith_firearms.firearm_type}</p>
                </div>
              ) : (
                <p className="text-muted-foreground">No firearm assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received:</span>
                <span>{job.received_date ? format(new Date(job.received_date), 'MMM d, yyyy') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Est. Completion:</span>
                <span>{job.estimated_completion ? format(new Date(job.estimated_completion), 'MMM d, yyyy') : 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed:</span>
                <span>{job.actual_completion ? format(new Date(job.actual_completion), 'MMM d, yyyy') : 'Pending'}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Details */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Work Details
            </CardTitle>
            {!isEditing ? (
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={updateJob.isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {isEditing ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(p => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Diagnosis</Label>
                  <Textarea
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="Findings and diagnosis..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Work Performed</Label>
                  <Textarea
                    value={formData.work_performed}
                    onChange={(e) => setFormData({ ...formData, work_performed: e.target.value })}
                    placeholder="Describe work completed..."
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Labor Hours</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={formData.labor_hours}
                      onChange={(e) => setFormData({ ...formData, labor_hours: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Labor Rate ($/hr)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.labor_rate}
                      onChange={(e) => setFormData({ ...formData, labor_rate: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Parts Cost ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.parts_cost}
                      onChange={(e) => setFormData({ ...formData, parts_cost: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Estimated Completion</Label>
                    <Input
                      type="date"
                      value={formData.estimated_completion}
                      onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Actual Completion</Label>
                    <Input
                      type="date"
                      value={formData.actual_completion}
                      onChange={(e) => setFormData({ ...formData, actual_completion: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Internal Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Internal notes..."
                    rows={2}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p>{job.description || 'No description'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Diagnosis</p>
                    <p>{job.diagnosis || 'No diagnosis yet'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Work Performed</p>
                  <p>{job.work_performed || 'Work not yet documented'}</p>
                </div>

                {job.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm">{job.notes}</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Costs Summary */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Labor ({isEditing ? formData.labor_hours || 0 : job.labor_hours || 0} hrs @ ${isEditing ? formData.labor_rate || 0 : job.labor_rate || 0}/hr)</span>
                <span>${((isEditing ? parseFloat(formData.labor_hours) || 0 : job.labor_hours || 0) * (isEditing ? parseFloat(formData.labor_rate) || 0 : job.labor_rate || 0)).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Parts</span>
                <span>${(isEditing ? parseFloat(formData.parts_cost) || 0 : job.parts_cost || 0).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${(isEditing ? totalCost : job.total_cost || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Parts */}
        {id && (
          <div className="mt-6">
            <GunsmithJobPartsPanel jobId={id} jobStatus={job.status} customerId={job.customer_id} />
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-4">
          <Button variant="outline" onClick={() => navigate(`/gunsmith/invoices/new?job_id=${id}`)}>
            <FileText className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
