
-- Remove the unconfirmed goldcity4u@icloud.com signup that has been showing in admin
UPDATE public.businesses SET owner_id = NULL WHERE owner_id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da';
DELETE FROM auth.users WHERE id = 'e3b80d24-34d7-4a36-85cb-a89826e2c8da' AND email_confirmed_at IS NULL;
