
import { supabase } from "@/lib/supabase";

async function getInventoryCategories(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('inventory_categories')
      .select('name')
      .order('name');
      
    if (error) {
      console.error("Error fetching inventory categories:", error);
      throw error;
    }
    
    return data?.map(item => item.name) || [];
  } catch (error) {
    console.error("Error in getInventoryCategories:", error);
    throw error;
  }
}

async function addInventoryCategory(categoryName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('inventory_categories')
      .insert({ name: categoryName.trim() });
      
    if (error) {
      console.error("Error adding inventory category:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in addInventoryCategory:", error);
    throw error;
  }
}

async function deleteInventoryCategory(categoryName: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('inventory_categories')
      .delete()
      .eq('name', categoryName);
      
    if (error) {
      console.error("Error deleting inventory category:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error in deleteInventoryCategory:", error);
    throw error;
  }
}

export const categoryService = {
  getInventoryCategories,
  addInventoryCategory,
  deleteInventoryCategory
};

export { getInventoryCategories, addInventoryCategory, deleteInventoryCategory };
