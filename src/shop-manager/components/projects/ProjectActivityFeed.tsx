import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, MessageSquare, Send, AlertCircle, CheckCircle, FileText, DollarSign } from "lucide-react";

interface Activity {
  id: string;
  activity_type: string;
  content: string | null;
  metadata: any;
  created_at: string;
  user_id: string | null;
  user_name?: string;
}

interface ProjectActivityFeedProps {
  projectId: string;
}

export const ProjectActivityFeed = ({ projectId }: ProjectActivityFeedProps) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('project_activities')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch user names
      const userIds = [...new Set(data?.map(a => a.user_id).filter(Boolean))];
      let userNames: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);
        
        profiles?.forEach(p => {
          userNames[p.id] = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown';
        });
      }

      setActivities(data?.map(a => ({
        ...a,
        user_name: a.user_id ? userNames[a.user_id] : 'System',
      })) || []);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const addComment = async () => {
    if (!comment.trim()) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('project_activities')
        .insert({
          project_id: projectId,
          user_id: user?.id,
          activity_type: 'comment',
          content: comment.trim(),
        });

      if (error) throw error;

      setComment('');
      fetchActivities();
      toast.success('Comment added');
    } catch (error) {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'status_change': return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'phase_completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'change_order': return <FileText className="h-4 w-4 text-purple-500" />;
      case 'budget_update': return <DollarSign className="h-4 w-4 text-emerald-500" />;
      default: return <MessageSquare className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'comment': return 'Comment';
      case 'status_change': return 'Status Changed';
      case 'phase_completed': return 'Phase Completed';
      case 'change_order': return 'Change Order';
      case 'budget_update': return 'Budget Updated';
      default: return 'Activity';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="flex-1"
          />
          <Button 
            size="icon" 
            onClick={addComment} 
            disabled={submitting || !comment.trim()}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Activity List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No activity yet
            </p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 rounded-lg border bg-card">
                <div className="flex-shrink-0 mt-0.5">
                  {getActivityIcon(activity.activity_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{activity.user_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getActivityLabel(activity.activity_type)}
                    </span>
                  </div>
                  {activity.content && (
                    <p className="text-sm text-foreground">{activity.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
