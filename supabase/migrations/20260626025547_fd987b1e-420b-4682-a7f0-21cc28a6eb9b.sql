CREATE POLICY "Staff read own QR leads" ON public.qr_lead_captures FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.staff_referrals s WHERE s.referral_code = qr_lead_captures.referral_code AND s.staff_user_id = auth.uid()));

CREATE POLICY "Advertising read all QR leads" ON public.qr_lead_captures FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read qr_scans" ON public.qr_scans FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read user_referrals" ON public.user_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read referral_redemptions" ON public.referral_redemptions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));

CREATE POLICY "Advertising read staff_referrals" ON public.staff_referrals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'advertising'::app_role));