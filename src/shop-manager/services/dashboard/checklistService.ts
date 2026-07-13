
import { supabase } from "@/lib/supabase";
import { ChecklistStat } from "@/types/dashboard";

export const getChecklistStats = async (): Promise<ChecklistStat[]> => {
  try {
    // Query real checklist data from work_order_checklists
    const { data: checklists, error } = await supabase
      .from('work_order_checklists')
      .select(`
        id,
        work_order_id,
        completion_percentage,
        checklist_items:checklist_items(id, is_required, is_completed)
      `)
      .limit(10);

    if (error) {
      console.error("Error fetching checklists:", error);
      return [];
    }

    if (!checklists) return [];

    // Calculate stats from real data
    return checklists.map(checklist => {
      const items = checklist.checklist_items || [];
      const requiredItems = items.filter((i: any) => i.is_required).length;
      const completedRequiredItems = items.filter((i: any) => i.is_required && i.is_completed).length;
      const completionRate = checklist.completion_percentage || 
        (requiredItems > 0 ? Math.round((completedRequiredItems / requiredItems) * 100) : 0);

      return {
        work_order_id: checklist.work_order_id,
        checklist_id: checklist.id,
        requiredItems,
        completedRequiredItems,
        completionRate
      };
    });
  } catch (error) {
    console.error("Error fetching checklist stats:", error);
    return [];
  }
};
