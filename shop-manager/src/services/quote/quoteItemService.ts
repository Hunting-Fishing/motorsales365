import { supabase } from '@/integrations/supabase/client';
import { QuoteItem, QuoteItemFormValues, QuoteItemType } from '@/types/quote';

export async function createQuoteItems(quoteId: string, items: QuoteItemFormValues[]): Promise<QuoteItem[]> {
  console.log('createQuoteItems: Creating items for quote:', quoteId, items);
  
  const itemsToInsert = items.map((item, index) => ({
    quote_id: quoteId,
    name: item.name,
    description: item.description || null,
    category: item.category || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
    item_type: item.item_type,
    display_order: index + 1,
  }));

  const { data, error } = await supabase
    .from('quote_items')
    .insert(itemsToInsert)
    .select();

  if (error) {
    console.error('createQuoteItems: Error creating quote items:', error);
    throw new Error(`Failed to create quote items: ${error.message}`);
  }

  return data.map(item => ({
    ...item,
    item_type: item.item_type as QuoteItemType
  })) as QuoteItem[];
}

export async function updateQuoteItem(id: string, updates: Partial<QuoteItemFormValues>): Promise<QuoteItem> {
  console.log('updateQuoteItem: Updating quote item:', id, updates);
  
  const updateData: any = { ...updates };
  
  // Calculate total_price if quantity or unit_price are being updated
  if ('quantity' in updates || 'unit_price' in updates) {
    // Get current item to calculate total
    const { data: currentItem, error: fetchError } = await supabase
      .from('quote_items')
      .select('quantity, unit_price')
      .eq('id', id)
      .single();
    
    if (fetchError) {
      throw new Error(`Failed to fetch current item: ${fetchError.message}`);
    }
    
    const quantity = updates.quantity ?? currentItem.quantity;
    const unitPrice = updates.unit_price ?? currentItem.unit_price;
    updateData.total_price = quantity * unitPrice;
  }

  const { data, error } = await supabase
    .from('quote_items')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('updateQuoteItem: Error updating quote item:', error);
    throw new Error(`Failed to update quote item: ${error.message}`);
  }

  return {
    ...data,
    item_type: data.item_type as QuoteItemType
  } as QuoteItem;
}

export async function deleteQuoteItem(id: string): Promise<void> {
  console.log('deleteQuoteItem: Deleting quote item:', id);
  
  const { error } = await supabase
    .from('quote_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('deleteQuoteItem: Error deleting quote item:', error);
    throw new Error(`Failed to delete quote item: ${error.message}`);
  }
}

export async function updateQuoteItemsOrder(items: { id: string; display_order: number }[]): Promise<void> {
  console.log('updateQuoteItemsOrder: Updating display order for items:', items);
  
  const updates = items.map(item => 
    supabase
      .from('quote_items')
      .update({ display_order: item.display_order })
      .eq('id', item.id)
  );

  const results = await Promise.all(updates);
  
  for (const result of results) {
    if (result.error) {
      console.error('updateQuoteItemsOrder: Error updating item order:', result.error);
      throw new Error(`Failed to update quote items order: ${result.error.message}`);
    }
  }
}