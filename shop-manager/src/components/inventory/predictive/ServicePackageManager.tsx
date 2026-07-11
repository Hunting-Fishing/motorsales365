import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import { ServicePackage } from '@/types/inventory/predictive';
import { getServicePackages, deleteServicePackage } from '@/services/inventory/predictiveService';
import { ServicePackageDialog } from './ServicePackageDialog';
import { toast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export function ServicePackageManager() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | undefined>();

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      setLoading(true);
      const data = await getServicePackages();
      setPackages(data);
    } catch (error) {
      console.error('Error loading service packages:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load service packages',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pkg: ServicePackage) => {
    setSelectedPackage(pkg);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service package?')) return;

    try {
      await deleteServicePackage(id);
      toast({
        title: 'Success',
        description: 'Service package deleted successfully',
      });
      loadPackages();
    } catch (error) {
      console.error('Error deleting service package:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete service package',
      });
    }
  };

  const handleDialogClose = (success?: boolean) => {
    setDialogOpen(false);
    setSelectedPackage(undefined);
    if (success) {
      loadPackages();
    }
  };

  if (loading) {
    return <div className="p-6">Loading service packages...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Service Packages
            </CardTitle>
            <CardDescription>
              Define service templates with parts lists for recurring maintenance
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Package
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {packages.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No service packages yet</p>
            <p className="text-sm">Create your first package to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Interval</TableHead>
                <TableHead>Parts</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg) => (
                <TableRow key={pkg.id}>
                  <TableCell className="font-medium">{pkg.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{pkg.category || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    Every {pkg.interval_value} {pkg.interval_metric}
                  </TableCell>
                  <TableCell>{pkg.items?.length || 0} parts</TableCell>
                  <TableCell>
                    <Badge variant={pkg.is_active ? 'default' : 'secondary'}>
                      {pkg.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pkg)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(pkg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ServicePackageDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        packageData={selectedPackage}
      />
    </Card>
  );
}
