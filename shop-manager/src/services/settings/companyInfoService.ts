
import { supabase } from "@/lib/supabase";
import { CompanyInfo } from "./companyService";
import { cleanPhoneNumber, formatPhoneNumber } from "@/utils/formatters";

async function uploadLogo(shopId: string, file: File) {
  try {
    // Validate file
    if (!file) {
      throw new Error('No file provided');
    }

    // Generate a unique filename
    const fileName = `${shopId}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const filePath = `${shopId}/${fileName}`;

    // Upload file to Supabase storage
    const { data, error } = await supabase.storage
      .from('shop_logos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('shop_logos')
      .getPublicUrl(filePath);

    console.log('Logo uploaded, public URL:', publicUrl);

    // Update shop record with logo URL
    const { data: updatedShop, error: updateError } = await supabase
      .from('shops')
      .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', shopId)
      .select('*');

    if (updateError) {
      console.error('Shop update error:', updateError);
      throw updateError;
    }

    return publicUrl;
  } catch (error) {
    console.error('Logo upload failed:', error);
    throw error;
  }
}

async function getShopInfo() {
  try {
    // Get the current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      throw userError;
    }
    
    if (!user) {
      throw new Error("No authenticated user found");
    }
    
    // Get the profile with shop_id - handle both patterns
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('shop_id')
      .or(`id.eq.${user.id},user_id.eq.${user.id}`)
      .maybeSingle();
      
    if (profileError) {
      throw profileError;
    }
    
    const shopId = profile?.shop_id;
    
    if (!shopId) {
      throw new Error("No shop associated with this user");
    }
    
    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single();
      
    if (shopError) {
      throw shopError;
    }
    
    console.log("Shop data from DB:", shop);
    
    // Format shop data to match CompanyInfo structure with proper property names
    const companyInfo: CompanyInfo = {
      name: shop?.name || "",
      address: shop?.address || "",
      city: shop?.city || "",
      state: shop?.state || "",
      zip: shop?.postal_code || "",
      phone: shop?.phone ? formatPhoneNumber(shop.phone) : "",
      email: shop?.email || "",
      tax_id: shop?.tax_id || "",
      business_type: shop?.business_type || "",
      industry: shop?.industry || "",
      other_industry: shop?.other_industry || "",
      logo_url: shop?.logo_url || ""
    };
    
    console.log("Loaded company info:", companyInfo);
    
    return { shopId, companyInfo };
  } catch (error) {
    console.error("Error fetching shop info:", error);
    throw error;
  }
}

async function updateCompanyInfo(shopId: string, companyInfo: CompanyInfo) {
  try {
    // Clean phone number before saving
    const cleanedPhone = cleanPhoneNumber(companyInfo.phone || '');
    console.log("Original phone:", companyInfo.phone, "Cleaned phone:", cleanedPhone);

    const updateData = {
      name: companyInfo.name,
      address: companyInfo.address,
      city: companyInfo.city,
      state: companyInfo.state,
      postal_code: companyInfo.zip,
      phone: cleanedPhone,
      email: companyInfo.email,
      tax_id: companyInfo.tax_id,
      business_type: companyInfo.business_type,
      industry: companyInfo.industry,
      other_industry: companyInfo.other_industry,
      updated_at: new Date().toISOString()
    };
    
    console.log("Updating company with data:", updateData);
    
    const { data, error } = await supabase
      .from('shops')
      .update(updateData)
      .eq('id', shopId)
      .select('*');
      
    if (error) {
      console.error("Error updating shop info:", error);
      throw error;
    }
    
    console.log("Company info updated successfully:", data);
    
    // Return formatted data with proper property mapping
    const updatedCompanyInfo: CompanyInfo = {
      name: data[0]?.name || companyInfo.name,
      address: data[0]?.address || companyInfo.address,
      city: data[0]?.city || companyInfo.city,
      state: data[0]?.state || companyInfo.state,
      zip: data[0]?.postal_code || companyInfo.zip,
      phone: formatPhoneNumber(data[0]?.phone || companyInfo.phone),
      email: data[0]?.email || companyInfo.email,
      tax_id: data[0]?.tax_id || companyInfo.tax_id,
      business_type: data[0]?.business_type || companyInfo.business_type,
      industry: data[0]?.industry || companyInfo.industry,
      other_industry: data[0]?.other_industry || companyInfo.other_industry,
      logo_url: data[0]?.logo_url || companyInfo.logo_url
    };
    
    return { success: true, data: updatedCompanyInfo };
  } catch (error) {
    console.error("Error updating company info:", error);
    throw error;
  }
}

export const companyInfoService = {
  getShopInfo,
  updateCompanyInfo,
  uploadLogo
};
