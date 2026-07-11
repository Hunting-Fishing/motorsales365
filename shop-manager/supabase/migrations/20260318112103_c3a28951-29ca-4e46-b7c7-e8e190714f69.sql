
-- Seed fitness categories
INSERT INTO public.pt_fitness_categories (name, display_order, icon, color, description) VALUES
('Strength Training / Barbell / Iron Sports', 1, 'Dumbbell', '#EF4444', 'Barbell, dumbbell, kettlebell, and iron sport training'),
('Muscle Building / Physique / Aesthetics', 2, 'Flame', '#F97316', 'Bodybuilding, hypertrophy, and physique-focused training'),
('Functional Fitness / Hybrid', 3, 'Zap', '#EAB308', 'CrossFit, HIIT, circuit, and hybrid athletic training'),
('Running / Endurance', 4, 'Footprints', '#22C55E', 'Road, trail, marathon, and endurance running'),
('Cycling / Cardio Endurance', 5, 'Bike', '#14B8A6', 'Indoor/outdoor cycling and cardio endurance'),
('Swimming / Water Fitness', 6, 'Waves', '#06B6D4', 'Swimming, aqua fitness, and water sports'),
('Calisthenics / Gymnastics / Bodyweight', 7, 'PersonStanding', '#3B82F6', 'Bodyweight, street workout, and gymnastics'),
('Combat / Martial Arts / Fight Fitness', 8, 'Swords', '#8B5CF6', 'Boxing, MMA, martial arts conditioning'),
('Mobility / Flexibility / Recovery', 9, 'StretchHorizontal', '#A855F7', 'Mobility, stretching, rehab, and recovery'),
('Yoga / Pilates / Mind-Body', 10, 'Heart', '#EC4899', 'Yoga, pilates, barre, and mind-body fitness'),
('Dance / Rhythm / Cardio Classes', 11, 'Music', '#F43F5E', 'Dance fitness, Zumba, and rhythm-based workouts'),
('Outdoor / Adventure / Lifestyle Fitness', 12, 'Mountain', '#84CC16', 'Hiking, climbing, rucking, and adventure fitness'),
('Sports Performance', 13, 'Trophy', '#F59E0B', 'Sport-specific speed, agility, and power training'),
('Lifestyle / General Health / Beginner-Friendly', 14, 'HeartPulse', '#10B981', 'General fitness, home workouts, and beginner programs'),
('Weight Management / Transformation', 15, 'TrendingDown', '#0EA5E9', 'Fat loss, body recomposition, and transformation'),
('Women-Specific / Men-Specific / Life-Stage', 16, 'Users', '#D946EF', 'Life-stage and gender-considerate training tags'),
('Rehab / Special Population', 17, 'ShieldCheck', '#64748B', 'Rehab-oriented and adaptive fitness'),
('Niche / Emerging / Premium', 18, 'Sparkles', '#FBBF24', 'Biohacking, data-driven coaching, and premium interests');

-- Seed goal tags
INSERT INTO public.pt_fitness_goals (name, display_order, icon) VALUES
('Lose Weight', 1, 'TrendingDown'),
('Build Muscle', 2, 'Dumbbell'),
('Get Stronger', 3, 'Zap'),
('Improve Endurance', 4, 'Footprints'),
('Improve Flexibility', 5, 'StretchHorizontal'),
('Train for Competition', 6, 'Trophy'),
('Feel Healthier', 7, 'HeartPulse'),
('Recover from Injury', 8, 'ShieldCheck'),
('Stay Consistent', 9, 'Target'),
('Improve Energy', 10, 'Flame'),
('Reduce Stress', 11, 'Heart'),
('Improve Posture', 12, 'PersonStanding'),
('Increase Speed', 13, 'Zap'),
('Tone Up', 14, 'Sparkles'),
('Improve Balance', 15, 'Scale');
