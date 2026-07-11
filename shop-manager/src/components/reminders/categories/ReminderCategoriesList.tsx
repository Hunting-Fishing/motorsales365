
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { ReminderCategory } from "@/types/reminder";
import { getReminderCategories } from "@/services/reminders/reminderQueries";
import { EditCategoryDialog } from "./EditCategoryDialog";
import { DeleteCategoryDialog } from "./DeleteCategoryDialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

export function ReminderCategoriesList() {
  const [categories, setCategories] = useState<ReminderCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ReminderCategory | null>(null);
  
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReminderCategories();
      setCategories(data);
    } catch (err) {
      console.error("Failed to load reminder categories:", err);
      setError("Failed to load reminder categories. Please try again.");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load reminder categories."
      });
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  const handleEdit = (category: ReminderCategory) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = (category: ReminderCategory) => {
    setSelectedCategory(category);
    setIsDeleteDialogOpen(true);
  };
  
  const handleCategoryUpdated = () => {
    setIsEditDialogOpen(false);
    setSelectedCategory(null);
    loadCategories();
    toast({
      title: "Success",
      description: "Category updated successfully."
    });
  };
  
  const handleCategoryDeleted = () => {
    setIsDeleteDialogOpen(false);
    setSelectedCategory(null);
    loadCategories();
    toast({
      title: "Success",
      description: "Category deleted successfully."
    });
  };
  
  if (loading) {
    return <div className="flex justify-center py-8">Loading categories...</div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md my-4">
        {error}
        <Button variant="outline" onClick={loadCategories} className="mt-2 ml-2">
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
          <CardTitle className="text-lg">Reminder Categories</CardTitle>
          <Button onClick={() => handleEdit({ id: '', name: '', color: '#9CA3AF', is_active: true })} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent className="divide-y">
          {categories.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground">
              No categories found. Create your first category to get started.
            </div>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="font-medium">{category.name}</span>
                  {!category.is_active && (
                    <Badge variant="outline" className="ml-2">
                      Inactive
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(category)}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit</span>
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(category)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      
      <EditCategoryDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        category={selectedCategory}
        onSave={handleCategoryUpdated}
      />
      
      <DeleteCategoryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        category={selectedCategory}
        onDelete={handleCategoryDeleted}
      />
    </>
  );
}
