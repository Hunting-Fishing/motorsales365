import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Calendar, Edit, Trash2, Flag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { hybridActivitiesService } from "@/services/hybridActivitiesService";
import { ComplianceRequirement } from "@/types/hybrid";
import { ComplianceRequirementForm } from "./ComplianceRequirementForm";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ComplianceDashboard() {
  const { toast } = useToast();
  const [requirements, setRequirements] = useState<ComplianceRequirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<ComplianceRequirement | undefined>();
  const [deleteRequirement, setDeleteRequirement] = useState<ComplianceRequirement | null>(null);

  useEffect(() => {
    loadRequirements();
  }, []);

  const loadRequirements = async () => {
    setLoading(true);
    try {
      const data = await hybridActivitiesService.getComplianceRequirements();
      setRequirements(data);
    } catch (error) {
      console.error('Error loading requirements:', error);
      toast({
        title: "Error",
        description: "Failed to load compliance requirements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadRequirements();
    setShowForm(false);
    setEditingRequirement(undefined);
  };

  const handleEdit = (requirement: ComplianceRequirement) => {
    setEditingRequirement(requirement);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteRequirement) return;
    
    try {
      await hybridActivitiesService.deleteComplianceRequirement(deleteRequirement.id);
      toast({
        title: "Requirement Deleted",
        description: "Compliance requirement has been deleted successfully.",
      });
      loadRequirements();
    } catch (error) {
      console.error('Error deleting requirement:', error);
      toast({
        title: "Error",
        description: "Failed to delete requirement",
        variant: "destructive",
      });
    } finally {
      setDeleteRequirement(null);
    }
  };

  const handleMarkComplete = async (requirement: ComplianceRequirement) => {
    try {
      await hybridActivitiesService.updateComplianceRequirement(requirement.id, {
        completion_status: 'completed'
      });
      toast({
        title: "Requirement Completed",
        description: "Compliance requirement marked as completed.",
      });
      loadRequirements();
    } catch (error) {
      console.error('Error updating requirement:', error);
      toast({
        title: "Error",
        description: "Failed to update requirement status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'overdue': return 'text-red-600 bg-red-100';
      case 'in_progress': return 'text-blue-600 bg-blue-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <Flag className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredRequirements = requirements.filter(req => {
    const matchesSearch = req.requirement_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         req.requirement_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.completion_status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || req.priority_level === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Sort by urgency: overdue first, then by due date
  const sortedRequirements = [...filteredRequirements].sort((a, b) => {
    if (a.completion_status === 'overdue' && b.completion_status !== 'overdue') return -1;
    if (b.completion_status === 'overdue' && a.completion_status !== 'overdue') return 1;
    
    const aDays = getDaysUntilDue(a.due_date);
    const bDays = getDaysUntilDue(b.due_date);
    
    if (aDays === null && bDays === null) return 0;
    if (aDays === null) return 1;
    if (bDays === null) return -1;
    
    return aDays - bDays;
  });

  const overdue = requirements.filter(r => r.completion_status === 'overdue').length;
  const completed = requirements.filter(r => r.completion_status === 'completed').length;
  const pending = requirements.filter(r => r.completion_status === 'pending').length;
  const inProgress = requirements.filter(r => r.completion_status === 'in_progress').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requirements</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requirements.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completed}</div>
            <p className="text-xs text-muted-foreground">
              {requirements.length > 0 ? Math.round((completed / requirements.length) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdue}</div>
            <p className="text-xs text-muted-foreground">Require immediate attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress + pending}</div>
            <p className="text-xs text-muted-foreground">{inProgress} active, {pending} pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                Compliance Requirements
              </CardTitle>
              <CardDescription>
                Monitor regulatory requirements for hybrid structures
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Requirement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search requirements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Requirements List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading compliance requirements...
              </div>
            ) : sortedRequirements.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {requirements.length === 0 
                  ? "No compliance requirements configured. Add requirements to track regulatory obligations."
                  : "No requirements match your current filters."
                }
              </div>
            ) : (
              sortedRequirements.map((req) => {
                const daysUntilDue = getDaysUntilDue(req.due_date);
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                const isDueSoon = daysUntilDue !== null && daysUntilDue <= 7 && daysUntilDue >= 0;

                return (
                  <div key={req.id} className={`border rounded-lg p-4 space-y-3 ${
                    isOverdue ? 'border-red-200 bg-red-50' : 
                    isDueSoon ? 'border-yellow-200 bg-yellow-50' : ''
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(req.priority_level)}
                          <h4 className="font-medium">{req.requirement_name}</h4>
                          <Badge variant="outline">{req.requirement_type}</Badge>
                          <Badge className={getStatusColor(req.completion_status)}>
                            {req.completion_status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {req.description && (
                          <p className="text-sm text-muted-foreground">{req.description}</p>
                        )}
                      </div>
                      
                      <div className="flex gap-2">
                        {req.completion_status !== 'completed' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleMarkComplete(req)}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-3 w-3" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleEdit(req)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setDeleteRequirement(req)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Applies To</div>
                        <div className="font-medium">{req.applicable_to.replace('_', ' ')}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Due Date</div>
                        <div className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}>
                          {req.due_date ? (
                            <>
                              {new Date(req.due_date).toLocaleDateString()}
                              {daysUntilDue !== null && (
                                <span className="ml-1">
                                  ({daysUntilDue < 0 ? `${Math.abs(daysUntilDue)} days overdue` : 
                                    daysUntilDue === 0 ? 'Due today' : 
                                    `${daysUntilDue} days remaining`})
                                </span>
                              )}
                            </>
                          ) : 'No due date'}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Priority</div>
                        <div className="font-medium capitalize">{req.priority_level}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Cost</div>
                        <div className="font-medium">
                          {req.cost_to_comply ? `$${req.cost_to_comply.toLocaleString()}` : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {req.responsible_person && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Responsible: </span>
                        <span className="font-medium">{req.responsible_person}</span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Forms and Dialogs */}
      <ComplianceRequirementForm
        open={showForm}
        onOpenChange={setShowForm}
        requirement={editingRequirement}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteRequirement} onOpenChange={() => setDeleteRequirement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Requirement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteRequirement?.requirement_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}