
import { supabase } from '@/integrations/supabase/client';
import { CustomerProvidedForm, CustomerFormComment } from '@/types/customerForms';

interface UploadFormParams {
  file: File;
  customerId: string;
  title: string;
  description?: string;
  tags?: string[];
}

// Upload a new customer-provided form
export async function uploadCustomerForm({ file, customerId, title, description, tags = [] }: UploadFormParams): Promise<CustomerProvidedForm | null> {
  try {
    // 1. Upload file to storage
    const filePath = `${customerId}/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('customer_forms')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    // 2. Store metadata in database
    const { data: formData, error: formError } = await supabase
      .from('customer_provided_forms')
      .insert({
        title,
        description,
        customer_id: customerId,
        file_path: filePath,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        tags: tags,
        status: 'pending' as const // Explicitly type as 'pending'
      })
      .select('*')
      .single();

    if (formError) {
      console.error('Error inserting form record:', formError);
      // Clean up the uploaded file if the record insertion failed
      await supabase.storage.from('customer_forms').remove([filePath]);
      throw formError;
    }

    return {
      id: formData.id,
      title: formData.title,
      description: formData.description,
      customerId: formData.customer_id,
      filePath: formData.file_path,
      fileName: formData.file_name,
      fileType: formData.file_type,
      fileSize: formData.file_size,
      uploadDate: formData.upload_date,
      status: formData.status as 'pending' | 'approved' | 'rejected',
      reviewedBy: formData.reviewed_by,
      reviewedAt: formData.reviewed_at,
      reviewNotes: formData.review_notes,
      tags: formData.tags || []
    };
  } catch (error) {
    console.error('Error in uploadCustomerForm:', error);
    return null;
  }
}

// Get customer-provided forms for a specific customer
export async function getCustomerForms(customerId: string): Promise<CustomerProvidedForm[]> {
  const { data, error } = await supabase
    .from('customer_provided_forms')
    .select('*')
    .eq('customer_id', customerId)
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching customer forms:', error);
    return [];
  }

  // Get URLs for each form file
  const forms: CustomerProvidedForm[] = await Promise.all(
    data.map(async (form) => {
      const { data: urlData } = await supabase
        .storage
        .from('customer_forms')
        .createSignedUrl(form.file_path, 3600); // 1 hour expiry

      return {
        id: form.id,
        title: form.title,
        description: form.description,
        customerId: form.customer_id,
        filePath: form.file_path,
        fileName: form.file_name,
        fileType: form.file_type,
        fileSize: form.file_size,
        uploadDate: form.upload_date,
        status: form.status as 'pending' | 'approved' | 'rejected',
        reviewedBy: form.reviewed_by,
        reviewedAt: form.reviewed_at,
        reviewNotes: form.review_notes,
        tags: form.tags || [],
        url: urlData?.signedUrl
      };
    })
  );

  return forms;
}

// Get all customer-provided forms (for admins/staff)
export async function getAllCustomerForms(): Promise<CustomerProvidedForm[]> {
  const { data, error } = await supabase
    .from('customer_provided_forms')
    .select(`
      *,
      customers(first_name, last_name)
    `)
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching all customer forms:', error);
    return [];
  }

  // Transform data to match CustomerProvidedForm interface
  const forms = data.map(form => ({
    id: form.id,
    title: form.title,
    description: form.description,
    customerId: form.customer_id,
    customerName: form.customers ? `${form.customers.first_name} ${form.customers.last_name}` : undefined,
    filePath: form.file_path,
    fileName: form.file_name,
    fileType: form.file_type,
    fileSize: form.file_size,
    uploadDate: form.upload_date,
    status: form.status as 'pending' | 'approved' | 'rejected',
    reviewedBy: form.reviewed_by,
    reviewedAt: form.reviewed_at,
    reviewNotes: form.review_notes,
    tags: form.tags || []
  }));

  return forms;
}

// Update form status (approve/reject)
export async function updateFormStatus(
  formId: string, 
  status: 'pending' | 'approved' | 'rejected', 
  reviewNotes?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('customer_provided_forms')
    .update({
      status,
      review_notes: reviewNotes,
      reviewed_by: (await supabase.auth.getUser()).data.user?.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', formId);

  if (error) {
    console.error('Error updating form status:', error);
    return false;
  }

  return true;
}

// Add a comment to a form
export async function addFormComment(formId: string, comment: string): Promise<CustomerFormComment | null> {
  const user = (await supabase.auth.getUser()).data.user;
  
  if (!user) {
    console.error('No authenticated user found');
    return null;
  }

  const { data, error } = await supabase
    .from('customer_form_comments')
    .insert({
      form_id: formId,
      user_id: user.id,
      comment
    })
    .select('*')
    .single();

  if (error) {
    console.error('Error adding form comment:', error);
    return null;
  }

  return {
    id: data.id,
    formId: data.form_id,
    userId: data.user_id,
    comment: data.comment,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Get comments for a form
export async function getFormComments(formId: string): Promise<CustomerFormComment[]> {
  const { data, error } = await supabase
    .from('customer_form_comments')
    .select(`
      *,
      profiles:user_id(first_name, last_name)
    `)
    .eq('form_id', formId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching form comments:', error);
    return [];
  }

  return data.map(comment => {
    // Safely handle the potentially null profiles property
    let userName: string | undefined = undefined;
    
    // First check if profiles exists at all
    if (comment.profiles) {
      // Create a non-null reference we can use
      const profiles = comment.profiles;
      
      // Use a type guard to ensure profiles is an object
      if (typeof profiles === 'object' && profiles !== null) {
        // Now TypeScript knows profiles is a non-null object
        
        // Type assertion to help TypeScript understand the structure
        const typedProfiles = profiles as { first_name?: string, last_name?: string };
        
        // Safely extract firstName and lastName
        const firstName = typedProfiles.first_name;
        const lastName = typedProfiles.last_name;
        
        // Only set the userName if both first_name and last_name exist and are non-empty
        if (firstName && lastName) {
          userName = `${firstName} ${lastName}`;
        }
      }
    }

    return {
      id: comment.id,
      formId: comment.form_id,
      userId: comment.user_id,
      userName: userName,
      comment: comment.comment,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at
    };
  });
}
