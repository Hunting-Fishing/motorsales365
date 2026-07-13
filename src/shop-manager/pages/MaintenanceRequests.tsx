import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertCircle, Wrench, Calendar, User, ArrowRight, Eye, Image, Video, 
  Package, DollarSign, Clock, Plus, Loader2, Search, Filter,
  CheckCircle2, AlertTriangle, Settings
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useShopId } from '@/hooks/useShopId';
import { CreateMaintenanceRequestDialog } from '@/components/equipment-details/CreateMaintenanceRequestDialog';
import { ConvertToWorkOrderDialog } from '@/components/equipment-details/ConvertToWorkOrderDialog';
import { ViewMaintenanceRequestDialog } from '@/components/equipment-details/ViewMaintenanceRequestDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500/10 text-yellow-500',
  approved: 'bg-blue-500/10 text-blue-500',
  rejected: 'bg-red-500/10 text-red-500',
  in_progress: 'bg-purple-500/10 text-purple-500',
  completed: 'bg-green-500/10 text-green-500',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500/10 text-gray-500',
  medium: 'bg-yellow-500/10 text-yellow-500',
  high: 'bg-orange-500/10 text-orange-500',
  urgent: 'bg-red-500/10 text-red-500',
};

interface MaintenanceRequest {
  id: string;
  request_number: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  request_type: string;
  requested_at: string;
  requested_by_name: string;
  equipment_id: string;
  attachments: any[];
  parts_requested: any[];
  estimated_cost: number;
  estimated_hours: number;
  scheduled_date: string;
  notes: string;
  equipment_name?: string;
}

interface Equipment {
  id: string;
  name: string;
}

export default function MaintenanceRequests() {
  const { shopId, loading: shopLoading } = useShopId();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [equipmentSelectOpen, setEquipmentSelectOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  // Fetch maintenance requests with equipment names
  const { data: requests, isLoading, refetch } = useQuery({
    queryKey: ['all-maintenance-requests', shopId],
    queryFn: async (): Promise<MaintenanceRequest[]> => {
      if (!shopId) return [];
      
      // First fetch maintenance requests - use type assertion to avoid deep type instantiation
      const requestsResult = await (supabase as any)
        .from('maintenance_requests')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      
      if (requestsResult.error) throw requestsResult.error;
      if (!requestsResult.data) return [];
      
      const requestsData = requestsResult.data as any[];
      
      // Get unique equipment IDs
      const equipmentIds = [...new Set(
        requestsData.map(r => r.equipment_id).filter(Boolean)
      )] as string[];
      
      // Fetch equipment names
      let equipmentMap: Record<string, string> = {};
      if (equipmentIds.length > 0) {
        const equipResult = await (supabase as any)
          .from('equipment_assets')
          .select('id, name')
          .in('id', equipmentIds);
        
        const equipmentData = (equipResult.data || []) as any[];
        equipmentMap = equipmentData.reduce((acc: Record<string, string>, eq) => {
          acc[eq.id] = eq.name;
          return acc;
        }, {});
      }
      
      // Map equipment name to each request
      return requestsData.map((req) => ({
        ...req,
        equipment_name: equipmentMap[req.equipment_id] || 'Unknown Equipment'
      }));
    },
    enabled: !!shopId,
  });

  // Fetch equipment list for new request dialog
  const { data: equipmentList } = useQuery({
    queryKey: ['equipment-list', shopId],
    queryFn: async (): Promise<Equipment[]> => {
      if (!shopId) return [];
      
      // Use type assertion to avoid deep type instantiation
      const result = await (supabase as any)
        .from('equipment_assets')
        .select('id, name')
        .eq('shop_id', shopId)
        .eq('is_active', true)
        .order('name');
      
      if (result.error) throw result.error;
      return (result.data || []).map((e: any) => ({ id: e.id, name: e.name }));
    },
    enabled: !!shopId,
  });

  // Calculate stats
  const stats = useMemo(() => {
    if (!requests) return { pending: 0, inProgress: 0, completedThisMonth: 0 };
    
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    return {
      pending: requests.filter((r: MaintenanceRequest) => r.status === 'pending').length,
      inProgress: requests.filter((r: MaintenanceRequest) => r.status === 'in_progress').length,
      completedThisMonth: requests.filter((r: MaintenanceRequest) => {
        if (r.status !== 'completed') return false;
        const requestDate = new Date(r.requested_at);
        return requestDate >= monthStart && requestDate <= monthEnd;
      }).length,
    };
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    return requests.filter((request: MaintenanceRequest) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        request.title?.toLowerCase().includes(searchLower) ||
        request.description?.toLowerCase().includes(searchLower) ||
        request.request_number?.toLowerCase().includes(searchLower) ||
        request.equipment_name?.toLowerCase().includes(searchLower);
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [requests, searchTerm, statusFilter, priorityFilter]);

  const handleNewRequest = () => {
    setEquipmentSelectOpen(true);
  };

  const handleEquipmentSelect = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setEquipmentSelectOpen(false);
    setCreateDialogOpen(true);
  };

  if (shopLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Maintenance Requests</h1>
          <p className="text-muted-foreground">
            Track and manage equipment maintenance requests
          </p>
        </div>
        <Button onClick={handleNewRequest}>
          <Plus className="h-4 w-4 mr-2" />
          New Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Pending maintenance requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Wrench className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
            <p className="text-xs text-muted-foreground">
              Currently being worked on
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <AlertCircle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>All Requests</CardTitle>
          <CardDescription>
            {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No maintenance requests found</p>
              <p className="text-sm">
                {requests?.length === 0 
                  ? "Create your first maintenance request to get started"
                  : "Try adjusting your filters"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((request: MaintenanceRequest) => {
                const attachments = request.attachments || [];
                const hasImages = attachments.some((att: any) => 
                  att?.type?.startsWith('image/') || att?.file_type?.startsWith('image/')
                );
                const hasVideos = attachments.some((att: any) => 
                  att?.type?.startsWith('video/') || att?.file_type?.startsWith('video/')
                );
                const partsCount = request.parts_requested?.length || 0;

                return (
                  <Card key={request.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{request.title}</h3>
                          <Badge className={priorityColors[request.priority] || priorityColors.medium}>
                            {request.priority}
                          </Badge>
                          <Badge className={statusColors[request.status] || statusColors.pending}>
                            {request.status?.replace('_', ' ')}
                          </Badge>
                          {request.request_type && (
                            <Badge variant="outline" className="capitalize">
                              {request.request_type.replace('_', ' ')}
                            </Badge>
                          )}
                        </div>
                        {/* Equipment Name */}
                        <div className="flex items-center gap-1 text-sm text-primary font-medium">
                          <Wrench className="h-3.5 w-3.5" />
                          {request.equipment_name}
                        </div>
                        {request.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{request.description}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Info Row */}
                    <div className="flex items-center gap-4 text-xs border-t pt-3 pb-2 flex-wrap">
                      <span className="font-mono text-muted-foreground">#{request.request_number}</span>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(request.requested_at), 'MMM d, yyyy')}
                      </div>
                      {request.requested_by_name && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <User className="h-3 w-3" />
                          {request.requested_by_name}
                        </div>
                      )}
                      {request.estimated_cost && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          <span>${request.estimated_cost}</span>
                        </div>
                      )}
                      {request.estimated_hours && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{request.estimated_hours}h</span>
                        </div>
                      )}
                      {partsCount > 0 && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>{partsCount} part{partsCount !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {(hasImages || hasVideos) && (
                        <div className="flex items-center gap-2 ml-auto">
                          {hasImages && <Image className="h-4 w-4 text-primary" />}
                          {hasVideos && <Video className="h-4 w-4 text-primary" />}
                        </div>
                      )}
                    </div>

                    {request.scheduled_date && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 pb-2">
                        <Calendar className="h-3 w-3" />
                        <span>Scheduled: {format(new Date(request.scheduled_date), 'MMM d, yyyy')}</span>
                      </div>
                    )}

                    {request.notes && (
                      <div className="mt-3 text-sm border-t pt-3">
                        <span className="font-medium">Notes: </span>
                        <span className="text-muted-foreground">{request.notes}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="mt-3 pt-3 border-t flex gap-2 flex-wrap">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedRequest(request);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {request.status === 'pending' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => {
                            setSelectedRequest(request);
                            setConvertDialogOpen(true);
                          }}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Convert to Work Order
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Equipment Selection Dialog */}
      <Dialog open={equipmentSelectOpen} onOpenChange={setEquipmentSelectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Equipment</DialogTitle>
            <DialogDescription>
              Choose the equipment for the maintenance request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {equipmentList?.map((equipment: Equipment) => (
              <Button
                key={equipment.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => handleEquipmentSelect(equipment)}
              >
                <Wrench className="h-4 w-4 mr-2" />
                {equipment.name}
              </Button>
            ))}
            {(!equipmentList || equipmentList.length === 0) && (
              <p className="text-center text-muted-foreground py-4">
                No equipment found. Add equipment first.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      {selectedEquipment && (
        <CreateMaintenanceRequestDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
          onSuccess={() => {
            refetch();
            setSelectedEquipment(null);
          }}
        />
      )}

      {/* View & Convert Dialogs */}
      {selectedRequest && (
        <>
          <ConvertToWorkOrderDialog
            open={convertDialogOpen}
            onOpenChange={setConvertDialogOpen}
            request={selectedRequest}
            onSuccess={refetch}
          />
          
          <ViewMaintenanceRequestDialog
            open={viewDialogOpen}
            onOpenChange={setViewDialogOpen}
            request={selectedRequest}
            onConvert={() => {
              setViewDialogOpen(false);
              setConvertDialogOpen(true);
            }}
            onRefetch={refetch}
          />
        </>
      )}
    </div>
  );
}
