import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ShieldCheck, AlertTriangle, Clock, Search, X } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { formatEquipmentType } from '@/hooks/useEquipmentFilterOptions';

interface SafetyEquipmentItem {
  id: string;
  name: string;
  equipment_type: string;
  location: string;
  status: string;
  serial_number?: string;
  specifications?: {
    inspection_date?: string;
    expiry_date?: string;
    quantity?: number;
  };
  notes?: string;
}

interface SafetyEquipmentListProps {
  refreshTrigger?: number;
  parentEquipmentId?: string;
}

type StatusLevel = 'good' | 'warning' | 'urgent' | 'overdue';

const SAFETY_TYPES = [
  'fire_extinguisher', 'life_raft', 'life_ring', 'epirb',
  'survival_suit', 'flare', 'first_aid_kit', 'safety_harness',
  'life_jacket', 'immersion_suit'
];

export function SafetyEquipmentList({ refreshTrigger, parentEquipmentId }: SafetyEquipmentListProps) {
  const [items, setItems] = useState<SafetyEquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);

  const hasActiveFilters = searchTerm !== '' || typeFilter !== 'all' || statusFilter !== 'all' || locationFilter !== 'all';

  const getStatusLevel = (expiryDate?: string): StatusLevel => {
    if (!expiryDate) return 'good';
    
    const today = new Date();
    const expiry = parseISO(expiryDate);
    const daysUntilExpiry = differenceInDays(expiry, today);
    
    if (daysUntilExpiry < 0) return 'overdue';
    if (daysUntilExpiry <= 7) return 'urgent';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'good';
  };

  const getStatusConfig = (level: StatusLevel) => {
    switch (level) {
      case 'overdue':
        return {
          color: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-950 dark:border-red-700 dark:text-red-300',
          badge: 'bg-red-500 text-white',
          icon: AlertTriangle,
          label: 'Overdue',
        };
      case 'urgent':
        return {
          color: 'bg-orange-50 border-orange-500 text-orange-700 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-300',
          badge: 'bg-orange-500 text-white',
          icon: AlertTriangle,
          label: 'Urgent',
        };
      case 'warning':
        return {
          color: 'bg-yellow-50 border-yellow-500 text-yellow-700 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-300',
          badge: 'bg-yellow-500 text-white',
          icon: Clock,
          label: 'Due Soon',
        };
      case 'good':
      default:
        return {
          color: 'bg-green-50 border-green-500 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300',
          badge: 'bg-green-500 text-white',
          icon: ShieldCheck,
          label: 'Current',
        };
    }
  };

  useEffect(() => {
    loadSafetyEquipment();
  }, [refreshTrigger]);

  const loadSafetyEquipment = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      const shop_id = profileData?.shop_id || user.id;

      let query = supabase
        .from('equipment_assets')
        .select('*')
        .eq('shop_id', shop_id)
        .in('equipment_type', SAFETY_TYPES as any);
      
      if (parentEquipmentId) {
        query = query.eq('parent_equipment_id', parentEquipmentId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const mappedItems = (data || []).map(item => ({
        ...item,
        equipment_type: item.equipment_type,
        specifications: item.specifications as SafetyEquipmentItem['specifications']
      }));
      
      setItems(mappedItems);

      // Extract unique locations and types for filters
      const uniqueLocations = [...new Set(mappedItems.map(i => i.location).filter(Boolean))];
      const uniqueTypes = [...new Set(mappedItems.map(i => i.equipment_type).filter(Boolean))];
      setAvailableLocations(uniqueLocations.sort());
      setAvailableTypes(uniqueTypes.sort());
    } catch (error) {
      console.error('Error loading safety equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setStatusFilter('all');
    setLocationFilter('all');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || item.equipment_type === typeFilter;
    const matchesLocation = locationFilter === 'all' || item.location === locationFilter;
    
    const itemStatus = getStatusLevel(item.specifications?.expiry_date);
    const matchesStatus = statusFilter === 'all' || itemStatus === statusFilter;
    
    return matchesSearch && matchesType && matchesLocation && matchesStatus;
  });

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading safety equipment...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search safety equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 flex-1 w-full">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Equipment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map(type => (
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
                <SelectItem value="good">Current</SelectItem>
                <SelectItem value="warning">Due Soon</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {availableLocations.map(location => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground whitespace-nowrap">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {hasActiveFilters ? 'No Matches Found' : 'No Safety Equipment'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results.'
                  : 'Click "Add Safety Equipment" to start tracking safety items'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const expiryDate = item.specifications?.expiry_date;
            const statusLevel = getStatusLevel(expiryDate);
            const statusConfig = getStatusConfig(statusLevel);
            const StatusIcon = statusConfig.icon;
            const daysUntilExpiry = expiryDate 
              ? differenceInDays(parseISO(expiryDate), new Date())
              : null;

            return (
              <Card key={item.id} className={`border-l-4 ${statusConfig.color.split(' ')[1]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon className={`h-5 w-5 ${statusConfig.color.split(' ')[2]}`} />
                        <h4 className="font-semibold text-foreground">{item.name}</h4>
                        <Badge className={statusConfig.badge}>
                          {statusConfig.label}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Type:</span>
                          <span className="ml-2 text-foreground font-medium">
                            {formatEquipmentType(item.equipment_type)}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-muted-foreground">Location:</span>
                          <span className="ml-2 text-foreground">{item.location}</span>
                        </div>
                        
                        {item.serial_number && (
                          <div>
                            <span className="text-muted-foreground">Serial:</span>
                            <span className="ml-2 text-foreground">{item.serial_number}</span>
                          </div>
                        )}
                        
                        {item.specifications?.quantity && item.specifications.quantity > 1 && (
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <span className="ml-2 text-foreground">{item.specifications.quantity}</span>
                          </div>
                        )}
                        
                        {item.specifications?.inspection_date && (
                          <div>
                            <span className="text-muted-foreground">Last Inspection:</span>
                            <span className="ml-2 text-foreground">
                              {format(parseISO(item.specifications.inspection_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                        
                        {expiryDate && (
                          <div>
                            <span className="text-muted-foreground">Next Due:</span>
                            <span className={`ml-2 font-medium ${statusConfig.color.split(' ')[2]}`}>
                              {format(parseISO(expiryDate), 'MMM dd, yyyy')}
                              {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
                                <span className="text-xs ml-1">
                                  ({daysUntilExpiry} days)
                                </span>
                              )}
                              {daysUntilExpiry !== null && daysUntilExpiry < 0 && (
                                <span className="text-xs ml-1">
                                  (Overdue)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {item.notes && (
                        <div className="mt-2 pt-2 border-t">
                          <p className="text-xs text-muted-foreground">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
