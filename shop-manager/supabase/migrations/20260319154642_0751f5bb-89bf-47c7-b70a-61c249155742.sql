
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read preset programs' AND tablename = 'pt_workout_programs') THEN
    CREATE POLICY "Anyone can read preset programs"
      ON pt_workout_programs FOR SELECT
      TO authenticated
      USING (is_preset = true OR shop_id IS NOT NULL);
  END IF;
END $$;

INSERT INTO pt_workout_programs (name, description, difficulty, duration_weeks, goal, is_template, is_preset, preset_category, workout_style, training_platform, target_muscles, days_per_week, session_duration_minutes) VALUES
('Classic Push/Pull/Legs', 'The gold standard PPL split for balanced hypertrophy.', 'intermediate', 8, 'Muscle Gain', true, true, 'PPL', ARRAY['push_pull_legs'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 6, 60),
('PPL Power & Hypertrophy', 'Heavy compounds with hypertrophy volume in PPL framework.', 'advanced', 12, 'Strength', true, true, 'PPL', ARRAY['push_pull_legs','powerlifting'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 6, 75),
('Beginner PPL', 'Simplified PPL with fewer exercises per session.', 'beginner', 8, 'General Fitness', true, true, 'PPL', ARRAY['push_pull_legs'], 'gym', ARRAY['full_body'], 3, 45),
('Upper/Lower 4-Day Split', 'Classic upper/lower split with balanced push/pull ratios.', 'intermediate', 8, 'Muscle Gain', true, true, 'Upper/Lower', ARRAY['upper_lower'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 4, 60),
('Upper/Lower Strength Focus', 'Heavy compounds with 5x5 methodology.', 'advanced', 12, 'Strength', true, true, 'Upper/Lower', ARRAY['upper_lower','powerlifting'], 'gym', ARRAY['chest','back','legs'], 4, 75),
('Full Body 3x/Week', 'Hit every muscle group three times per week.', 'beginner', 8, 'General Fitness', true, true, 'Full Body', ARRAY['full_body'], 'gym', ARRAY['full_body'], 3, 60),
('Full Body Minimalist', 'Maximum results with minimum exercises.', 'intermediate', 6, 'Strength', true, true, 'Full Body', ARRAY['full_body','functional'], 'gym', ARRAY['full_body'], 3, 45),
('Full Body Home Workout', 'No equipment bodyweight movements.', 'beginner', 6, 'General Fitness', true, true, 'Full Body', ARRAY['full_body','calisthenics'], 'home', ARRAY['full_body'], 3, 30),
('Classic 5-Day Bro Split', 'One muscle group per day.', 'intermediate', 8, 'Muscle Gain', true, true, 'Bro Split', ARRAY['bro_split','bodybuilding'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 5, 60),
('Bro Split High Volume', 'High volume bodybuilding split.', 'advanced', 10, 'Muscle Gain', true, true, 'Bro Split', ARRAY['bro_split','bodybuilding'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 5, 75),
('StrongLifts 5x5', 'Squat, bench, row, press, deadlift across 3 days.', 'beginner', 12, 'Strength', true, true, '5x5', ARRAY['powerlifting'], 'gym', ARRAY['full_body'], 3, 45),
('Madcow 5x5', 'Intermediate 5x5 with weekly linear progression.', 'intermediate', 12, 'Strength', true, true, '5x5', ARRAY['powerlifting'], 'gym', ARRAY['full_body'], 3, 60),
('CrossFit Foundations', 'Introductory CrossFit-style programming.', 'beginner', 6, 'General Fitness', true, true, 'CrossFit', ARRAY['crossfit_wod','functional'], 'gym', ARRAY['full_body'], 4, 60),
('WOD Warrior', 'High-intensity WODs combining gymnastics and weightlifting.', 'advanced', 8, 'Endurance', true, true, 'CrossFit', ARRAY['crossfit_wod'], 'gym', ARRAY['full_body'], 5, 60),
('CrossFit Competition Prep', 'Advanced programming for competitive athletes.', 'elite', 12, 'Sport Performance', true, true, 'CrossFit', ARRAY['crossfit_wod','olympic_lifting'], 'gym', ARRAY['full_body'], 6, 90),
('HIIT Fat Burner', '30-minute high-intensity interval sessions.', 'intermediate', 6, 'Fat Loss', true, true, 'HIIT', ARRAY['hiit_circuit'], 'gym', ARRAY['full_body'], 4, 30),
('Home HIIT Blaster', 'No equipment HIIT workouts.', 'beginner', 4, 'Fat Loss', true, true, 'HIIT', ARRAY['hiit_circuit','calisthenics'], 'home', ARRAY['full_body'], 4, 30),
('Tabata Challenge', '4-minute Tabata blocks for extreme conditioning.', 'advanced', 4, 'Fat Loss', true, true, 'HIIT', ARRAY['hiit_circuit'], 'gym', ARRAY['full_body'], 3, 30),
('Classic Bodybuilding', 'Old-school bodybuilding with mind-muscle connection.', 'intermediate', 12, 'Muscle Gain', true, true, 'Bodybuilding', ARRAY['bodybuilding'], 'gym', ARRAY['chest','back','shoulders','arms','legs','glutes'], 5, 75),
('Contest Prep', 'Pre-competition bodybuilding program.', 'elite', 16, 'Recomp', true, true, 'Bodybuilding', ARRAY['bodybuilding'], 'gym', ARRAY['chest','back','shoulders','arms','legs','glutes'], 6, 90),
('Lean Bulk Program', 'Moderate volume bodybuilding for lean bulking.', 'intermediate', 12, 'Muscle Gain', true, true, 'Bodybuilding', ARRAY['bodybuilding'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 4, 60),
('Beginner Powerlifting', 'Focus on squat, bench, deadlift with linear progression.', 'beginner', 12, 'Strength', true, true, 'Powerlifting', ARRAY['powerlifting'], 'gym', ARRAY['legs','chest','back'], 3, 60),
('Powerlifting Peaking', 'Competition peaking cycle with intensity ramps.', 'elite', 8, 'Strength', true, true, 'Powerlifting', ARRAY['powerlifting'], 'gym', ARRAY['legs','chest','back'], 4, 90),
('Powerbuilding Hybrid', 'Powerlifting compounds with bodybuilding accessories.', 'advanced', 10, 'Strength', true, true, 'Powerlifting', ARRAY['powerlifting','bodybuilding'], 'gym', ARRAY['chest','back','shoulders','arms','legs'], 4, 75),
('Calisthenics Fundamentals', 'Master push-ups, pull-ups, dips, and squats.', 'beginner', 8, 'General Fitness', true, true, 'Calisthenics', ARRAY['calisthenics'], 'home', ARRAY['full_body'], 3, 45),
('Advanced Calisthenics', 'Work towards muscle-ups, handstands, front levers.', 'advanced', 12, 'Strength', true, true, 'Calisthenics', ARRAY['calisthenics'], 'outdoor', ARRAY['full_body'], 4, 60),
('Street Workout', 'Bar-based calisthenics with freestyle elements.', 'intermediate', 8, 'Strength', true, true, 'Calisthenics', ARRAY['calisthenics','functional'], 'outdoor', ARRAY['chest','back','arms','core'], 4, 60),
('Athletic Performance', 'Speed, agility, and power for team sports.', 'intermediate', 8, 'Sport Performance', true, true, 'Sport-Specific', ARRAY['sport_specific','functional'], 'gym', ARRAY['full_body'], 4, 60),
('Combat Sport Conditioning', 'Strength and conditioning for combat sports.', 'advanced', 8, 'Sport Performance', true, true, 'Sport-Specific', ARRAY['sport_specific','hiit_circuit'], 'gym', ARRAY['full_body','core'], 5, 60),
('Runner''s Strength', 'Complementary strength training for runners.', 'intermediate', 8, 'Endurance', true, true, 'Sport-Specific', ARRAY['sport_specific','endurance'], 'gym', ARRAY['legs','core','glutes'], 3, 45),
('Mobility Mastery', 'Daily mobility and flexibility routine.', 'beginner', 8, 'Rehab', true, true, 'Rehab/Mobility', ARRAY['flexibility_mobility','rehabilitation'], 'home', ARRAY['full_body'], 5, 30),
('Post-Injury Return to Training', 'Gradual return-to-training protocol.', 'beginner', 12, 'Rehab', true, true, 'Rehab/Mobility', ARRAY['rehabilitation'], 'gym', ARRAY['full_body'], 3, 45),
('Active Recovery Protocol', 'Light movement with foam rolling and stretching.', 'beginner', 4, 'Rehab', true, true, 'Rehab/Mobility', ARRAY['flexibility_mobility'], 'home', ARRAY['full_body'], 3, 30),
('Marathon Prep Strength', 'Strength supplement for marathon training.', 'intermediate', 16, 'Endurance', true, true, 'Endurance', ARRAY['endurance'], 'gym', ARRAY['legs','core','glutes'], 2, 45),
('Hybrid Endurance & Strength', 'Balanced strength and cardio fitness.', 'intermediate', 8, 'General Fitness', true, true, 'Endurance', ARRAY['endurance','functional'], 'gym', ARRAY['full_body'], 4, 60),
('Functional Fitness 101', 'Real-world movement patterns.', 'beginner', 6, 'General Fitness', true, true, 'Functional', ARRAY['functional'], 'gym', ARRAY['full_body'], 3, 45),
('Tactical Fitness', 'Military-style functional fitness with rucking.', 'advanced', 12, 'General Fitness', true, true, 'Functional', ARRAY['functional','endurance'], 'outdoor', ARRAY['full_body'], 5, 60),
('Olympic Lifting Basics', 'Learn the snatch and clean & jerk.', 'beginner', 12, 'Strength', true, true, 'Olympic Lifting', ARRAY['olympic_lifting'], 'gym', ARRAY['full_body'], 3, 60),
('Olympic Weightlifting', 'Competition-focused Olympic lifting.', 'elite', 12, 'Sport Performance', true, true, 'Olympic Lifting', ARRAY['olympic_lifting'], 'gym', ARRAY['full_body','legs','back'], 5, 90);
