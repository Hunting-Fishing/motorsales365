import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Engine } from '@/types/engine';
import { Plus, Search, Edit, Trash2, Fuel, X } from 'lucide-react';
import { toast } from 'sonner';
import { AddEngineDialog } from './AddEngineDialog';
import { useEquipmentFilterOptions, formatEquipmentType } from '@/hooks/useEquipmentFilterOptions';
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

export function EnginesList() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [engineTypeFilter, setEngineTypeFilter] = useState<string>('all');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEngine, setEditingEngine] = useState<Engine | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [engineToDelete, setEngineToDelete] = useState<Engine | null>(null);

  const { engineTypes, fuelTypes } = useEquipmentFilterOptions();

  const hasActiveFilters = engineTypeFilter !== 'all' || fuelTypeFilter !== 'all' || searchTerm !== '';

  useEffect(() => {
    fetchEngines();
  }, []);

  const fetchEngines = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('engines')
        .select('*')
        .order('manufacturer', { ascending: true });

      if (error) throw error;
      setEngines(data || []);
    } catch (error) {
      console.error('Error fetching engines:', error);
      toast.error('Failed to load engines');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!engineToDelete) return;

    try {
      const { error } = await supabase
        .from('engines')
        .delete()
        .eq('id', engineToDelete.id);

      if (error) throw error;

      toast.success('Engine deleted successfully');
      fetchEngines();
    } catch (error) {
      console.error('Error deleting engine:', error);
      toast.error('Failed to delete engine');
    } finally {
      setDeleteDialogOpen(false);
      setEngineToDelete(null);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setEngineTypeFilter('all');
    setFuelTypeFilter('all');
  };

  const filteredEngines = engines.filter(engine => {
    const matchesSearch = 
      engine.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      engine.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      engine.engine_type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEngineType = engineTypeFilter === 'all' || engine.engine_type === engineTypeFilter;
    const matchesFuelType = fuelTypeFilter === 'all' || engine.fuel_type === fuelTypeFilter;
    return matchesSearch && matchesEngineType && matchesFuelType;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-1/3"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search engines by manufacturer, model, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => {
            setEditingEngine(null);
            setDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Engine
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="grid grid-cols-2 sm:flex gap-3 flex-1">
            <Select value={engineTypeFilter} onValueChange={setEngineTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Engine Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Engine Types</SelectItem>
                {engineTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatEquipmentType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Fuel Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fuel Types</SelectItem>
                {fuelTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatEquipmentType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {filteredEngines.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Fuel className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Engines Found</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters ? 'No engines match your filters.' : 'Start building your engine database.'}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Engine
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEngines.map((engine) => (
            <Card key={engine.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{engine.manufacturer}</CardTitle>
                    <p className="text-sm text-muted-foreground">{engine.model}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingEngine(engine);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEngineToDelete(engine);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {engine.engine_type && (
                  <div className="flex gap-2">
                    <Badge variant="secondary">{engine.engine_type}</Badge>
                    {engine.fuel_type && (
                      <Badge variant="outline">{engine.fuel_type}</Badge>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {engine.horsepower && (
                    <div>
                      <span className="text-muted-foreground">HP:</span>{' '}
                      <span className="font-medium">{engine.horsepower}</span>
                    </div>
                  )}
                  {engine.cylinders && (
                    <div>
                      <span className="text-muted-foreground">Cylinders:</span>{' '}
                      <span className="font-medium">{engine.cylinders}</span>
                    </div>
                  )}
                  {engine.displacement && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Displacement:</span>{' '}
                      <span className="font-medium">{engine.displacement}</span>
                    </div>
                  )}
                </div>

                {engine.common_applications && engine.common_applications.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Common Applications:</p>
                    <div className="flex flex-wrap gap-1">
                      {engine.common_applications.slice(0, 3).map((app, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {app}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddEngineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        engine={editingEngine}
        onSuccess={() => {
          fetchEngines();
          setDialogOpen(false);
          setEditingEngine(null);
        }}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Engine</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {engineToDelete?.manufacturer} {engineToDelete?.model}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
