
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Search, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  getInventoryCategories,
  addInventoryCategory,
  deleteInventoryCategory
} from "@/services/inventory/categoryService";

export const CategoriesManager = () => {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const data = await getInventoryCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;

    try {
      setIsAdding(true);
      await addInventoryCategory(newCategory.trim());
      setNewCategory("");
      await fetchCategories();
      toast({
        title: "Success",
        description: "Category added successfully",
      });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      await deleteInventoryCategory(categoryName);
      await fetchCategories();
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const filteredCategories = categories.filter(category =>
    category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Categories...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Inventory Categories
        </CardTitle>
        <CardDescription>
          Manage your inventory categories. Add new categories or remove existing ones.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            placeholder="Add new category..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
          />
          <Button 
            onClick={handleAddCategory} 
            disabled={!newCategory.trim() || isAdding}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isAdding ? "Adding..." : "Add"}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Categories list */}
        {filteredCategories.length === 0 ? (
          <Alert>
            <AlertDescription>
              {searchTerm ? "No categories found matching your search." : "No categories available. Add some categories to get started."}
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">
              {filteredCategories.length} categories
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredCategories.map((category) => (
                <Badge key={category} variant="secondary" className="flex items-center gap-2">
                  {category}
                  <button
                    onClick={() => handleDeleteCategory(category)}
                    className="hover:text-red-500 ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
