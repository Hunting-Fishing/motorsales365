
-- Create feature_requests table with comprehensive tracking
CREATE TABLE IF NOT EXISTS feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('ui_ux', 'functionality', 'integration', 'performance', 'security', 'other')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'approved', 'in_development', 'testing', 'completed', 'rejected', 'on_hold')),
  
  -- User information
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  submitter_email TEXT,
  submitter_name TEXT,
  
  -- Voting system
  vote_count INTEGER DEFAULT 0,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  
  -- Development tracking
  complexity_estimate TEXT CHECK (complexity_estimate IN ('trivial', 'minor', 'major', 'epic')),
  estimated_hours INTEGER,
  assigned_developer TEXT,
  target_version TEXT,
  
  -- Technical details
  technical_requirements TEXT,
  implementation_notes TEXT,
  acceptance_criteria TEXT,
  
  -- Integration with support system
  support_ticket_id UUID REFERENCES support_tickets(id) ON DELETE SET NULL,
  
  -- Metadata
  is_public BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  tags JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  
  -- Tracking
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Admin notes
  admin_notes TEXT
);

-- Create feature_request_votes table for tracking individual votes
CREATE TABLE IF NOT EXISTS feature_request_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(feature_request_id, user_id)
);

-- Create feature_request_comments table for discussion
CREATE TABLE IF NOT EXISTS feature_request_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  commenter_name TEXT,
  commenter_email TEXT,
  content TEXT NOT NULL,
  is_admin_comment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create feature_request_status_history table for tracking changes
CREATE TABLE IF NOT EXISTS feature_request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_request_id UUID NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  change_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_requests_status ON feature_requests(status);
CREATE INDEX IF NOT EXISTS idx_feature_requests_category ON feature_requests(category);
CREATE INDEX IF NOT EXISTS idx_feature_requests_priority ON feature_requests(priority);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created_at ON feature_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_feature_requests_vote_count ON feature_requests(vote_count DESC);
CREATE INDEX IF NOT EXISTS idx_feature_request_votes_user ON feature_request_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_request_comments_request ON feature_request_comments(feature_request_id);

-- Enable RLS on all tables
ALTER TABLE feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_request_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for feature_requests
CREATE POLICY "Public can view public feature requests" ON feature_requests
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own feature requests" ON feature_requests
  FOR SELECT USING (submitted_by = auth.uid());

CREATE POLICY "Authenticated users can create feature requests" ON feature_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own feature requests" ON feature_requests
  FOR UPDATE USING (submitted_by = auth.uid());

CREATE POLICY "Admins can manage all feature requests" ON feature_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
    )
  );

-- RLS Policies for feature_request_votes
CREATE POLICY "Public can view votes" ON feature_request_votes
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON feature_request_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON feature_request_votes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes" ON feature_request_votes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for feature_request_comments
CREATE POLICY "Public can view comments" ON feature_request_comments
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create comments" ON feature_request_comments
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own comments" ON feature_request_comments
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all comments" ON feature_request_comments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
    )
  );

-- RLS Policies for feature_request_status_history
CREATE POLICY "Public can view status history" ON feature_request_status_history
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage status history" ON feature_request_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner')
    )
  );

-- Create functions for vote counting
CREATE OR REPLACE FUNCTION update_feature_request_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE feature_requests 
    SET 
      upvotes = upvotes + CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE 0 END,
      downvotes = downvotes + CASE WHEN NEW.vote_type = 'downvote' THEN 1 ELSE 0 END,
      vote_count = upvotes + downvotes,
      updated_at = now()
    WHERE id = NEW.feature_request_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE feature_requests 
    SET 
      upvotes = upvotes + 
        CASE WHEN NEW.vote_type = 'upvote' THEN 1 ELSE 0 END -
        CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE 0 END,
      downvotes = downvotes + 
        CASE WHEN NEW.vote_type = 'downvote' THEN 1 ELSE 0 END -
        CASE WHEN OLD.vote_type = 'downvote' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE id = NEW.feature_request_id;
    
    UPDATE feature_requests 
    SET vote_count = upvotes + downvotes
    WHERE id = NEW.feature_request_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE feature_requests 
    SET 
      upvotes = upvotes - CASE WHEN OLD.vote_type = 'upvote' THEN 1 ELSE 0 END,
      downvotes = downvotes - CASE WHEN OLD.vote_type = 'downvote' THEN 1 ELSE 0 END,
      updated_at = now()
    WHERE id = OLD.feature_request_id;
    
    UPDATE feature_requests 
    SET vote_count = upvotes + downvotes
    WHERE id = OLD.feature_request_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote counting
CREATE TRIGGER feature_request_vote_counts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON feature_request_votes
  FOR EACH ROW EXECUTE FUNCTION update_feature_request_vote_counts();

-- Create function for status history tracking
CREATE OR REPLACE FUNCTION track_feature_request_status_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO feature_request_status_history (
      feature_request_id,
      old_status,
      new_status,
      changed_by
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid()
    );
    
    -- Update completion timestamp
    IF NEW.status = 'completed' THEN
      NEW.completed_at = now();
    END IF;
    
    -- Update review timestamp
    IF NEW.status IN ('approved', 'rejected') AND OLD.status = 'submitted' THEN
      NEW.reviewed_at = now();
    END IF;
  END IF;
  
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status history
CREATE TRIGGER feature_request_status_history_trigger
  BEFORE UPDATE ON feature_requests
  FOR EACH ROW EXECUTE FUNCTION track_feature_request_status_changes();

-- Insert some sample data for testing
INSERT INTO feature_requests (
  title, description, category, priority, submitter_name, submitter_email,
  technical_requirements, implementation_notes
) VALUES 
(
  'Dark Mode Toggle',
  'Add a dark mode toggle to the application interface for better user experience during night time usage.',
  'ui_ux',
  'medium',
  'John Doe',
  'john@example.com',
  'CSS theme switching, localStorage persistence, system preference detection',
  'Implement using CSS custom properties and React context'
),
(
  'Export Data to PDF',
  'Allow users to export their reports and data in PDF format for offline viewing and sharing.',
  'functionality',
  'high',
  'Jane Smith',
  'jane@example.com',
  'PDF generation library integration, template system for different report types',
  'Use jsPDF or Puppeteer for PDF generation'
),
(
  'Real-time Notifications',
  'Implement real-time push notifications for important updates and alerts.',
  'functionality',
  'high',
  'Mike Johnson',
  'mike@example.com',
  'WebSocket connection, notification service integration, browser notification API',
  'Use Supabase realtime features with browser notification API'
);
