import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Truck, ArrowLeft, Pencil, Info, ChevronDown, ChevronRight, Droplets, Fuel, Zap } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFuelDeliveryTrucks, useCreateFuelDeliveryTruck, FuelDeliveryTruck, TruckCompartmentData } from '@/hooks/useFuelDelivery';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useShopId } from '@/hooks/useShopId';
import { useModuleDisplayInfo } from '@/hooks/useModuleDisplayInfo';
import { TruckEditDialog } from '@/components/fuel-delivery/TruckEditDialog';
import { AddFuelDialog } from '@/components/fuel-delivery/AddFuelDialog';
import { QuickFillDialog } from '@/components/fuel-delivery/QuickFillDialog';
import { useFuelUnits } from '@/hooks/fuel-delivery/useFuelUnits';

export default function FuelDeliveryTrucks() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTruck, setEditingTruck] = useState<FuelDeliveryTruck | null>(null);
  const [fuelDialogTruck, setFuelDialogTruck] = useState<FuelDeliveryTruck | null>(null);
  const [fuelDialogCompartmentId, setFuelDialogCompartmentId] = useState<string | undefined>(undefined);
  const [quickFillTruck, setQuickFillTruck] = useState<FuelDeliveryTruck | null>(null);
  const [expandedTrucks, setExpandedTrucks] = useState<Set<string>>(new Set());
  const { data: trucks, isLoading } = useFuelDeliveryTrucks();
  const createTruck = useCreateFuelDeliveryTruck();
  const { shopId } = useShopId();
  const { data: moduleInfo } = useModuleDisplayInfo(shopId, 'fuel_delivery');
  const { formatVolume, getVolumeLabel, convertFromGallons } = useFuelUnits();

  const toggleExpanded = (truckId: string) => {
    setExpandedTrucks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(truckId)) {
        newSet.delete(truckId);
      } else {
        newSet.add(truckId);
      }
      return newSet;
    });
  };

  const [formData, setFormData] = useState({
    truck_number: '',
    license_plate: '',
    vin: '',
    make: '',
    model: '',
    year: '',
    tank_capacity_gallons: '',
    compartments: '1',
    meter_number: '',
    last_calibration_date: '',
    next_calibration_due: '',
    insurance_expiry: '',
    registration_expiry: '',
    dot_inspection_due: '',
    status: 'available',
    notes: ''
  });

  const filteredTrucks = trucks?.filter(truck =>
    truck.truck_number?.toLowerCase().includes(search.toLowerCase()) ||
    truck.license_plate?.toLowerCase().includes(search.toLowerCase()) ||
    truck.make?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTruck.mutateAsync({
      ...formData,
      year: parseInt(formData.year) || undefined,
      tank_capacity_gallons: parseFloat(formData.tank_capacity_gallons) || undefined,
      compartments: parseInt(formData.compartments) || 1,
      last_calibration_date: formData.last_calibration_date || undefined,
      next_calibration_due: formData.next_calibration_due || undefined,
      insurance_expiry: formData.insurance_expiry || undefined,
      registration_expiry: formData.registration_expiry || undefined,
      dot_inspection_due: formData.dot_inspection_due || undefined
    });
    setIsDialogOpen(false);
    setFormData({
      truck_number: '',
      license_plate: '',
      vin: '',
      make: '',
      model: '',
      year: '',
      tank_capacity_gallons: '',
      compartments: '1',
      meter_number: '',
      last_calibration_date: '',
      next_calibration_due: '',
      insurance_expiry: '',
      registration_expiry: '',
      dot_inspection_due: '',
      status: 'available',
      notes: ''
    });
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'available': return <Badge className="bg-green-500">Available</Badge>;
      case 'in_use': return <Badge className="bg-blue-500">In Use</Badge>;
      case 'maintenance': return <Badge className="bg-amber-500">Maintenance</Badge>;
      case 'out_of_service': return <Badge variant="destructive">Out of Service</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/fuel-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Truck className="h-8 w-8 text-blue-600" />
              {moduleInfo?.displayName || 'Fuel Delivery'} Trucks
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage trucks and tankers
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Truck
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Truck</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Truck Number *</Label>
                    <Input
                      value={formData.truck_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, truck_number: e.target.value }))}
                      placeholder="TRK-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>License Plate</Label>
                    <Input
                      value={formData.license_plate}
                      onChange={(e) => setFormData(prev => ({ ...prev, license_plate: e.target.value }))}
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>VIN</Label>
                    <Input
                      value={formData.vin}
                      onChange={(e) => setFormData(prev => ({ ...prev, vin: e.target.value }))}
                      placeholder="1HGCM82633A123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Make</Label>
                    <Input
                      value={formData.make}
                      onChange={(e) => setFormData(prev => ({ ...prev, make: e.target.value }))}
                      placeholder="Peterbilt"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model</Label>
                    <Input
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                      placeholder="579"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      type="number"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                      placeholder="2023"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tank Capacity ({getVolumeLabel()})</Label>
                    <Input
                      type="number"
                      value={formData.tank_capacity_gallons}
                      onChange={(e) => setFormData(prev => ({ ...prev, tank_capacity_gallons: e.target.value }))}
                      placeholder="3000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Compartments</Label>
                    <Input
                      type="number"
                      value={formData.compartments}
                      onChange={(e) => setFormData(prev => ({ ...prev, compartments: e.target.value }))}
                      placeholder="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Meter Number</Label>
                    <Input
                      value={formData.meter_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, meter_number: e.target.value }))}
                      placeholder="MTR-12345"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="in_use">In Use</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="out_of_service">Out of Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Insurance Expiry</Label>
                    <Input
                      type="date"
                      value={formData.insurance_expiry}
                      onChange={(e) => setFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DOT Inspection Due</Label>
                    <Input
                      type="date"
                      value={formData.dot_inspection_due}
                      onChange={(e) => setFormData(prev => ({ ...prev, dot_inspection_due: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTruck.isPending}>
                    {createTruck.isPending ? 'Creating...' : 'Add Truck'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trucks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trucks Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTrucks && filteredTrucks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Truck #</TableHead>
                  <TableHead>Make/Model</TableHead>
                  <TableHead>License Plate</TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Capacity
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium mb-1">Total Tank Capacity</p>
                            <p className="text-xs text-muted-foreground">
                              Sum of all compartment capacities configured for this truck. 
                              Click the arrow to see individual tank breakdown.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-1">
                      Current Load
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="font-medium mb-1">Current Fuel Load</p>
                            <p className="text-xs text-muted-foreground">
                              Sum of current fuel levels across all compartments. 
                              Click the arrow to see individual tank levels.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>DOT Due</TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrucks.map((truck) => {
                  const hasMultipleCompartments = (truck.compartment_data?.length || 0) > 1;
                  const isExpanded = expandedTrucks.has(truck.id);
                  
                  return (
                    <React.Fragment key={truck.id}>
                      <TableRow className="hover:bg-muted/50">
                        <TableCell className="w-10">
                          {hasMultipleCompartments ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => toggleExpanded(truck.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          ) : null}
                        </TableCell>
                        <TableCell className="font-medium">{truck.truck_number}</TableCell>
                        <TableCell>{truck.make} {truck.model} {truck.year}</TableCell>
                        <TableCell>{truck.license_plate || '-'}</TableCell>
                        <TableCell>
                          {truck.tank_capacity_gallons ? formatVolume(truck.tank_capacity_gallons, 0) : '-'}
                          {hasMultipleCompartments && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({truck.compartment_data?.length} tanks)
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{formatVolume(truck.current_fuel_load || 0, 0)}</TableCell>
                        <TableCell>{getStatusBadge(truck.status)}</TableCell>
                        <TableCell>
                          {truck.dot_inspection_due ? format(new Date(truck.dot_inspection_due), 'MMM d, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => setQuickFillTruck(truck)}
                                  >
                                    <Zap className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Quick Fill</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      setFuelDialogTruck(truck);
                                      setFuelDialogCompartmentId(undefined);
                                    }}
                                  >
                                    <Fuel className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Add Fuel (Detailed)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingTruck(truck)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expanded compartment details */}
                      {hasMultipleCompartments && isExpanded && (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={9} className="p-0">
                            <div className="px-6 py-3 border-l-4 border-primary/30">
                              <div className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Droplets className="h-4 w-4 text-blue-500" />
                                Tank/Compartment Breakdown
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {truck.compartment_data?.map((comp) => {
                                  const fillPercent = comp.capacity_gallons > 0 
                                    ? Math.round((comp.current_level_gallons / comp.capacity_gallons) * 100)
                                    : 0;
                                  return (
                                    <div 
                                      key={comp.id} 
                                      className="bg-background rounded-lg border p-3"
                                    >
                                      <div className="flex justify-between items-start mb-2">
                                        <div>
                                          <p className="font-medium text-sm">
                                            {comp.compartment_name || `Tank ${comp.compartment_number}`}
                                          </p>
                                          {comp.product && (
                                            <p className="text-xs text-muted-foreground">
                                              {comp.product.product_name}
                                            </p>
                                          )}
                                        </div>
                                        <Badge variant={fillPercent < 20 ? 'destructive' : fillPercent < 50 ? 'secondary' : 'default'} className="text-xs">
                                          {fillPercent}%
                                        </Badge>
                                      </div>
                                      <div className="space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Current:</span>
                                          <span className="font-medium">{formatVolume(comp.current_level_gallons, 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-muted-foreground">Capacity:</span>
                                          <span>{formatVolume(comp.capacity_gallons, 0)}</span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-2">
                                          <div 
                                            className={`h-full transition-all ${
                                              fillPercent < 20 ? 'bg-red-500' : 
                                              fillPercent < 50 ? 'bg-amber-500' : 'bg-green-500'
                                            }`}
                                            style={{ width: `${fillPercent}%` }}
                                          />
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full mt-2 text-xs h-7"
                                          onClick={() => {
                                            setFuelDialogTruck(truck);
                                            setFuelDialogCompartmentId(comp.id);
                                          }}
                                        >
                                          <Fuel className="h-3 w-3 mr-1" />
                                          Fill Tank
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No trucks found</p>
              <Button variant="link" onClick={() => setIsDialogOpen(true)}>
                Add your first truck
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <TruckEditDialog
        truck={editingTruck}
        open={!!editingTruck}
        onOpenChange={(open) => !open && setEditingTruck(null)}
      />

      {/* Add Fuel Dialog */}
      <AddFuelDialog
        open={!!fuelDialogTruck}
        onOpenChange={(open) => {
          if (!open) {
            setFuelDialogTruck(null);
            setFuelDialogCompartmentId(undefined);
          }
        }}
        truck={fuelDialogTruck}
        preselectedCompartmentId={fuelDialogCompartmentId}
        shopId={shopId || ''}
      />

      {/* Quick Fill Dialog */}
      <QuickFillDialog
        open={!!quickFillTruck}
        onOpenChange={(open) => !open && setQuickFillTruck(null)}
        truck={quickFillTruck}
        shopId={shopId || ''}
      />
    </div>
  );
}
