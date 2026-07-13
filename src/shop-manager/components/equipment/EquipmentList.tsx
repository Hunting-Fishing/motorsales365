import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Search, AlertTriangle, CheckCircle, Clock, Wrench, Loader2, Trash2, X, ImageIcon } from 'lucide-react';
import { Equipment } from '@/types/equipment';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useEquipmentFilterOptions, formatEquipmentType } from '@/hooks/useEquipmentFilterOptions';

const getEquipmentIcon = (category: string) => {
  // Return appropriate icon based on category
  return <Wrench className="h-6 w-6 text-muted-foreground" />;
};

interface EquipmentListProps {
  equipment: Equipment[];
  loading: boolean;
  onUpdate?: () => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'operational': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'maintenance': return <Wrench className="h-4 w-4 text-yellow-500" />;
    case 'out_of_service': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'down': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'operational': return 'default';
    case 'maintenance': return 'secondary';
    case 'out_of_service':
    case 'down': 
      return 'destructive';
    default: return 'outline';
  }
};

export function EquipmentList({ equipment, loading, onUpdate }: EquipmentListProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { equipmentTypes, locations, isLoading: filtersLoading } = useEquipmentFilterOptions();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || locationFilter !== 'all' || searchTerm !== '';

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesType = typeFilter === 'all' || item.category === typeFilter;
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('equipment_assets').delete().eq('id', id);
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Equipment deleted successfully',
      });
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
    setLocationFilter('all');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>Shop Equipment</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Equipment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {equipmentTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatEquipmentType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="out_of_service">Out of Service</SelectItem>
                <SelectItem value="down">Down</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredEquipment.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">
            <p>{hasActiveFilters ? 'No equipment matches your filters.' : 'No equipment found. Click "Add Equipment" to get started.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEquipment.map((item) => (
              <Card key={item.id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {/* Profile Image Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0 border border-border">
                      {item.profile_image_url ? (
                        <img 
                          src={item.profile_image_url} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {getEquipmentIcon(item.category)}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(item.status)}
                      <div>
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.manufacturer} {item.model} • {formatEquipmentType(item.category || 'other')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-medium">SN: {item.serial_number}</p>
                      <p className="text-xs text-muted-foreground">Location: {item.location}</p>
                    </div>
                    <Badge variant={getStatusVariant(item.status)}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/equipment/${item.id}`)}
                    >
                      View Details
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Equipment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{item.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(item.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
