import { useState } from 'react';
import { format } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { JobSafetyAnalysis, useJobSafetyAnalyses, useJSAHazards, JSAHazard } from '@/hooks/useJobSafetyAnalysis';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Calendar, MapPin, User, Shield, Trash2, Plus, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface JSADetailsSheetProps {
  jsa: JobSafetyAnalysis | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending_approval: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-green-500/10 text-green-500',
  rejected: 'bg-red-500/10 text-red-500',
};

const riskColors: Record<string, string> = {
  low: 'text-green-500',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  critical: 'text-red-500',
};

function getRiskLevel(score: number): string {
  if (score <= 4) return 'low';
  if (score <= 9) return 'medium';
  if (score <= 16) return 'high';
  return 'critical';
}

export function JSADetailsSheet({ jsa, open, onOpenChange }: JSADetailsSheetProps) {
  const { updateJSA, deleteJSA } = useJobSafetyAnalyses();
  const { hazards, addHazard, updateHazard, removeHazard } = useJSAHazards(jsa?.id || null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newHazard, setNewHazard] = useState({
    task_step: '',
    hazard_description: '',
    likelihood: 3,
    severity: 3,
    control_measures: '',
    responsible_person: '',
  });

  if (!jsa) return null;

  const handleStatusChange = async (status: string) => {
    await updateJSA.mutateAsync({ 
      id: jsa.id, 
      status: status as JobSafetyAnalysis['status'],
      approved_at: status === 'approved' ? new Date().toISOString() : undefined,
    });
  };

  const handleAddHazard = async () => {
    if (!newHazard.task_step || !newHazard.hazard_description) {
      toast.error('Please fill in task step and hazard description');
      return;
    }

    const stepNumber = hazards.length + 1;
    await addHazard.mutateAsync({
      jsa_id: jsa.id,
      step_number: stepNumber,
      task_step: newHazard.task_step,
      hazard_description: newHazard.hazard_description,
      likelihood: newHazard.likelihood,
      severity: newHazard.severity,
      control_measures: newHazard.control_measures.split('\n').filter(Boolean),
      responsible_person: newHazard.responsible_person || undefined,
      residual_risk_level: getRiskLevel(newHazard.likelihood * newHazard.severity),
    });

    setNewHazard({
      task_step: '',
      hazard_description: '',
      likelihood: 3,
      severity: 3,
      control_measures: '',
      responsible_person: '',
    });

    // Update overall risk level
    const maxRisk = Math.max(...hazards.map(h => h.risk_score), newHazard.likelihood * newHazard.severity);
    await updateJSA.mutateAsync({
      id: jsa.id,
      overall_risk_level: getRiskLevel(maxRisk) as JobSafetyAnalysis['overall_risk_level'],
    });

    toast.success('Hazard added');
  };

  const handleDeleteJSA = async () => {
    await deleteJSA.mutateAsync(jsa.id);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">{jsa.jsa_number}</Badge>
                  <Badge className={statusColors[jsa.status]}>
                    {jsa.status.replace('_', ' ')}
                  </Badge>
                  {jsa.overall_risk_level && (
                    <Badge variant="outline" className={riskColors[jsa.overall_risk_level]}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {jsa.overall_risk_level} risk
                    </Badge>
                  )}
                </div>
                <SheetTitle>{jsa.job_title}</SheetTitle>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Info */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(new Date(jsa.date_performed), 'MMMM d, yyyy')}
              </div>
              {jsa.location && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {jsa.location}
                </div>
              )}
              {jsa.supervisor_name && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <User className="h-4 w-4" />
                  {jsa.supervisor_name}
                </div>
              )}
            </div>

            {/* Status Actions */}
            <div className="flex gap-2">
              {jsa.status === 'draft' && (
                <Button size="sm" onClick={() => handleStatusChange('pending_approval')}>
                  Submit for Approval
                </Button>
              )}
              {jsa.status === 'pending_approval' && (
                <>
                  <Button size="sm" onClick={() => handleStatusChange('approved')}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleStatusChange('rejected')}>
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>

            <Tabs defaultValue="hazards" className="mt-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="hazards">Hazards ({hazards.length})</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="ppe">PPE</TabsTrigger>
              </TabsList>

              <TabsContent value="hazards" className="space-y-4">
                {/* Hazard List */}
                {hazards.map((hazard, index) => (
                  <Card key={hazard.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">
                          Step {hazard.step_number}: {hazard.task_step}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={riskColors[getRiskLevel(hazard.risk_score)]}>
                            Risk: {hazard.risk_score}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeHazard.mutateAsync(hazard.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Hazard:</span> {hazard.hazard_description}
                      </div>
                      <div className="flex gap-4">
                        <span>Likelihood: {hazard.likelihood}/5</span>
                        <span>Severity: {hazard.severity}/5</span>
                      </div>
                      {hazard.control_measures.length > 0 && (
                        <div>
                          <span className="font-medium">Controls:</span>
                          <ul className="list-disc list-inside ml-2">
                            {hazard.control_measures.map((cm, i) => (
                              <li key={i}>{cm}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Add New Hazard */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Add Hazard</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Task Step</Label>
                        <Input
                          value={newHazard.task_step}
                          onChange={(e) => setNewHazard(prev => ({ ...prev, task_step: e.target.value }))}
                          placeholder="e.g., Remove old battery"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Responsible Person</Label>
                        <Input
                          value={newHazard.responsible_person}
                          onChange={(e) => setNewHazard(prev => ({ ...prev, responsible_person: e.target.value }))}
                          placeholder="e.g., Lead Technician"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Hazard Description</Label>
                      <Input
                        value={newHazard.hazard_description}
                        onChange={(e) => setNewHazard(prev => ({ ...prev, hazard_description: e.target.value }))}
                        placeholder="e.g., Acid exposure, electrical shock"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Likelihood (1-5)</Label>
                        <Select 
                          value={newHazard.likelihood.toString()} 
                          onValueChange={(v) => setNewHazard(prev => ({ ...prev, likelihood: parseInt(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Rare</SelectItem>
                            <SelectItem value="2">2 - Unlikely</SelectItem>
                            <SelectItem value="3">3 - Possible</SelectItem>
                            <SelectItem value="4">4 - Likely</SelectItem>
                            <SelectItem value="5">5 - Almost Certain</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Severity (1-5)</Label>
                        <Select 
                          value={newHazard.severity.toString()} 
                          onValueChange={(v) => setNewHazard(prev => ({ ...prev, severity: parseInt(v) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 - Negligible</SelectItem>
                            <SelectItem value="2">2 - Minor</SelectItem>
                            <SelectItem value="3">3 - Moderate</SelectItem>
                            <SelectItem value="4">4 - Major</SelectItem>
                            <SelectItem value="5">5 - Catastrophic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="p-2 bg-muted rounded text-sm">
                      Risk Score: <span className={`font-bold ${riskColors[getRiskLevel(newHazard.likelihood * newHazard.severity)]}`}>
                        {newHazard.likelihood * newHazard.severity}
                      </span> ({getRiskLevel(newHazard.likelihood * newHazard.severity)})
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Control Measures (one per line)</Label>
                      <Textarea
                        value={newHazard.control_measures}
                        onChange={(e) => setNewHazard(prev => ({ ...prev, control_measures: e.target.value }))}
                        placeholder="Wear acid-resistant gloves&#10;Use insulated tools&#10;Ensure battery disconnected"
                        rows={3}
                      />
                    </div>
                    <Button onClick={handleAddHazard} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Hazard
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                {jsa.job_description && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Job Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{jsa.job_description}</p>
                    </CardContent>
                  </Card>
                )}
                {jsa.special_precautions && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Special Precautions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{jsa.special_precautions}</p>
                    </CardContent>
                  </Card>
                )}
                {jsa.emergency_procedures && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Emergency Procedures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{jsa.emergency_procedures}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="ppe" className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Required PPE
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jsa.required_ppe && jsa.required_ppe.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {jsa.required_ppe.map((ppe, i) => (
                          <Badge key={i} variant="secondary">{ppe}</Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No PPE specified</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="pt-4 border-t">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete JSA
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete JSA?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this Job Safety Analysis and all associated hazards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteJSA} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
