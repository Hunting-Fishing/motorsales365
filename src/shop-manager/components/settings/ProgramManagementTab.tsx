import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, DollarSign, Calendar, MapPin, Trash2, Edit, Target, TrendingUp, UserCheck, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { nonprofitApi } from '@/lib/services/nonprofitApi';
import type { Program, CreateProgramData, Volunteer, VolunteerAssignment } from '@/types/nonprofit';

export function ProgramManagementTab() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<VolunteerAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState<CreateProgramData>({
    name: '',
    description: '',
    program_type: 'community',
    status: 'planned',
    start_date: '',
    end_date: '',
    budget_allocated: 0,
    target_participants: 0,
    location: '',
    coordinator_id: '',
    grant_funded: false,
    funding_sources: [],
    success_metrics: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [programsData, volunteersData, assignmentsData] = await Promise.all([
        nonprofitApi.getPrograms(),
        nonprofitApi.getVolunteers(),
        nonprofitApi.getAssignments()
      ]);
      setPrograms(programsData);
      setVolunteers(volunteersData);
      setAssignments(assignmentsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignVolunteer = async (programId: string, volunteerId: string, role: string) => {
    try {
      await nonprofitApi.createAssignment({
        volunteer_id: volunteerId,
        program_id: programId,
        role,
        start_date: new Date().toISOString().split('T')[0],
        hours_committed: 10
      });
      toast({
        title: "Success",
        description: "Volunteer assigned successfully"
      });
      loadData();
      setIsAssignmentDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign volunteer",
        variant: "destructive"
      });
    }
  };

  const getAssignedVolunteers = (programId: string) => {
    const programAssignments = assignments.filter(a => a.program_id === programId && a.status === 'active');
    return programAssignments.map(assignment => {
      const volunteer = volunteers.find(v => v.id === assignment.volunteer_id);
      return { assignment, volunteer };
    }).filter(item => item.volunteer);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProgram) {
        await nonprofitApi.updateProgram(editingProgram.id, formData);
        toast({
          title: "Success",
          description: "Program updated successfully"
        });
      } else {
        await nonprofitApi.createProgram(formData);
        toast({
          title: "Success",
          description: "Program created successfully"
        });
      }
      resetForm();
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save program",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this program?')) return;
    
    try {
      await nonprofitApi.deleteProgram(id);
      toast({
        title: "Success",
        description: "Program deleted successfully"
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete program",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      program_type: 'community',
      status: 'planned',
      start_date: '',
      end_date: '',
      budget_allocated: 0,
      target_participants: 0,
      location: '',
      coordinator_id: '',
      grant_funded: false,
      funding_sources: [],
      success_metrics: []
    });
    setEditingProgram(null);
  };

  const handleEdit = (program: Program) => {
    setEditingProgram(program);
    setFormData({
      name: program.name,
      description: program.description || '',
      program_type: program.program_type,
      status: program.status,
      start_date: program.start_date || '',
      end_date: program.end_date || '',
      budget_allocated: program.budget_allocated,
      target_participants: program.target_participants,
      location: program.location || '',
      coordinator_id: program.coordinator_id || '',
      grant_funded: program.grant_funded,
      funding_sources: program.funding_sources,
      success_metrics: program.success_metrics
    });
    setIsDialogOpen(true);
  };

  const getStatusColor = (status: Program['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'planned': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgramTypeColor = (type: Program['program_type']) => {
    const colors = {
      education: 'bg-purple-100 text-purple-800',
      health: 'bg-red-100 text-red-800',
      environment: 'bg-green-100 text-green-800',
      community: 'bg-blue-100 text-blue-800',
      youth: 'bg-orange-100 text-orange-800',
      seniors: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type] || colors.other;
  };

  // Calculate summary statistics
  const activePrograms = programs.filter(p => p.status === 'active').length;
  const totalParticipants = programs.reduce((sum, p) => sum + p.current_participants, 0);
  const totalBudget = programs.reduce((sum, p) => sum + p.budget_allocated, 0);

  if (loading) {
    return <div className="p-6">Loading programs...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
            <Target className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activePrograms}</div>
            <p className="text-xs text-muted-foreground">of {programs.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">People Served</CardTitle>
            <Users className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalParticipants.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current participants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <TrendingUp className="h-4 w-4 ml-auto text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">${totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Allocated funding</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Program Management</h2>
          <p className="text-muted-foreground">
            Manage your organization's programs and track their progress
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Add Program
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProgram ? 'Edit Program' : 'Create New Program'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Program Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="program_type">Program Type</Label>
                  <Select
                    value={formData.program_type}
                    onValueChange={(value) => setFormData({ ...formData, program_type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="community">Community</SelectItem>
                      <SelectItem value="youth">Youth</SelectItem>
                      <SelectItem value="seniors">Seniors</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget_allocated">Budget Allocated</Label>
                  <Input
                    id="budget_allocated"
                    type="number"
                    value={formData.budget_allocated}
                    onChange={(e) => setFormData({ ...formData, budget_allocated: Number(e.target.value) })}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_participants">Target Participants</Label>
                  <Input
                    id="target_participants"
                    type="number"
                    value={formData.target_participants}
                    onChange={(e) => setFormData({ ...formData, target_participants: Number(e.target.value) })}
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProgram ? 'Update Program' : 'Create Program'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {programs.map((program) => (
          <Card key={program.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{program.name}</CardTitle>
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(program.status)}>
                      {program.status}
                    </Badge>
                    <Badge className={getProgramTypeColor(program.program_type)}>
                      {program.program_type}
                    </Badge>
                  </div>
                </div>
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(program)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(program.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {program.description && (
                <CardDescription className="line-clamp-2">
                  {program.description}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{program.current_participants}/{program.target_participants}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>${program.budget_allocated.toLocaleString()}</span>
                </div>
              </div>
              
              {program.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{program.location}</span>
                </div>
              )}

              {program.start_date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(program.start_date).toLocaleDateString()}
                    {program.end_date && ` - ${new Date(program.end_date).toLocaleDateString()}`}
                  </span>
                </div>
              )}

              {program.grant_funded && (
                <Badge variant="secondary" className="w-fit">
                  Grant Funded
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {programs.length === 0 && (
        <Card className="p-8 text-center">
          <div className="space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No Programs Yet</h3>
              <p className="text-muted-foreground">
                Create your first program to start managing your organization's initiatives.
              </p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Program
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}