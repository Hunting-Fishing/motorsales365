import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageCircle, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface CommentsSectionProps {
  postId: string;
  shopId: string;
  commentCount: number;
}

export function CommentsSection({ postId, shopId, commentCount }: CommentsSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  const { data: comments = [] } = useQuery({
    queryKey: ['social-comments', postId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pt_social_comments' as any)
        .select('*, author:profiles!pt_social_comments_author_profile_id_fkey(first_name, last_name)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: expanded,
  });

  const addComment = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase.from('pt_social_comments' as any).insert({
        post_id: postId,
        author_profile_id: user.id,
        content,
        shop_id: shopId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment('');
      queryClient.invalidateQueries({ queryKey: ['social-comments', postId] });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
    },
    onError: () => toast({ title: 'Failed to post comment', variant: 'destructive' }),
  });

  return (
    <div className="border-t border-border/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{commentCount} comment{commentCount !== 1 ? 's' : ''}</span>
        {expanded ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          {(comments as any[]).map((c: any) => (
            <div key={c.id} className="flex gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-[10px] bg-muted">
                  {(c.author?.first_name?.[0] || '') + (c.author?.last_name?.[0] || '')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium">
                    {c.author?.first_name} {c.author?.last_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{c.content}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="min-h-[36px] text-sm resize-none"
              rows={1}
            />
            <Button
              size="icon"
              variant="ghost"
              disabled={!newComment.trim() || addComment.isPending}
              onClick={() => addComment.mutate(newComment.trim())}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
