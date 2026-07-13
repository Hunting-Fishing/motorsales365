import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BudgetCategory } from '@/hooks/useBudgetData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';

interface BudgetCategoryManagerProps {
  categories: BudgetCategory[];
  onRefresh: () => void;
}

export function BudgetCategoryManager({ categories, onRefresh }: BudgetCategoryManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BudgetCategory | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget_limit: ''
  });

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', budget_limit: '' });
    setShowDialog(true);
  };

  const handleOpenEdit = (category: BudgetCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      budget_limit: category.budget_limit?.toString() || ''
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .eq('id', user.id)
        .single();

      if (!profile?.shop_id) throw new Error('No shop found');

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        budget_limit: formData.budget_limit ? parseFloat(formData.budget_limit) : null
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('budget_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('budget_categories')
          .insert({
            ...categoryData,
            shop_id: profile.shop_id,
            created_by: user.id,
            is_active: true
          });

        if (error) throw error;
        toast.success('Category created');
      }

      setShowDialog(false);
      onRefresh();
    } catch (err) {
      console.error('Error saving category:', err);
      toast.error('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (category: BudgetCategory) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('budget_categories')
        .update({ is_active: false })
        .eq('id', category.id);

      if (error) throw error;
      toast.success('Category deleted');
      onRefresh();
    } catch (err) {
      console.error('Error deleting category:', err);
      toast.error('Failed to delete category');
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Budget Categories</CardTitle>
              <CardDescription>Manage your budget categories and limits</CardDescription>
            </div>
            <Button onClick={handleOpenCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No budget categories yet</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenCreate}>
                Create First Category
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Budget Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(category.budget_limit)}</TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? 'outline' : 'secondary'}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleOpenEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDelete(category)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the budget category details' : 'Add a new budget category'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Marketing, Operations, Labor"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget_limit">Annual Budget Limit</Label>
              <Input
                id="budget_limit"
                type="number"
                value={formData.budget_limit}
                onChange={(e) => setFormData({ ...formData, budget_limit: e.target.value })}
                placeholder="e.g., 50000"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Saving...' : (editingCategory ? 'Update' : 'Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
