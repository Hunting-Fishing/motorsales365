
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { FormCategory } from "@/types/formBuilder";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getFormCategories, createFormCategory, updateFormCategory, deleteFormCategory } from "@/services/formCategoryService";
import { useToast } from "@/components/ui/use-toast";

export const FormCategories = () => {
  const [categories, setCategories] = useState<FormCategory[]>([]);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<FormCategory | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    const data = await getFormCategories();
    setCategories(data);
    setIsLoading(false);
  };

  const handleAddCategory = async () => {
    if (newCategory.name.trim()) {
      const result = await createFormCategory(newCategory);
      
      if (result) {
        toast({
          title: "Category created",
          description: `${newCategory.name} has been created successfully`,
        });
        
        setCategories([...categories, result]);
        setNewCategory({ name: "", description: "" });
        setIsAddDialogOpen(false);
        await loadCategories();
      } else {
        toast({
          title: "Failed to create category",
          description: "There was an error creating the category",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditCategory = async () => {
    if (editCategory && editCategory.name.trim()) {
      const result = await updateFormCategory(
        editCategory.id, 
        { name: editCategory.name, description: editCategory.description }
      );
      
      if (result) {
        toast({
          title: "Category updated",
          description: `${editCategory.name} has been updated successfully`,
        });
        
        setCategories(categories.map(cat => 
          cat.id === editCategory.id ? editCategory : cat
        ));
        setEditCategory(null);
        setIsEditDialogOpen(false);
        await loadCategories();
      } else {
        toast({
          title: "Failed to update category",
          description: "There was an error updating the category",
          variant: "destructive",
        });
      }
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const result = await deleteFormCategory(id);
    
    if (result) {
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully",
      });
      
      setCategories(categories.filter(category => category.id !== id));
      await loadCategories();
    } else {
      toast({
        title: "Failed to delete category",
        description: "There was an error deleting the category",
        variant: "destructive",
      });
    }
  };

  const startEdit = (category: FormCategory) => {
    setEditCategory({ ...category });
    setIsEditDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Loading form categories...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">Form Categories</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 shadow-md hover:shadow-lg transition-all duration-300">
              <Plus className="h-4 w-4 mr-2" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Form Category</DialogTitle>
              <DialogDescription>
                Create a new category to organize your forms.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="name">Category Name</Label>
                <Input 
                  id="name" 
                  value={newCategory.name} 
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="e.g., Customer Intake"
                  className="rounded-md"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  value={newCategory.description || ''} 
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  placeholder="Brief description of this category"
                  rows={3}
                  className="rounded-md"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddCategory}
                className="bg-gradient-to-r from-blue-500 to-purple-600"
              >
                Add Category
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <h4 className="text-gray-500 mb-2">No categories yet</h4>
          <p className="text-gray-400 mb-4">Create categories to organize your forms</p>
          <Button 
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600"
          >
            <Plus className="h-4 w-4 mr-2" /> Add First Category
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <Card key={category.id} className="overflow-hidden border-blue-100 hover:shadow-md transition-all duration-300">
              <div className="h-1 bg-gradient-to-r from-blue-400 to-purple-400"></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{category.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(category)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(category.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">
                  {category.description || "No description provided"}
                </p>
              </CardContent>
              <CardFooter className="pt-0 justify-between">
                <div className="text-sm text-muted-foreground">
                  Created {new Date(category.created_at).toLocaleDateString()}
                </div>
                <Badge variant="secondary">{category.count || 0} Forms</Badge>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input 
                id="edit-name" 
                value={editCategory?.name || ""} 
                onChange={(e) => editCategory && setEditCategory({ ...editCategory, name: e.target.value })}
                className="rounded-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea 
                id="edit-description" 
                value={editCategory?.description || ""} 
                onChange={(e) => editCategory && setEditCategory({ ...editCategory, description: e.target.value })}
                rows={3}
                className="rounded-md"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleEditCategory}
              className="bg-gradient-to-r from-blue-500 to-purple-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
