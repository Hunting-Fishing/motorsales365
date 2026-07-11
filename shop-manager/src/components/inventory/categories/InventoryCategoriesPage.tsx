
import React, { useEffect, useState } from "react";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  getInventoryCategories, 
  addInventoryCategory, 
  deleteInventoryCategory 
} from "@/services/inventory/categoryService";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export function InventoryCategoriesPage() {
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCategory, setNewCategory] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const loadedCategories = await getInventoryCategories();
      setCategories(loadedCategories);
    } catch (error) {
      console.error("Error loading inventory categories:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load inventory categories"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    
    // Check for duplicates
    if (categories.includes(newCategory.trim())) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "This category already exists"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addInventoryCategory(newCategory.trim());
      setCategories([...categories, newCategory.trim()].sort());
      setNewCategory("");
      toast({
        variant: "default",
        title: "Success",
        description: "Category added successfully"
      });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        variant: "destructive", 
        title: "Error",
        description: "Failed to add category"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    if (confirm(`Are you sure you want to delete "${category}"?`)) {
      setIsSubmitting(true);
      try {
        await deleteInventoryCategory(category);
        setCategories(categories.filter(c => c !== category));
        toast({
          variant: "default",
          title: "Success",
          description: "Category deleted successfully"
        });
      } catch (error) {
        console.error("Error deleting category:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete category"
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="container mx-auto">
      <Card className="bg-white shadow-md rounded-xl border border-gray-100">
        <CardHeader>
          <CardTitle className="text-2xl">Inventory Categories</CardTitle>
          <CardDescription>
            Manage the categories for your inventory items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-6">
            <Input
              placeholder="New category name"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="max-w-sm"
            />
            <Button 
              onClick={handleAddCategory} 
              disabled={!newCategory.trim() || isSubmitting}
              className="rounded-full bg-blue-600 hover:bg-blue-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-medium">Category Name</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="h-[200px] text-center">
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                          <div className="text-lg font-medium text-slate-700">No categories found</div>
                          <p className="text-slate-500 max-w-md text-center">
                            Add your first category above to get started.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{category}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCategory(category)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
