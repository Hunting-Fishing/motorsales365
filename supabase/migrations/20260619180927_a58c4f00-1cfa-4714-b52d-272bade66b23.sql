
-- 1) business_type_suggestions: exclude sales from reading submitter PII
DROP POLICY IF EXISTS "Support read type suggestions" ON public.business_type_suggestions;
CREATE POLICY "Support read type suggestions"
ON public.business_type_suggestions
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'support'::app_role)
);

-- 2) staff_referrals: remove broad sales read of PII; admins + own-row read remain
DROP POLICY IF EXISTS "Sales read staff_referrals" ON public.staff_referrals;
