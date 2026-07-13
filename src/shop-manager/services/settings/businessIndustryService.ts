
import { supabase } from "@/lib/supabase";

async function addCustomIndustry(industry: string) {
  try {
    const { data, error } = await supabase
      .from('business_industries')
      .insert({ value: industry.toLowerCase(), label: industry })
      .select('*');
      
    if (error) {
      console.error("Error adding custom industry:", error);
      throw error;
    }
    
    return data?.[0] || null;
  } catch (error) {
    console.error("Error in addCustomIndustry:", error);
    throw error;
  }
}

export const businessIndustryService = {
  addCustomIndustry
};
