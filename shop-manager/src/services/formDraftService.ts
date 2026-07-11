import { supabase } from '@/integrations/supabase/client';

export interface FormDraft {
  id: string;
  templateId: string;
  draftData: Record<string, any>;
  userId?: string | null;
  customerId?: string | null;
  vehicleId?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface DbFormDraft {
  id: string;
  template_id: string;
  draft_data: Record<string, any>;
  user_id: string | null;
  customer_id: string | null;
  vehicle_id: string | null;
  expires_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function toFormDraft(row: DbFormDraft): FormDraft {
  return {
    id: row.id,
    templateId: row.template_id,
    draftData: row.draft_data,
    userId: row.user_id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get existing draft for a template and user
 */
export async function getFormDraft(
  templateId: string,
  userId?: string
): Promise<FormDraft | null> {
  let query = supabase
    .from('form_drafts')
    .select('*')
    .eq('template_id', templateId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error('Error fetching form draft:', error);
    return null;
  }

  return data ? toFormDraft(data as DbFormDraft) : null;
}

/**
 * Save or update a form draft
 */
export async function saveFormDraft(
  templateId: string,
  draftData: Record<string, any>,
  options?: {
    userId?: string;
    customerId?: string;
    vehicleId?: string;
    expiresInDays?: number;
  }
): Promise<FormDraft | null> {
  const { userId, customerId, vehicleId, expiresInDays = 7 } = options || {};

  // Calculate expiration date
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  // Check if draft exists
  const existingDraft = await getFormDraft(templateId, userId);

  if (existingDraft) {
    // Update existing draft
    const { data, error } = await supabase
      .from('form_drafts')
      .update({
        draft_data: draftData,
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingDraft.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating form draft:', error);
      return null;
    }

    return toFormDraft(data as DbFormDraft);
  } else {
    // Create new draft
    const { data, error } = await supabase
      .from('form_drafts')
      .insert({
        template_id: templateId,
        draft_data: draftData,
        user_id: userId || null,
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating form draft:', error);
      return null;
    }

    return toFormDraft(data as DbFormDraft);
  }
}

/**
 * Delete a form draft
 */
export async function deleteFormDraft(draftId: string): Promise<boolean> {
  const { error } = await supabase
    .from('form_drafts')
    .delete()
    .eq('id', draftId);

  if (error) {
    console.error('Error deleting form draft:', error);
    return false;
  }

  return true;
}

/**
 * Delete draft by template and user
 */
export async function deleteFormDraftByTemplate(
  templateId: string,
  userId?: string
): Promise<boolean> {
  let query = supabase
    .from('form_drafts')
    .delete()
    .eq('template_id', templateId);

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { error } = await query;

  if (error) {
    console.error('Error deleting form draft:', error);
    return false;
  }

  return true;
}

/**
 * Get all drafts for a user
 */
export async function getUserFormDrafts(userId: string): Promise<FormDraft[]> {
  const { data, error } = await supabase
    .from('form_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching user drafts:', error);
    return [];
  }

  return (data || []).map((row) => toFormDraft(row as DbFormDraft));
}

/**
 * Clean up expired drafts
 */
export async function cleanupExpiredDrafts(): Promise<number> {
  const { data, error } = await supabase
    .from('form_drafts')
    .delete()
    .lt('expires_at', new Date().toISOString())
    .select('id');

  if (error) {
    console.error('Error cleaning up expired drafts:', error);
    return 0;
  }

  return data?.length || 0;
}
