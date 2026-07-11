
import React, { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Search, Calendar, Clock, User, DollarSign } from "lucide-react";
import { RepairPlan, RepairStatus, RepairPriority } from "@/types/repairPlan";
import { getStatusColor, getPriorityColor } from "@/utils/repairPlanUtils";
import { formatDate } from "@/utils/workOrders";
import { Link } from "react-router-dom";

interface RepairPlansListProps {
  repairPlans: RepairPlan[];
}

export function RepairPlansList({ repairPlans }: RepairPlansListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepairStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<RepairPriority | "all">("all");

  // Filter repair plans based on search and filters
  const filteredPlans = repairPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plan.assignedTechnician?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || plan.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || plan.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Repair Plans</h2>
          <p className="text-muted-foreground">Manage and track equipment repair plans</p>
        </div>
        <Button asChild>
          <Link to="/repair-plans/create">
            <Plus className="mr-2 h-4 w-4" />
            New Repair Plan
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search repair plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as RepairStatus | "all")}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value as RepairPriority | "all")}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Repair Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <h3 className="text-lg font-medium">No repair plans found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm || statusFilter !== "all" || priorityFilter !== "all"
                  ? "Try adjusting your filters to see more results."
                  : "Create your first repair plan to get started."}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-2">
                  <Badge className={getStatusColor(plan.status)}>
                    {plan.status.replace('-', ' ')}
                  </Badge>
                  <Badge className={getPriorityColor(plan.priority)}>
                    {plan.priority}
                  </Badge>
                </div>
                <CardTitle className="text-lg">
                  <Link 
                    to={`/repair-plans/${plan.id}`}
                    className="hover:text-blue-600 transition-colors"
                  >
                    {plan.title}
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {plan.description}
                </p>
                
                <div className="space-y-2 text-sm">
                  {plan.scheduledDate && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      Scheduled: {formatDate(plan.scheduledDate)}
                    </div>
                  )}
                  
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-2" />
                    Duration: {plan.estimatedDuration}h
                  </div>
                  
                  {plan.assignedTechnician && (
                    <div className="flex items-center text-muted-foreground">
                      <User className="h-4 w-4 mr-2" />
                      {plan.assignedTechnician}
                    </div>
                  )}
                  
                  {plan.costEstimate && (
                    <div className="flex items-center text-muted-foreground">
                      <DollarSign className="h-4 w-4 mr-2" />
                      ${plan.costEstimate.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Task Progress */}
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">
                      {plan.tasks.filter(task => task.completed).length} / {plan.tasks.length} tasks
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 mt-1">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ 
                        width: `${plan.tasks.length > 0 ? (plan.tasks.filter(task => task.completed).length / plan.tasks.length) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link to={`/repair-plans/${plan.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
