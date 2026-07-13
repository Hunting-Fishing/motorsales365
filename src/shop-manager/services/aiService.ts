import { supabase } from '@/integrations/supabase/client';
import {
  AIAnalytics,
  ChatMessage,
  AIRecommendation,
  SmartNotification,
  AISearchResult,
  WorkflowAutomation,
  AIInsight
} from '@/types/phase5';

export class AIService {
  // AI Analytics
  static async generateDemandForecast(targetId: string, historicalData: any[]): Promise<AIAnalytics> {
    const { data, error } = await supabase.functions.invoke('ai-analytics', {
      body: {
        type: 'demand_forecast',
        targetId,
        historicalData
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async analyzeCustomerBehavior(customerId: string): Promise<AIAnalytics> {
    const { data, error } = await supabase.functions.invoke('ai-analytics', {
      body: {
        type: 'behavior_analysis',
        targetId: customerId
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async optimizePricing(productId: string, marketData: any): Promise<AIAnalytics> {
    const { data, error } = await supabase.functions.invoke('ai-analytics', {
      body: {
        type: 'price_optimization',
        targetId: productId,
        marketData
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async predictMaintenance(equipmentId: string, maintenanceHistory: any[]): Promise<AIAnalytics> {
    const { data, error } = await supabase.functions.invoke('ai-analytics', {
      body: {
        type: 'maintenance_prediction',
        targetId: equipmentId,
        maintenanceHistory
      }
    });
    
    if (error) throw error;
    return data;
  }

  // AI Recommendations
  static async generateProductRecommendations(customerId: string): Promise<AIRecommendation[]> {
    const { data, error } = await supabase.functions.invoke('ai-recommendations', {
      body: {
        type: 'product',
        targetId: customerId
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async generateServiceRecommendations(vehicleId: string): Promise<AIRecommendation[]> {
    const { data, error } = await supabase.functions.invoke('ai-recommendations', {
      body: {
        type: 'service',
        targetId: vehicleId
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async generateCrossSellRecommendations(orderId: string): Promise<AIRecommendation[]> {
    const { data, error } = await supabase.functions.invoke('ai-recommendations', {
      body: {
        type: 'cross_sell',
        targetId: orderId
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async updateRecommendationEngagement(
    recommendationId: string, 
    engagementType: 'view' | 'click' | 'purchase' | 'dismiss'
  ): Promise<void> {
    const { error } = await supabase.rpc('update_recommendation_engagement', {
      p_recommendation_id: recommendationId,
      p_engagement_type: engagementType
    });
    
    if (error) throw error;
  }

  // Smart Search
  static async performSemanticSearch(query: string, filters?: any): Promise<AISearchResult[]> {
    const { data, error } = await supabase.functions.invoke('ai-search', {
      body: {
        query,
        filters,
        searchType: 'semantic'
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async performVisualSearch(imageData: string, searchType: string): Promise<AISearchResult[]> {
    const { data, error } = await supabase.functions.invoke('ai-search', {
      body: {
        imageData,
        searchType: 'visual',
        category: searchType
      }
    });
    
    if (error) throw error;
    return data;
  }

  // Chat System
  static async createChatSession(customerId?: string, sessionType: string = 'general'): Promise<string> {
    const { data, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        customer_id: customerId,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        session_type: sessionType
      })
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  }

  static async sendChatMessage(sessionId: string, content: string, role: 'user' | 'assistant' = 'user'): Promise<ChatMessage> {
    // Add user message to database
    const { data: userMessage, error: userError } = await supabase
      .from('ai_chat_messages')
      .insert({
        session_id: sessionId,
        role,
        content
      })
      .select()
      .single();
    
    if (userError) throw userError;

    // Get AI response if this is a user message
    if (role === 'user') {
      const { data: aiResponse, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          sessionId,
          message: content,
          action: 'respond'
        }
      });
      
      if (aiError) throw aiError;
      
      // Store AI response
      await supabase
        .from('ai_chat_messages')
        .insert({
          session_id: sessionId,
          role: 'assistant',
          content: aiResponse.content,
          metadata: aiResponse.metadata || {}
        });
    }
    
    return {
      id: userMessage.id,
      role: userMessage.role as 'user' | 'assistant' | 'system',
      content: userMessage.content,
      timestamp: userMessage.created_at,
      metadata: userMessage.metadata
    };
  }

  static async getChatMessages(sessionId: string): Promise<ChatMessage[]> {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data.map(msg => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: msg.created_at,
      metadata: msg.metadata
    }));
  }

  static async analyzeSentiment(text: string): Promise<number> {
    const { data, error } = await supabase.functions.invoke('ai-sentiment', {
      body: { text }
    });
    
    if (error) throw error;
    return data.sentiment_score;
  }

  // Smart Notifications
  static async createSmartNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium',
    type: 'info' | 'warning' | 'error' | 'success' = 'info',
    aiGenerated: boolean = false,
    metadata?: any
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_smart_notification', {
      p_user_id: userId,
      p_title: title,
      p_message: message,
      p_priority: priority,
      p_type: type,
      p_ai_generated: aiGenerated,
      p_metadata: metadata || {}
    });
    
    if (error) throw error;
    return data;
  }

  static async getSmartNotifications(userId: string, unreadOnly: boolean = false): Promise<SmartNotification[]> {
    let query = supabase
      .from('smart_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (unreadOnly) {
      query = query.eq('read', false);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data.map(notification => ({
      id: notification.id,
      title: notification.title,
      message: notification.message,
      priority: notification.priority as 'low' | 'medium' | 'high' | 'urgent',
      type: notification.type as 'info' | 'warning' | 'error' | 'success',
      user_id: notification.user_id,
      created_at: notification.created_at,
      read: notification.read,
      ai_generated: notification.ai_generated,
      metadata: notification.metadata
    }));
  }

  static async markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
      .from('smart_notifications')
      .update({ read: true, read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    if (error) throw error;
  }

  // Workflow Automation
  static async createWorkflowAutomation(
    name: string,
    description: string,
    triggerType: string,
    conditions: any[],
    actions: any[]
  ): Promise<string> {
    const { data, error } = await supabase
      .from('workflow_automations')
      .insert({
        name,
        description,
        trigger_type: triggerType,
        conditions,
        actions,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data.id;
  }

  static async getWorkflowAutomations(): Promise<WorkflowAutomation[]> {
    const { data, error } = await supabase
      .from('workflow_automations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map(workflow => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      trigger_type: workflow.trigger_type,
      conditions: Array.isArray(workflow.conditions) ? workflow.conditions : [],
      actions: Array.isArray(workflow.actions) ? workflow.actions : [],
      is_active: workflow.is_active,
      created_at: workflow.created_at,
      last_run: workflow.last_run,
      run_count: workflow.run_count
    }));
  }

  static async executeWorkflow(workflowId: string, triggerData: any): Promise<void> {
    const { error } = await supabase.functions.invoke('workflow-executor', {
      body: {
        workflowId,
        triggerData
      }
    });
    
    if (error) throw error;
  }

  // AI Insights
  static async generateBusinessInsights(): Promise<AIInsight[]> {
    const { data, error } = await supabase.functions.invoke('ai-insights', {
      body: { action: 'generate_insights' }
    });
    
    if (error) throw error;
    return data;
  }

  static async getAIInsights(unviewedOnly: boolean = false): Promise<AIInsight[]> {
    let query = supabase
      .from('ai_insights')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (unviewedOnly) {
      query = query.eq('viewed', false);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data.map(insight => ({
      id: insight.id,
      title: insight.title,
      description: insight.description,
      type: insight.type as 'trend' | 'anomaly' | 'opportunity' | 'risk',
      confidence: insight.confidence,
      impact_level: insight.impact_level as 'low' | 'medium' | 'high',
      actionable: insight.actionable,
      recommendations: Array.isArray(insight.recommendations) ? insight.recommendations.map(r => String(r)) : [],
      created_at: insight.created_at
    }));
  }

  static async acknowledgeInsight(insightId: string): Promise<void> {
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase
      .from('ai_insights')
      .update({
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      })
      .eq('id', insightId);
    
    if (error) throw error;
  }

  // Voice Commands
  static async processVoiceCommand(audioData: string): Promise<any> {
    const { data, error } = await supabase.functions.invoke('voice-processing', {
      body: {
        audioData,
        action: 'transcribe_and_execute'
      }
    });
    
    if (error) throw error;
    return data;
  }

  static async textToSpeech(text: string, voice: string = 'alloy'): Promise<string> {
    const { data, error } = await supabase.functions.invoke('text-to-speech', {
      body: {
        text,
        voice
      }
    });
    
    if (error) throw error;
    return data.audioContent;
  }
}

// Export singleton instance
export const aiService = new AIService();