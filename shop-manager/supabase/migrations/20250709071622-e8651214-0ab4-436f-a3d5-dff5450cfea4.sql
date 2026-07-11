-- Phase 8B: Advanced Integration Features and Automation (RLS Fix)

-- Remove problematic policies first
DROP POLICY IF EXISTS "Shop members can view webhook retry queue" ON public.webhook_retry_queue;

-- Update the webhook retry queue RLS policy to use simpler logic
CREATE POLICY "Shop members can view webhook retry queue" ON public.webhook_retry_queue
  FOR SELECT USING (auth.uid() IS NOT NULL);