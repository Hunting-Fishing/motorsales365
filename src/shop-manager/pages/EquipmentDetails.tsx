import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Settings, Calendar, AlertTriangle, CheckCircle, Wrench, ClipboardList, ShieldCheck, BookOpen, FileText, MapPin, Gauge, Hash, Truck, ListTodo, ShoppingCart, FolderOpen, RefreshCw, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { getEquipmentById, updateEquipmentStatus, type EquipmentDetails } from '@/services/equipment/equipmentService';
import { MaintenanceIntervals } from '@/components/equipment/MaintenanceIntervals';
import { EquipmentWorkRequests } from '@/components/equipment-details/EquipmentWorkRequests';
import { EquipmentConfigDialog } from '@/components/equipment/EquipmentConfigDialog';
import { SafetyEquipmentList } from '@/components/equipment/SafetyEquipmentList';
import { EquipmentManuals } from '@/components/equipment/EquipmentManuals';
import { EquipmentTasks } from '@/components/equipment-details/EquipmentTasks';
import { EquipmentSupplyOrders } from '@/components/equipment-details/EquipmentSupplyOrders';
import { EquipmentDocuments } from '@/components/equipment-details/EquipmentDocuments';
import { RecurringTasksPanel } from '@/components/equipment-details/RecurringTasksPanel';
import { EquipmentHourHistory } from '@/components/equipment/EquipmentHourHistory';

// Helper to check if equipment is a vehicle type
const isVehicleType = (type?: string): boolean => {
  if (!type) return false;
  const vehicleTypes = ['fuel_truck', 'heavy_truck', 'semi_truck', 'fleet_vehicle', 'service_vehicle', 'forklift', 'excavator', 'trailer', 'boat', 'vessel'];
  return vehicleTypes.includes(type);
};

// Format equipment type for display
const formatEquipmentType = (type?: string): string => {
  if (!type) return 'Equipment';
  return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export default function EquipmentDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<EquipmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    if (id) {
      loadEquipmentDetails();
    }
  }, [id]);

  const loadEquipmentDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const data = await getEquipmentById(id);
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast.error('Failed to load equipment details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!id) return;
    
    const success = await updateEquipmentStatus(id, newStatus);
    if (success) {
      toast.success('Equipment status updated');
      loadEquipmentDetails();
    } else {
      toast.error('Failed to update equipment status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'maintenance': return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'down': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'repair': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="animate-pulse bg-muted h-8 w-64 rounded"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="bg-muted h-4 w-full rounded"></div>
                  <div className="bg-muted h-4 w-3/4 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!equipment) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">Equipment Not Found</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">The requested equipment could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const showVehicleInfo = isVehicleType(equipment.equipment_type);

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with Profile Image */}
      <div className="flex flex-col gap-4">
        {/* Top row: Back button, image, equipment info */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate('/equipment')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          {/* Profile Image */}
          {equipment.profile_image_url ? (
            <img 
              src={equipment.profile_image_url} 
              alt={equipment.name}
              className="h-14 w-14 md:h-16 md:w-16 rounded-lg object-cover border shrink-0"
            />
          ) : (
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-lg bg-muted flex items-center justify-center border shrink-0">
              <Truck className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold truncate">{equipment.name}</h1>
              {equipment.unit_number && (
                <Badge variant="outline" className="text-xs shrink-0">
                  Unit #{equipment.unit_number}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm truncate">
              {formatEquipmentType(equipment.equipment_type)}
              {equipment.manufacturer && ` • ${equipment.manufacturer}`}
              {equipment.model && ` ${equipment.model}`}
              {equipment.year && ` (${equipment.year})`}
            </p>
          </div>
        </div>
        
        {/* Second row: Status + Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={getStatusColor(equipment.currentStatus)}>
            {equipment.currentStatus}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configure
          </Button>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-1.5 sm:p-2 rounded-lg shrink-0 ${equipment.currentStatus === 'operational' ? 'bg-green-500/10' : equipment.currentStatus === 'maintenance' ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
                <CheckCircle className={`h-4 w-4 sm:h-5 sm:w-5 ${equipment.currentStatus === 'operational' ? 'text-green-600' : equipment.currentStatus === 'maintenance' ? 'text-yellow-600' : 'text-red-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Status</p>
                <p className="font-semibold capitalize text-sm sm:text-base truncate">{equipment.currentStatus}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-500/10 shrink-0">
                <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {equipment.current_hours ? 'Hours' : equipment.current_mileage ? 'Mileage' : 'Usage'}
                </p>
                <p className="font-semibold text-sm sm:text-base truncate">
                  {equipment.current_hours 
                    ? `${equipment.current_hours.toLocaleString()} hrs`
                    : equipment.current_mileage 
                      ? `${equipment.current_mileage.toLocaleString()} mi`
                      : 'N/A'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-purple-500/10 shrink-0">
                <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Location</p>
                <p className="font-semibold text-sm sm:text-base truncate">{equipment.location || 'Unknown'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-500/10 shrink-0">
                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Next Service</p>
                <p className="font-semibold text-sm sm:text-base truncate">
                  {equipment.next_service_date 
                    ? new Date(equipment.next_service_date).toLocaleDateString()
                    : 'Not scheduled'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Tabs */}
      <Tabs defaultValue="details" className="space-y-4">
        <div className="w-full overflow-x-auto pb-2">
          <TabsList className="inline-flex h-auto min-w-max gap-1 p-1">
            <TabsTrigger value="details" className="whitespace-nowrap">Details</TabsTrigger>
            <TabsTrigger value="documents" className="whitespace-nowrap gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="manuals" className="whitespace-nowrap gap-2">
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Manuals</span>
            </TabsTrigger>
            <TabsTrigger value="safety" className="whitespace-nowrap gap-2">
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Safety</span>
            </TabsTrigger>
            <TabsTrigger value="work-requests" className="whitespace-nowrap gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Work Requests</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="whitespace-nowrap gap-2">
              <ListTodo className="h-4 w-4" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="recurring" className="whitespace-nowrap gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Recurring</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="whitespace-nowrap gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
            </TabsTrigger>
            <TabsTrigger value="intervals" className="whitespace-nowrap gap-2">
              <Wrench className="h-4 w-4" />
              <span className="hidden sm:inline">Intervals</span>
            </TabsTrigger>
            <TabsTrigger value="hour-history" className="whitespace-nowrap gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Hour History</span>
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="whitespace-nowrap">History</TabsTrigger>
            <TabsTrigger value="specifications" className="whitespace-nowrap">Specs</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="details" className="space-y-4">
          {/* Equipment Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Equipment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Equipment Type</label>
                  <p className="mt-1 font-medium">{formatEquipmentType(equipment.equipment_type)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Unit Number</label>
                  <p className="mt-1 font-medium">{equipment.unit_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Asset Number</label>
                  <p className="mt-1 font-medium">{equipment.asset_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Manufacturer</label>
                  <p className="mt-1 font-medium">{equipment.manufacturer || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Model</label>
                  <p className="mt-1 font-medium">{equipment.model || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Year</label>
                  <p className="mt-1 font-medium">{equipment.year || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Serial Number</label>
                  <p className="mt-1 font-medium">{equipment.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Department</label>
                  <p className="mt-1 font-medium">{equipment.department || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Assigned To</label>
                  <p className="mt-1 font-medium">{equipment.assignedTo || 'Unassigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information Card - Only show for vehicle types */}
          {showVehicleInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Vehicle Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">VIN</label>
                    <p className="mt-1 font-medium font-mono text-sm">{equipment.vin_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Engine ID</label>
                    <p className="mt-1 font-medium">{equipment.engine_id || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">License Plate</label>
                    <p className="mt-1 font-medium">{equipment.plate_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Registration State</label>
                    <p className="mt-1 font-medium">{equipment.registration_state || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Registration Expiry</label>
                    <p className="mt-1 font-medium">
                      {equipment.registration_expiry 
                        ? new Date(equipment.registration_expiry).toLocaleDateString()
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Title Number</label>
                    <p className="mt-1 font-medium">{equipment.title_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Title Status</label>
                    <p className="mt-1 font-medium capitalize">{equipment.title_status || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage & Location Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Usage & Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="mt-1 font-medium">{equipment.location || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Hours</label>
                  <p className="mt-1 font-medium">
                    {equipment.current_hours ? `${equipment.current_hours.toLocaleString()} hrs` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Mileage</label>
                  <p className="mt-1 font-medium">
                    {equipment.current_mileage ? `${equipment.current_mileage.toLocaleString()} mi` : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={`mt-1 ${getStatusColor(equipment.currentStatus)}`}>
                    {equipment.currentStatus}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Service Date</label>
                  <p className="mt-1 font-medium">
                    {equipment.last_service_date 
                      ? new Date(equipment.last_service_date).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Next Service Date</label>
                  <p className="mt-1 font-medium">
                    {equipment.next_service_date 
                      ? new Date(equipment.next_service_date).toLocaleDateString()
                      : 'Not scheduled'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase & Value Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Purchase & Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Purchase Date</label>
                  <p className="mt-1 font-medium">
                    {equipment.purchase_date 
                      ? new Date(equipment.purchase_date).toLocaleDateString()
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Purchase Cost</label>
                  <p className="mt-1 font-medium">
                    {equipment.purchase_cost 
                      ? `$${equipment.purchase_cost.toLocaleString()}`
                      : 'N/A'
                    }
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Current Value</label>
                  <p className="mt-1 font-medium">
                    {equipment.current_value 
                      ? `$${equipment.current_value.toLocaleString()}`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>
              
              {equipment.notes && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 text-foreground">{equipment.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => handleStatusUpdate('operational')}
                  disabled={equipment.currentStatus === 'operational'}
                  variant="outline"
                  size="sm"
                  className="border-green-500/30 hover:bg-green-500/10"
                >
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Mark Operational
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate('maintenance')}
                  disabled={equipment.currentStatus === 'maintenance'}
                  variant="outline"
                  size="sm"
                  className="border-yellow-500/30 hover:bg-yellow-500/10"
                >
                  <Wrench className="h-4 w-4 mr-2 text-yellow-600" />
                  Mark for Maintenance
                </Button>
                <Button 
                  onClick={() => handleStatusUpdate('down')}
                  disabled={equipment.currentStatus === 'down'}
                  variant="outline"
                  size="sm"
                  className="border-red-500/30 hover:bg-red-500/10"
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-red-600" />
                  Mark Down
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Trailer Specifications Card */}
          {(equipment as any).specifications?.trailer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🚛 Trailer Specifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">GVWR (Gross Weight)</label>
                      <p className="mt-1 text-lg font-semibold">
                        {(equipment as any).specifications.trailer.gvwr 
                          ? `${(equipment as any).specifications.trailer.gvwr.toLocaleString()} lbs`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Front Axle Capacity</label>
                      <p className="mt-1 text-lg font-semibold">
                        {(equipment as any).specifications.trailer.front_axle_capacity 
                          ? `${(equipment as any).specifications.trailer.front_axle_capacity.toLocaleString()} lbs`
                          : 'N/A'
                        }
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Rear Axle Capacity</label>
                      <p className="mt-1 text-lg font-semibold">
                        {(equipment as any).specifications.trailer.rear_axle_capacity 
                          ? `${(equipment as any).specifications.trailer.rear_axle_capacity.toLocaleString()} lbs`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Manufacture Year</label>
                      <p className="mt-1 text-lg font-semibold">
                        {(equipment as any).specifications.trailer.manufacture_year || 'N/A'}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tire Size</label>
                        <p className="mt-1 font-medium">
                          {(equipment as any).specifications.trailer.tire_size || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Rim Size</label>
                        <p className="mt-1 font-medium">
                          {(equipment as any).specifications.trailer.rim_size || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tire PSI</label>
                        <p className="mt-1 font-medium">
                          {(equipment as any).specifications.trailer.tire_psi 
                            ? `${(equipment as any).specifications.trailer.tire_psi} PSI`
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Number of Axles</label>
                      <p className="mt-1 text-lg font-semibold">
                        {(equipment as any).specifications.trailer.num_axles 
                          ? `${(equipment as any).specifications.trailer.num_axles} Axle${(equipment as any).specifications.trailer.num_axles > 1 ? 's' : ''}`
                          : 'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="manuals" className="space-y-4">
          <EquipmentManuals equipmentId={id!} equipmentName={equipment.name} />
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          <SafetyEquipmentList parentEquipmentId={id} />
        </TabsContent>

        <TabsContent value="work-requests" className="space-y-4">
          <EquipmentWorkRequests 
            equipmentId={id!} 
            equipmentName={equipment.name}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <EquipmentDocuments 
            equipmentId={id!} 
            shopId={equipment.shop_id}
          />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <EquipmentTasks 
            equipmentId={id!} 
            shopId={equipment.shop_id}
          />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-4">
          <RecurringTasksPanel 
            equipmentId={id!} 
            shopId={equipment.shop_id}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <EquipmentSupplyOrders 
            equipmentId={id!} 
            shopId={equipment.shop_id}
          />
        </TabsContent>

        <TabsContent value="intervals" className="space-y-4">
          <MaintenanceIntervals equipmentId={id!} />
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance History</CardTitle>
            </CardHeader>
            <CardContent>
              {equipment.maintenanceRecords.length > 0 ? (
                <div className="space-y-4">
                  {equipment.maintenanceRecords.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{record.type}</h4>
                          <p className="text-sm text-muted-foreground">{record.description}</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">${record.cost.toLocaleString()}</p>
                          <p className="text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Technician: {record.technician}</span>
                        {record.nextMaintenanceDate && (
                          <span className="text-muted-foreground">
                            Next: {new Date(record.nextMaintenanceDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No maintenance records found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const specs = equipment.specifications || {};
                // Filter out nested objects/arrays - only show primitive values
                const simpleSpecs = Object.entries(specs).filter(([key, value]) => 
                  typeof value !== 'object' || value === null
                );
                const attachments = Array.isArray((specs as any)?.attachments) ? (specs as any).attachments : [];
                const items = Array.isArray((specs as any)?.items) ? (specs as any).items : [];
                const hasContent = simpleSpecs.length > 0 || attachments.length > 0 || items.length > 0;

                if (!hasContent) {
                  return (
                    <p className="text-center text-muted-foreground py-8">
                      No specifications available
                    </p>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Simple key-value specifications */}
                    {simpleSpecs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {simpleSpecs.map(([key, value]) => (
                          <div key={key}>
                            <label className="text-sm font-medium text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </label>
                            <p className="mt-1">{String(value)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Items specifications */}
                    {items.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Specification Items</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {items.map((item: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-3">
                              <p className="font-medium">{item.spec_name || item.item_name || 'Item'}</p>
                              {item.spec_type && <p className="text-sm text-muted-foreground">{item.spec_type}</p>}
                              {item.quantity && <p className="text-sm">Qty: {item.quantity} {item.unit || ''}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attachments section */}
                    {attachments.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-3">Media Attachments</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {attachments.map((att: any, idx: number) => (
                            <div key={idx} className="border rounded-lg p-2 text-center">
                              {att.type === 'image' ? (
                                <img 
                                  src={att.url} 
                                  alt={att.name || 'Attachment'} 
                                  className="w-full h-24 object-cover rounded mb-2"
                                />
                              ) : (
                                <div className="w-full h-24 bg-muted flex items-center justify-center rounded mb-2">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <p className="text-xs truncate">{att.name || 'File'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hour History Tab */}
        <TabsContent value="hour-history" className="space-y-4">
          <EquipmentHourHistory
            parentEquipmentId={id}
            title="Component Hour Reading History"
            showExport={true}
          />
        </TabsContent>
      </Tabs>

      <EquipmentConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        equipment={equipment}
        onSave={loadEquipmentDetails}
      />
    </div>
  );
}
