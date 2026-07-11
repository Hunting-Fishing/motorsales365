import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EquipmentGrid } from './EquipmentGrid';
import { EquipmentFilters } from './EquipmentFilters';
import { AddEquipmentDialog } from './AddEquipmentDialog';
import { useEquipment } from '@/hooks/useEquipment';
import { Plus, Search, Filter } from 'lucide-react';

export function EquipmentPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { equipment, isLoading, error, stats } = useEquipment();

  const filteredEquipment = equipment.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-error text-lg mb-4">Error loading equipment</p>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Equipment Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your shop equipment and maintenance schedules
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Equipment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Operational
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.operational}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Needs Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.needsMaintenance}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Out of Service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-error">{stats.outOfService}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search equipment by name, model, or manufacturer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {showFilters && <Badge variant="secondary" className="ml-2">On</Badge>}
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <EquipmentFilters 
              searchQuery={searchTerm}
              setSearchQuery={setSearchTerm}
              statusFilter="all"
              setStatusFilter={() => {}}
              resetFilters={() => setSearchTerm('')}
            />
          </CardContent>
        </Card>
      )}

      {/* Equipment Grid */}
      <EquipmentGrid 
        equipment={filteredEquipment} 
        isLoading={isLoading}
      />

      {/* Add Equipment Dialog */}
      <AddEquipmentDialog 
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}