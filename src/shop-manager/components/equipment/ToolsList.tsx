import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Hammer, CheckCircle, AlertCircle, XCircle, Wrench as WrenchIcon, Download, ClipboardList, ShieldCheck } from 'lucide-react';
import { getWarrantyStatus } from './ToolWarrantyBadge';
import { ToolDialog } from './ToolDialog';
import { ToolCheckoutDialog } from './ToolCheckoutDialog';
import { ToolMaintenanceDialog } from './ToolMaintenanceDialog';
import { ToolCard } from './ToolCard';
import { useToast } from '@/hooks/use-toast';

const statusIcons = {
  available: <CheckCircle className="h-4 w-4 text-green-600" />,
  in_use: <WrenchIcon className="h-4 w-4 text-blue-600" />,
  maintenance: <AlertCircle className="h-4 w-4 text-yellow-600" />,
  broken: <XCircle className="h-4 w-4 text-red-600" />,
  lost: <AlertCircle className="h-4 w-4 text-gray-600" />,
  retired: <AlertCircle className="h-4 w-4 text-gray-400" />,
};

const statusColors = {
  available: 'bg-green-100 text-green-800',
  in_use: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-yellow-100 text-yellow-800',
  broken: 'bg-red-100 text-red-800',
  lost: 'bg-gray-100 text-gray-800',
  retired: 'bg-gray-100 text-gray-600',
};

export function ToolsList() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [warrantyFilter, setWarrantyFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);

  const { data: tools, isLoading, refetch } = useQuery({
    queryKey: ['tools', shopId, categoryFilter, statusFilter, conditionFilter, warrantyFilter],
    queryFn: async () => {
      if (!shopId) return [];
      
      let query = supabase
        .from('tools')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as any);
      }

      if (conditionFilter !== 'all') {
        query = query.eq('condition', conditionFilter as any);
      }

      const { data, error } = await query;

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to load tools',
          variant: 'destructive',
        });
        throw error;
      }

      return data;
    },
    enabled: !!shopId,
  });

  const filteredTools = tools?.filter(tool => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.tool_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Warranty filter
    const warrantyStatus = getWarrantyStatus(tool.warranty_expiry);
    const matchesWarranty = warrantyFilter === 'all' || 
      (warrantyFilter === 'active' && warrantyStatus === 'active') ||
      (warrantyFilter === 'expiring' && warrantyStatus === 'expiring') ||
      (warrantyFilter === 'expired' && warrantyStatus === 'expired') ||
      (warrantyFilter === 'none' && warrantyStatus === 'none');
    
    return matchesSearch && matchesWarranty;
  });

  const handleEdit = (tool: any) => {
    setSelectedTool(tool);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedTool(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedTool(null);
    refetch();
  };

  const handleCheckout = (tool: any) => {
    setSelectedTool(tool);
    setCheckoutDialogOpen(true);
  };

  const handleMaintenance = (tool: any) => {
    setSelectedTool(tool);
    setMaintenanceDialogOpen(true);
  };

  const exportToCSV = () => {
    if (!tools || tools.length === 0) return;
    
    const csvData = tools.map(tool => ({
      Name: tool.name,
      Category: tool.category || 'N/A',
      Serial: tool.serial_number || 'N/A',
      Status: tool.status,
      Condition: tool.condition || 'N/A',
      Location: tool.location || 'N/A',
      'Purchase Date': tool.purchase_date || 'N/A',
      Cost: tool.purchase_cost || 0
    }));

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tools-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    toast({
      title: 'Success',
      description: 'Tools exported to CSV',
    });
  };

  const stats = {
    total: tools?.length || 0,
    available: tools?.filter(t => t.status === 'available').length || 0,
    in_use: tools?.filter(t => t.status === 'in_use').length || 0,
    maintenance: tools?.filter(t => t.status === 'maintenance').length || 0,
    warranty_active: tools?.filter(t => getWarrantyStatus(t.warranty_expiry) === 'active').length || 0,
    warranty_expiring: tools?.filter(t => getWarrantyStatus(t.warranty_expiry) === 'expiring').length || 0,
    warranty_expired: tools?.filter(t => getWarrantyStatus(t.warranty_expiry) === 'expired').length || 0,
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Tools</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold text-green-600">{stats.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Use</p>
            <p className="text-2xl font-bold text-blue-600">{stats.in_use}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Maintenance</p>
            <p className="text-2xl font-bold text-orange-600">{stats.maintenance}</p>
          </CardContent>
        </Card>
      </div>

      {/* Warranty Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setWarrantyFilter('active')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Warranties</p>
                <p className="text-2xl font-bold text-green-600">{stats.warranty_active}</p>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setWarrantyFilter('expiring')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.warranty_expiring}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => setWarrantyFilter('expired')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired Warranties</p>
                <p className="text-2xl font-bold text-red-600">{stats.warranty_expired}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Hammer className="h-5 w-5" />
              Tool Inventory
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportToCSV} disabled={!tools || tools.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tool
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, tool number, or manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="hand_tool">Hand Tool</SelectItem>
                <SelectItem value="power_tool">Power Tool</SelectItem>
                <SelectItem value="diagnostic">Diagnostic</SelectItem>
                <SelectItem value="specialty">Specialty</SelectItem>
                <SelectItem value="ppe">PPE</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="broken">Broken</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Conditions</SelectItem>
                <SelectItem value="excellent">Excellent</SelectItem>
                <SelectItem value="good">Good</SelectItem>
                <SelectItem value="fair">Fair</SelectItem>
                <SelectItem value="poor">Poor</SelectItem>
              </SelectContent>
            </Select>
            <Select value={warrantyFilter} onValueChange={setWarrantyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Warranty Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Warranties</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="none">No Warranty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8">Loading tools...</div>
          ) : filteredTools && filteredTools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTools.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  onEdit={handleEdit}
                  onDelete={refetch}
                  onCheckout={handleCheckout}
                  onMaintenance={handleMaintenance}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No tools found. Click "Add Tool" to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <ToolDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        tool={selectedTool}
      />

      <ToolCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        tool={selectedTool}
        onSuccess={refetch}
      />

      <ToolMaintenanceDialog
        open={maintenanceDialogOpen}
        onOpenChange={setMaintenanceDialogOpen}
        tool={selectedTool}
        onSuccess={refetch}
      />
    </div>
  );
}
