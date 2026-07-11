INSERT INTO public.business_modules (name, slug, description, icon, category, is_premium, default_enabled, display_order)
VALUES ('Personal Trainer', 'personal_trainer', 'Client management, workout programming, session scheduling, and fitness tracking for personal trainers and gyms', 'Dumbbell', 'fitness', false, false, 20)
ON CONFLICT DO NOTHING;