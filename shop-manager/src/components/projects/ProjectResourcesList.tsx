import { useState } from 'react';
import { useProjectResources } from '@/hooks/useProjectResources';
import { useStaffForPlanner, useEquipmentForPlanner } from '@/hooks/usePlannerData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Wrench, Trash2, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import type { ResourceType } from '@/types/projectResource';
import type { ProjectPhase } from '@/types/projectBudget';
import { TimeEntryDialog } from './TimeEntryDialog';
import { ResourceTimeEntries } from './ResourceTimeEntries';
import type { TimeEntry } from '@/types/projectResource';
import type { Json } from '@/integrations/supabase/types';

// Helper function to parse time entries from JSON
function parseTimeEntries(entries: Json | null): TimeEntry[] {
  if (!entries || !Array.isArray(entries)) return [];
  return entries.map((e: any) => ({
    id: e.id || '',
    date: e.date || '',
    hours: e.hours || 0,
    notes: e.notes || null,
    logged_by: e.logged_by,
    logged_at: e.logged_at || '',
  }));
}

interface ProjectResourcesListProps {
  projectId: string;
  phases?: ProjectPhase[];
}

export function ProjectResourcesList({ projectId, phases }: ProjectResourcesListProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [resourceTypeToAdd, setResourceTypeToAdd] = useState<ResourceType>('employee');
  const [timeEntryResource, setTimeEntryResource] = useState<{id: string; name: string; rate: number} | null>(null);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  
  const { resources, staffResources, equipmentResources, createResource, deleteResource, isLoading, refetch } = useProjectResources(projectId);
  const { data: staff } = useStaffForPlanner();
  const { data: equipment } = useEquipmentForPlanner();

  const [formData, setFormData] = useState({
    resource_id: '',
    phase_id: '',
    role: '',
    planned_hours: 0,
    hourly_rate: 0,
    start_date: '',
    end_date: '',
    allocation_percent: 100,
    notes: '',
  });

  const handleAdd = async () => {
    const selectedResource = resourceTypeToAdd === 'employee' 
      ? staff?.find(s => s.id === formData.resource_id)
      : equipment?.find(e => e.id === formData.resource_id);
    
    const resourceName = resourceTypeToAdd === 'employee'
      ? `${selectedResource?.first_name || ''} ${selectedResource?.last_name || ''}`.trim() || selectedResource?.email
      : (selectedResource as any)?.name;

    await createResource.mutateAsync({
      resource_type: resourceTypeToAdd,
      resource_id: formData.resource_id,
      resource_name: resourceName,
      phase_id: formData.phase_id || null,
      role: formData.role || null,
      planned_hours: formData.planned_hours,
      hourly_rate: formData.hourly_rate || null,
      planned_cost: formData.planned_hours * (formData.hourly_rate || 0),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      allocation_percent: formData.allocation_percent,
      notes: formData.notes || null,
    });

    setShowAddDialog(false);
    setFormData({
      resource_id: '',
      phase_id: '',
      role: '',
      planned_hours: 0,
      hourly_rate: 0,
      start_date: '',
      end_date: '',
      allocation_percent: 100,
      notes: '',
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Remove this resource assignment?')) {
      await deleteResource.mutateAsync(id);
    }
  };

  const toggleEntries = (id: string) => {
    const newExpanded = new Set(expandedEntries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEntries(newExpanded);
  };

  const getVarianceColor = (actual: number, planned: number) => {
    if (planned === 0) return 'text-muted-foreground';
    const percent = (actual / planned) * 100;
    if (percent <= 100) return 'text-green-600';
    if (percent <= 110) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getVarianceBadge = (actual: number, planned: number) => {
    if (planned === 0) return null;
    const percent = ((actual / planned) * 100).toFixed(0);
    const isOver = actual > planned;
    return (
      <Badge 
        variant={isOver ? 'destructive' : 'secondary'} 
        className="text-xs ml-2"
      >
        {isOver && <AlertTriangle className="h-3 w-3 mr-1" />}
        {percent}%
      </Badge>
    );
  };

  const totalPlannedCost = resources?.reduce((acc, r) => acc + (r.planned_cost || 0), 0) || 0;
  const totalPlannedHours = resources?.reduce((acc, r) => acc + (r.planned_hours || 0), 0) || 0;
  const totalActualHours = resources?.reduce((acc, r) => acc + (r.actual_hours || 0), 0) || 0;
  const totalActualCost = resources?.reduce((acc, r) => acc + (r.actual_cost || 0), 0) || 0;
  const timeVariance = totalPlannedHours > 0 ? ((totalActualHours - totalPlannedHours) / totalPlannedHours) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{resources?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Resources</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{totalPlannedHours}h</div>
            <p className="text-sm text-muted-foreground">Planned Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${getVarianceColor(totalActualHours, totalPlannedHours)}`}>
              {totalActualHours}h
            </div>
            <p className="text-sm text-muted-foreground">Actual Hours</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className={`text-2xl font-bold ${timeVariance > 10 ? 'text-red-600' : timeVariance > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
              {timeVariance > 0 ? '+' : ''}{timeVariance.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground">Time Variance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">${totalActualCost.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Actual Cost</p>
          </CardContent>
        </Card>
      </div>

      {/* Staff Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Staff Assignments ({staffResources.length})
          </CardTitle>
          <Button size="sm" onClick={() => { setResourceTypeToAdd('employee'); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Staff
          </Button>
        </CardHeader>
        <CardContent>
          {staffResources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No staff assigned</p>
          ) : (
            <div className="space-y-2">
              {staffResources.map((resource) => {
                const entries = parseTimeEntries(resource.time_entries);
                const isExpanded = expandedEntries.has(resource.id);
                
                return (
                  <Collapsible key={resource.id} open={isExpanded} onOpenChange={() => toggleEntries(resource.id)}>
                    <div className="border border-border rounded-lg">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <CollapsibleTrigger asChild>
                            <button className="p-1 hover:bg-muted rounded">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          </CollapsibleTrigger>
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{resource.resource_name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {resource.role && <span>{resource.role}</span>}
                              <span className={getVarianceColor(resource.actual_hours || 0, resource.planned_hours || 0)}>
                                {resource.actual_hours || 0}h / {resource.planned_hours}h
                              </span>
                              {getVarianceBadge(resource.actual_hours || 0, resource.planned_hours || 0)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setTimeEntryResource({
                              id: resource.id,
                              name: resource.resource_name || '',
                              rate: resource.hourly_rate || 0,
                            })}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Log Time
                          </Button>
                          <Badge variant="secondary" className="text-xs">
                            ${(resource.actual_cost || 0).toLocaleString()}
                          </Badge>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(resource.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        <div className="px-3 pb-3 pt-0 border-t">
                          <div className="pt-3">
                            <ResourceTimeEntries
                              assignmentId={resource.id}
                              entries={entries}
                              hourlyRate={resource.hourly_rate || 0}
                              onUpdate={() => refetch()}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            Equipment Assignments ({equipmentResources.length})
          </CardTitle>
          <Button size="sm" onClick={() => { setResourceTypeToAdd('equipment'); setShowAddDialog(true); }}>
            <Plus className="h-4 w-4 mr-1" />
            Add Equipment
          </Button>
        </CardHeader>
        <CardContent>
          {equipmentResources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No equipment assigned</p>
          ) : (
            <div className="space-y-2">
              {equipmentResources.map((resource) => (
                <div key={resource.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{resource.resource_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {resource.start_date && resource.end_date && (
                          <span>
                            {format(new Date(resource.start_date), 'MMM d')} - {format(new Date(resource.end_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {resource.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(resource.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Resource Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add {resourceTypeToAdd === 'employee' ? 'Staff' : 'Equipment'} Assignment
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Select {resourceTypeToAdd === 'employee' ? 'Staff Member' : 'Equipment'}</Label>
              <Select value={formData.resource_id} onValueChange={(v) => setFormData(prev => ({ ...prev, resource_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={`Choose ${resourceTypeToAdd === 'employee' ? 'staff' : 'equipment'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {resourceTypeToAdd === 'employee' ? (
                    staff?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {`${s.first_name || ''} ${s.last_name || ''}`.trim() || s.email}
                      </SelectItem>
                    ))
                  ) : (
                    equipment?.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name} ({e.equipment_type})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {phases && phases.length > 0 && (
              <div>
                <Label>Assign to Phase (Optional)</Label>
                <Select value={formData.phase_id} onValueChange={(v) => setFormData(prev => ({ ...prev, phase_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All phases..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Phases</SelectItem>
                    {phases.map((phase) => (
                      <SelectItem key={phase.id} value={phase.id}>
                        {phase.phase_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {resourceTypeToAdd === 'employee' && (
              <>
                <div>
                  <Label>Role</Label>
                  <Input
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    placeholder="e.g., Lead Technician, Operator"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Planned Hours</Label>
                    <Input
                      type="number"
                      value={formData.planned_hours}
                      onChange={(e) => setFormData(prev => ({ ...prev, planned_hours: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>Hourly Rate ($)</Label>
                    <Input
                      type="number"
                      value={formData.hourly_rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, hourly_rate: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>Allocation %</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.allocation_percent}
                    onChange={(e) => setFormData(prev => ({ ...prev, allocation_percent: Number(e.target.value) }))}
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Input
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formData.resource_id || createResource.isPending}>
              {createResource.isPending ? 'Adding...' : 'Add Assignment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Time Entry Dialog */}
      {timeEntryResource && (
        <TimeEntryDialog
          assignmentId={timeEntryResource.id}
          resourceName={timeEntryResource.name}
          hourlyRate={timeEntryResource.rate}
          open={!!timeEntryResource}
          onOpenChange={(open) => !open && setTimeEntryResource(null)}
          onSuccess={() => refetch()}
        />
      )}
    </div>
  );
}
