
-- =====================================================
-- Batch 2: Scope remaining permissive RLS policies
-- =====================================================

-- 1. asset_work_orders (asset_id TEXT, equipment_assets.id UUID)
DROP POLICY IF EXISTS "Allow all access to asset_work_orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Users can view asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Users can insert asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Users can update asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Users can delete asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Shop users can view asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Shop users can insert asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Shop users can update asset work orders" ON public.asset_work_orders;
DROP POLICY IF EXISTS "Shop users can delete asset work orders" ON public.asset_work_orders;

CREATE POLICY "Shop users can view asset work orders" ON public.asset_work_orders
FOR SELECT TO authenticated
USING (asset_id IN (SELECT id::text FROM public.equipment_assets WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can insert asset work orders" ON public.asset_work_orders
FOR INSERT TO authenticated
WITH CHECK (asset_id IN (SELECT id::text FROM public.equipment_assets WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can update asset work orders" ON public.asset_work_orders
FOR UPDATE TO authenticated
USING (asset_id IN (SELECT id::text FROM public.equipment_assets WHERE shop_id = public.get_current_user_shop_id()))
WITH CHECK (asset_id IN (SELECT id::text FROM public.equipment_assets WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can delete asset work orders" ON public.asset_work_orders
FOR DELETE TO authenticated
USING (asset_id IN (SELECT id::text FROM public.equipment_assets WHERE shop_id = public.get_current_user_shop_id()));

-- 2. quote_items via quotes -> customers
DROP POLICY IF EXISTS "Allow all access to quote_items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can view quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can insert quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can update quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Users can delete quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Shop users can view quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Shop users can insert quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Shop users can update quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Shop users can delete quote items" ON public.quote_items;

CREATE POLICY "Shop users can view quote items" ON public.quote_items
FOR SELECT TO authenticated
USING (quote_id IN (SELECT q.id FROM public.quotes q JOIN public.customers c ON c.id = q.customer_id WHERE c.shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can insert quote items" ON public.quote_items
FOR INSERT TO authenticated
WITH CHECK (quote_id IN (SELECT q.id FROM public.quotes q JOIN public.customers c ON c.id = q.customer_id WHERE c.shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can update quote items" ON public.quote_items
FOR UPDATE TO authenticated
USING (quote_id IN (SELECT q.id FROM public.quotes q JOIN public.customers c ON c.id = q.customer_id WHERE c.shop_id = public.get_current_user_shop_id()))
WITH CHECK (quote_id IN (SELECT q.id FROM public.quotes q JOIN public.customers c ON c.id = q.customer_id WHERE c.shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can delete quote items" ON public.quote_items
FOR DELETE TO authenticated
USING (quote_id IN (SELECT q.id FROM public.quotes q JOIN public.customers c ON c.id = q.customer_id WHERE c.shop_id = public.get_current_user_shop_id()));

-- 3. work_order_parts via work_orders
DROP POLICY IF EXISTS "Allow all access to work_order_parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Users can view work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Users can insert work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Users can update work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Users can delete work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Shop users can view work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Shop users can insert work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Shop users can update work order parts" ON public.work_order_parts;
DROP POLICY IF EXISTS "Shop users can delete work order parts" ON public.work_order_parts;

CREATE POLICY "Shop users can view work order parts" ON public.work_order_parts
FOR SELECT TO authenticated
USING (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can insert work order parts" ON public.work_order_parts
FOR INSERT TO authenticated
WITH CHECK (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can update work order parts" ON public.work_order_parts
FOR UPDATE TO authenticated
USING (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()))
WITH CHECK (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can delete work order parts" ON public.work_order_parts
FOR DELETE TO authenticated
USING (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

-- 4. work_order_documents via work_orders
DROP POLICY IF EXISTS "Allow all access to work_order_documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Users can view work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Users can insert work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Users can update work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Users can delete work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Shop users can view work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Shop users can insert work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Shop users can update work order documents" ON public.work_order_documents;
DROP POLICY IF EXISTS "Shop users can delete work order documents" ON public.work_order_documents;

CREATE POLICY "Shop users can view work order documents" ON public.work_order_documents
FOR SELECT TO authenticated
USING (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can insert work order documents" ON public.work_order_documents
FOR INSERT TO authenticated
WITH CHECK (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can update work order documents" ON public.work_order_documents
FOR UPDATE TO authenticated
USING (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()))
WITH CHECK (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

CREATE POLICY "Shop users can delete work order documents" ON public.work_order_documents
FOR DELETE TO authenticated
USING (work_order_id IN (SELECT id FROM public.work_orders WHERE shop_id = public.get_current_user_shop_id()));

-- 5. User-scoped tables

-- chat_participants (user_id is TEXT, auth.uid() is UUID)
DROP POLICY IF EXISTS "Allow all access to chat_participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view their chat participations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can insert chat participations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can update their chat participations" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can delete their chat participations" ON public.chat_participants;
DROP POLICY IF EXISTS "Shop users can view chat participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Shop users can insert chat participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Shop users can update chat participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Shop users can delete chat participants" ON public.chat_participants;

CREATE POLICY "Users can view their chat participations" ON public.chat_participants
FOR SELECT TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Users can insert chat participations" ON public.chat_participants
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "Users can update their chat participations" ON public.chat_participants
FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);
CREATE POLICY "Users can delete their chat participations" ON public.chat_participants
FOR DELETE TO authenticated USING (user_id = auth.uid()::text);

-- smart_notifications (user_id is UUID)
DROP POLICY IF EXISTS "Allow all access to smart_notifications" ON public.smart_notifications;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.smart_notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON public.smart_notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.smart_notifications;
DROP POLICY IF EXISTS "Shop users can view smart notifications" ON public.smart_notifications;
DROP POLICY IF EXISTS "Shop users can insert smart notifications" ON public.smart_notifications;
DROP POLICY IF EXISTS "Shop users can update smart notifications" ON public.smart_notifications;

CREATE POLICY "Users can view their notifications" ON public.smart_notifications
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert notifications" ON public.smart_notifications
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON public.smart_notifications
FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- user_achievements (user_id is UUID)
DROP POLICY IF EXISTS "Allow all access to user_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can view their achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Shop users can view user achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Shop users can insert user achievements" ON public.user_achievements;

CREATE POLICY "Users can view their achievements" ON public.user_achievements
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert their achievements" ON public.user_achievements
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- 6. System/analytics tables

DROP POLICY IF EXISTS "Allow all access to audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow all access to feedback_responses" ON public.feedback_responses;
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.feedback_responses;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.feedback_responses;
CREATE POLICY "Authenticated users can view feedback" ON public.feedback_responses
FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert feedback" ON public.feedback_responses
FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to affiliate_link_clicks" ON public.affiliate_link_clicks;
DROP POLICY IF EXISTS "Anyone can insert affiliate clicks" ON public.affiliate_link_clicks;
CREATE POLICY "Anyone can insert affiliate clicks" ON public.affiliate_link_clicks
FOR INSERT TO authenticated WITH CHECK (true);
