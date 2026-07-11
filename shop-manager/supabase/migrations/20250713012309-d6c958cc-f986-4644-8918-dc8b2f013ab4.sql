-- Phase 5: AI & Automation Tables

-- AI Analytics table for storing predictive analytics results
CREATE TABLE public.ai_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('demand_forecast', 'behavior_analysis', 'price_optimization', 'maintenance_prediction')),
    target_id UUID, -- Reference to the entity being analyzed (customer, product, etc.)
    data JSONB NOT NULL,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_until TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Recommendations table
CREATE TABLE public.ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('product', 'service', 'cross_sell', 'upsell')),
    target_id UUID NOT NULL, -- Reference to customer, product, etc.
    recommended_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    reason TEXT,
    is_active BOOLEAN DEFAULT true,
    engagement_score DECIMAL(3,2) DEFAULT 0,
    conversion_rate DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Smart Notifications table
CREATE TABLE public.smart_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success')),
    read BOOLEAN DEFAULT false,
    ai_generated BOOLEAN DEFAULT false,
    action_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Workflow Automations table
CREATE TABLE public.workflow_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    actions JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES auth.users(id),
    last_run TIMESTAMP WITH TIME ZONE,
    run_count INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Chat Sessions table
CREATE TABLE public.ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    user_id UUID REFERENCES auth.users(id),
    session_type TEXT NOT NULL CHECK (session_type IN ('customer_support', 'sales', 'technical', 'general')),
    status TEXT NOT NULL CHECK (status IN ('active', 'resolved', 'escalated', 'closed')) DEFAULT 'active',
    sentiment_score DECIMAL(3,2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
    satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    resolution_time INTEGER, -- in minutes
    escalated_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE
);

-- AI Chat Messages table
CREATE TABLE public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Insights table for storing business insights
CREATE TABLE public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('trend', 'anomaly', 'opportunity', 'risk')),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    impact_level TEXT NOT NULL CHECK (impact_level IN ('low', 'medium', 'high')),
    actionable BOOLEAN DEFAULT false,
    recommendations JSONB DEFAULT '[]'::jsonb,
    data_sources JSONB DEFAULT '[]'::jsonb,
    viewed BOOLEAN DEFAULT false,
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- AI Search Analytics table
CREATE TABLE public.ai_search_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    query TEXT NOT NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    click_through_rate DECIMAL(3,2) DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 0,
    search_time_ms INTEGER,
    filters_used JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ai_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_search_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AI Analytics
CREATE POLICY "Users can view AI analytics" ON public.ai_analytics FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage AI analytics" ON public.ai_analytics FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- RLS Policies for AI Recommendations
CREATE POLICY "Users can view recommendations" ON public.ai_recommendations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "System can manage recommendations" ON public.ai_recommendations FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for Smart Notifications
CREATE POLICY "Users can view their notifications" ON public.smart_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON public.smart_notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.smart_notifications FOR INSERT WITH CHECK (true);

-- RLS Policies for Workflow Automations
CREATE POLICY "Users can view workflow automations" ON public.workflow_automations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage workflow automations" ON public.workflow_automations FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- RLS Policies for AI Chat Sessions
CREATE POLICY "Users can view chat sessions" ON public.ai_chat_sessions FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'customer_service'))
);
CREATE POLICY "Users can create chat sessions" ON public.ai_chat_sessions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update chat sessions" ON public.ai_chat_sessions FOR UPDATE USING (
    user_id = auth.uid() OR escalated_to = auth.uid() OR
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'customer_service'))
);

-- RLS Policies for AI Chat Messages
CREATE POLICY "Users can view chat messages" ON public.ai_chat_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM ai_chat_sessions WHERE id = session_id AND 
            (user_id = auth.uid() OR 
             EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
                     WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'customer_service'))))
);
CREATE POLICY "Users can create chat messages" ON public.ai_chat_messages FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM ai_chat_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- RLS Policies for AI Insights
CREATE POLICY "Users can view AI insights" ON public.ai_insights FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can manage AI insights" ON public.ai_insights FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- RLS Policies for AI Search Analytics
CREATE POLICY "Users can view their search analytics" ON public.ai_search_analytics FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create search analytics" ON public.ai_search_analytics FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all search analytics" ON public.ai_search_analytics FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id 
            WHERE ur.user_id = auth.uid() AND r.name IN ('admin', 'owner'))
);

-- Indexes for performance
CREATE INDEX idx_ai_analytics_type_target ON public.ai_analytics(type, target_id);
CREATE INDEX idx_ai_analytics_created_at ON public.ai_analytics(created_at DESC);
CREATE INDEX idx_ai_recommendations_target_type ON public.ai_recommendations(target_id, type);
CREATE INDEX idx_ai_recommendations_active ON public.ai_recommendations(is_active) WHERE is_active = true;
CREATE INDEX idx_smart_notifications_user_unread ON public.smart_notifications(user_id, read) WHERE read = false;
CREATE INDEX idx_smart_notifications_priority ON public.smart_notifications(priority, created_at DESC);
CREATE INDEX idx_workflow_automations_active ON public.workflow_automations(is_active) WHERE is_active = true;
CREATE INDEX idx_ai_chat_sessions_customer ON public.ai_chat_sessions(customer_id);
CREATE INDEX idx_ai_chat_sessions_status ON public.ai_chat_sessions(status);
CREATE INDEX idx_ai_chat_messages_session ON public.ai_chat_messages(session_id, created_at);
CREATE INDEX idx_ai_insights_type_impact ON public.ai_insights(type, impact_level);
CREATE INDEX idx_ai_insights_unread ON public.ai_insights(viewed) WHERE viewed = false;
CREATE INDEX idx_ai_search_analytics_user_query ON public.ai_search_analytics(user_id, created_at DESC);

-- Functions for AI automation
CREATE OR REPLACE FUNCTION public.generate_ai_recommendation(
    p_type TEXT,
    p_target_id UUID,
    p_recommended_items JSONB,
    p_confidence DECIMAL,
    p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    recommendation_id UUID;
BEGIN
    INSERT INTO public.ai_recommendations (
        type, target_id, recommended_items, confidence, reason
    ) VALUES (
        p_type, p_target_id, p_recommended_items, p_confidence, p_reason
    ) RETURNING id INTO recommendation_id;
    
    RETURN recommendation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_smart_notification(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'medium',
    p_type TEXT DEFAULT 'info',
    p_ai_generated BOOLEAN DEFAULT false,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.smart_notifications (
        user_id, title, message, priority, type, ai_generated, metadata
    ) VALUES (
        p_user_id, p_title, p_message, p_priority, p_type, p_ai_generated, p_metadata
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_recommendation_engagement(
    p_recommendation_id UUID,
    p_engagement_type TEXT -- 'view', 'click', 'purchase', 'dismiss'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.ai_recommendations
    SET 
        engagement_score = CASE 
            WHEN p_engagement_type = 'purchase' THEN LEAST(engagement_score + 0.5, 1.0)
            WHEN p_engagement_type = 'click' THEN LEAST(engagement_score + 0.2, 1.0)
            WHEN p_engagement_type = 'view' THEN LEAST(engagement_score + 0.1, 1.0)
            WHEN p_engagement_type = 'dismiss' THEN GREATEST(engagement_score - 0.1, 0.0)
            ELSE engagement_score
        END,
        updated_at = now()
    WHERE id = p_recommendation_id;
END;
$$;

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_ai_tables_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_ai_analytics_updated_at
    BEFORE UPDATE ON public.ai_analytics
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_tables_updated_at();

CREATE TRIGGER update_ai_recommendations_updated_at
    BEFORE UPDATE ON public.ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_tables_updated_at();

CREATE TRIGGER update_workflow_automations_updated_at
    BEFORE UPDATE ON public.workflow_automations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_tables_updated_at();

CREATE TRIGGER update_ai_chat_sessions_updated_at
    BEFORE UPDATE ON public.ai_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_tables_updated_at();

CREATE TRIGGER update_ai_insights_updated_at
    BEFORE UPDATE ON public.ai_insights
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_tables_updated_at();