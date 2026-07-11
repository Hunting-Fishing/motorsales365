import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, ArrowLeft, Truck, Droplets, Shield, AlertTriangle, CheckCircle2, Clock, MoreHorizontal, Pencil, Eye, Gauge } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useShopId } from '@/hooks/useShopId';
import { useWaterDeliveryTrucks, getNextDueDate, getExpirationStatus, WaterDeliveryTruck } from '@/hooks/water-delivery/useWaterDeliveryTrucks';
import { useWaterUnits } from '@/hooks/water-delivery/useWaterUnits';
import { format } from 'date-fns';
import { AddWaterTruckDialog } from '@/components/water-delivery/AddWaterTruckDialog';
import { WaterTruckEditDialog } from '@/components/water-delivery/WaterTruckEditDialog';

export default function WaterDeliveryTrucks() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [certFilter, setCertFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTruck, setEditingTruck] = useState<WaterDeliveryTruck | null>(null);
  
  const { shopId } = useShopId();
  const { data: trucks, isLoading } = useWaterDeliveryTrucks(shopId);
  const { formatVolume, getVolumeLabel, convertFromGallons } = useWaterUnits();

  // Calculate stats
  const stats = useMemo(() => {
    if (!trucks) return { total: 0, totalCapacity: 0, currentLoad: 0, available: 0, needsAttention: 0 };
    
    let totalCapacity = 0;
    let currentLoad = 0;
    let available = 0;
    let needsAttention = 0;

    trucks.forEach(truck => {
      totalCapacity += truck.tank_capacity_gallons || 0;
      currentLoad += truck.current_water_load || 0;
      if (truck.status === 'available') available++;
      
      const nextDue = getNextDueDate(truck);
      if (nextDue.status === 'expired' || nextDue.status === 'expiring') {
        needsAttention++;
      }
    });

    return { total: trucks.length, totalCapacity, currentLoad, available, needsAttention };
  }, [trucks]);

  // Filter trucks
  const filteredTrucks = useMemo(() => {
    if (!trucks) return [];
    
    return trucks.filter(truck => {
      // Search filter
      const matchesSearch = 
        truck.truck_number?.toLowerCase().includes(search.toLowerCase()) ||
        truck.license_plate?.toLowerCase().includes(search.toLowerCase()) ||
        truck.make?.toLowerCase().includes(search.toLowerCase()) ||
        truck.model?.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || truck.status === statusFilter;
      
      // Certification filter
      let matchesCert = true;
      if (certFilter === 'potable') matchesCert = truck.is_potable_certified === true;
      if (certFilter === 'non-potable') matchesCert = truck.is_potable_certified !== true;
      if (certFilter === 'needs-attention') {
        const nextDue = getNextDueDate(truck);
        matchesCert = nextDue.status === 'expired' || nextDue.status === 'expiring';
      }

      return matchesSearch && matchesStatus && matchesCert;
    });
  }, [trucks, search, statusFilter, certFilter]);

  const getStatusBadge = (status: string | null | undefined) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      available: { variant: 'default', label: 'Available' },
      in_use: { variant: 'secondary', label: 'In Use' },
      maintenance: { variant: 'outline', label: 'Maintenance' },
      out_of_service: { variant: 'destructive', label: 'Out of Service' },
    };
    const config = statusMap[status || 'available'] || statusMap.available;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getMaterialLabel = (material: string | null | undefined) => {
    const materialMap: Record<string, string> = {
      stainless_steel: 'Stainless Steel',
      aluminum: 'Aluminum',
      fiberglass: 'Fiberglass',
      food_grade_plastic: 'Food-Grade Plastic',
      carbon_steel: 'Carbon Steel',
      poly: 'Polyethylene',
    };
    return materialMap[material || ''] || material || 'Steel';
  };

  const getComplianceIcon = (status: 'expired' | 'expiring' | 'valid' | 'unknown') => {
    switch (status) {
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'expiring':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'valid':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default:
        return <div className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/water-delivery')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Truck className="h-8 w-8 text-cyan-600" />
              Water Tanker Trucks
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage water delivery fleet, compliance, and tank levels
            </p>
          </div>
          <Button className="bg-cyan-600 hover:bg-cyan-700" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Truck
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                <Truck className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Trucks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Droplets className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatVolume(stats.totalCapacity, 0).split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">Fleet Capacity ({getVolumeLabel()})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Gauge className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatVolume(stats.currentLoad, 0).split(' ')[0]}</p>
                <p className="text-xs text-muted-foreground">Current Load</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.needsAttention > 0 ? 'border-amber-500' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stats.needsAttention > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.needsAttention > 0 ? 'text-amber-600' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsAttention}</p>
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search trucks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
            <Select value={certFilter} onValueChange={setCertFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Certification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Trucks</SelectItem>
                <SelectItem value="potable">Potable Certified</SelectItem>
                <SelectItem value="non-potable">Non-Potable</SelectItem>
                <SelectItem value="needs-attention">Needs Attention</SelectItem>
              </SelectContent>
            </Select>
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
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Truck #</TableHead>
                    <TableHead>Make/Model</TableHead>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Tank Level</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Certification</TableHead>
                    <TableHead>Next Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrucks.map((truck) => {
                    const capacity = truck.tank_capacity_gallons || 0;
                    const currentLoad = truck.current_water_load || 0;
                    const fillPercent = capacity > 0 ? (currentLoad / capacity) * 100 : 0;
                    const nextDue = getNextDueDate(truck);

                    return (
                      <TableRow 
                        key={truck.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setEditingTruck(truck)}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-cyan-600" />
                            {truck.truck_number}
                          </div>
                        </TableCell>
                        <TableCell>
                          {truck.make} {truck.model}
                          {truck.year && <span className="text-muted-foreground ml-1">({truck.year})</span>}
                        </TableCell>
                        <TableCell>{truck.license_plate || '-'}</TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[120px]">
                            <div className="flex justify-between text-xs">
                              <span>{formatVolume(currentLoad, 0)}</span>
                              <span className="text-muted-foreground">{fillPercent.toFixed(0)}%</span>
                            </div>
                            <Progress value={fillPercent} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getMaterialLabel(truck.tank_material)}</Badge>
                        </TableCell>
                        <TableCell>
                          {truck.is_potable_certified ? (
                            <Badge className="bg-green-500 hover:bg-green-600">
                              <Droplets className="h-3 w-3 mr-1" />
                              Potable
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Non-Potable</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {nextDue.date ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  {getComplianceIcon(nextDue.status)}
                                  <div className="text-sm">
                                    <p className={`font-medium ${
                                      nextDue.status === 'expired' ? 'text-destructive' : 
                                      nextDue.status === 'expiring' ? 'text-amber-600' : ''
                                    }`}>
                                      {format(new Date(nextDue.date), 'MMM d, yyyy')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{nextDue.label}</p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{nextDue.label} {nextDue.status === 'expired' ? 'expired' : 'due'}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(truck.status)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                setEditingTruck(truck);
                              }}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                // Future: navigate to detail page
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TooltipProvider>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No trucks found</p>
              <p className="text-sm mb-4">Add your first water tanker truck to get started</p>
              <Button onClick={() => setShowAddDialog(true)} className="bg-cyan-600 hover:bg-cyan-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Truck
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddWaterTruckDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      <WaterTruckEditDialog truck={editingTruck} open={!!editingTruck} onOpenChange={(open) => !open && setEditingTruck(null)} />
    </div>
  );
}
