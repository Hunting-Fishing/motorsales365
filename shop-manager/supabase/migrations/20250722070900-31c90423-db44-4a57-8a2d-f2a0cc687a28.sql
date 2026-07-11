-- Create user progress tracking tables
CREATE TABLE public.user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  learning_path_id UUID REFERENCES help_learning_paths(id) ON DELETE CASCADE,
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  progress_type TEXT NOT NULL CHECK (progress_type IN ('learning_path', 'article')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  time_spent_minutes INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_content UNIQUE (user_id, learning_path_id, article_id)
);

-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_type TEXT NOT NULL CHECK (achievement_type IN ('first_article', 'path_complete', 'streak_7', 'streak_30', 'power_user', 'helper')),
  achievement_name TEXT NOT NULL,
  achievement_description TEXT,
  points_awarded INTEGER DEFAULT 0,
  icon_name TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user points table
CREATE TABLE public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  level_name TEXT DEFAULT 'Beginner',
  articles_completed INTEGER DEFAULT 0,
  paths_completed INTEGER DEFAULT 0,
  time_spent_total_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reading analytics table
CREATE TABLE public.reading_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  article_id UUID REFERENCES help_articles(id) ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  session_end TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER DEFAULT 0,
  scroll_depth_percentage INTEGER DEFAULT 0,
  was_helpful BOOLEAN,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_progress
CREATE POLICY "Users can view their own progress" ON public.user_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own progress" ON public.user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own progress" ON public.user_progress
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can insert achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_points
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own points" ON public.user_points
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own points" ON public.user_points
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for reading_analytics
CREATE POLICY "Users can view their own analytics" ON public.reading_analytics
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own analytics" ON public.reading_analytics
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own analytics" ON public.reading_analytics
  FOR UPDATE USING (user_id = auth.uid());

-- Create function to update user points and handle achievements
CREATE OR REPLACE FUNCTION public.update_user_progress_and_points()
RETURNS TRIGGER AS $$
DECLARE
  points_to_add INTEGER := 0;
  user_point_record RECORD;
  new_achievement TEXT;
BEGIN
  -- Calculate points based on completion
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    IF NEW.progress_type = 'article' THEN
      points_to_add := 10;
    ELSIF NEW.progress_type = 'learning_path' THEN
      points_to_add := 50;
    END IF;

    -- Update user points
    INSERT INTO public.user_points (user_id, total_points)
    VALUES (NEW.user_id, points_to_add)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      total_points = user_points.total_points + points_to_add,
      articles_completed = CASE WHEN NEW.progress_type = 'article' THEN user_points.articles_completed + 1 ELSE user_points.articles_completed END,
      paths_completed = CASE WHEN NEW.progress_type = 'learning_path' THEN user_points.paths_completed + 1 ELSE user_points.paths_completed END,
      updated_at = now();

    -- Get updated user points record
    SELECT * INTO user_point_record FROM public.user_points WHERE user_id = NEW.user_id;

    -- Check for achievements
    IF user_point_record.articles_completed = 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded, icon_name)
      VALUES (NEW.user_id, 'first_article', 'First Steps', 'Completed your first help article', 5, 'trophy');
    END IF;

    IF user_point_record.paths_completed = 1 THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded, icon_name)
      VALUES (NEW.user_id, 'path_complete', 'Path Master', 'Completed your first learning path', 25, 'award');
    END IF;

    IF user_point_record.total_points >= 100 THEN
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, achievement_description, points_awarded, icon_name)
      VALUES (NEW.user_id, 'power_user', 'Power User', 'Earned 100+ points', 20, 'star')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for progress updates
CREATE TRIGGER update_user_progress_and_points_trigger
  AFTER INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_progress_and_points();

-- Create function to initialize user points record
CREATE OR REPLACE FUNCTION public.initialize_user_points(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  new_record_id UUID;
BEGIN
  INSERT INTO public.user_points (user_id)
  VALUES (user_uuid)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO new_record_id;
  
  RETURN new_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;