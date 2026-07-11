import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ReactionBar } from './ReactionBar';
import { CommentsSection } from './CommentsSection';
import { HashtagBadges } from './HashtagBadges';

interface SocialPost {
  id: string;
  shop_id: string;
  post_type: string;
  caption: string;
  media_urls: string[];
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  visibility: string;
  author_profile?: { first_name: string; last_name: string } | null;
  author_client?: { first_name: string; last_name: string } | null;
  reactions: { reaction_type: string; count: number; reacted_by_me: boolean }[];
  comment_count: number;
}

interface SocialPostCardProps {
  post: SocialPost;
}

export function SocialPostCard({ post }: SocialPostCardProps) {
  const queryClient = useQueryClient();
  const [mediaIndex, setMediaIndex] = useState(0);

  const authorName = post.author_profile
    ? `${post.author_profile.first_name || ''} ${post.author_profile.last_name || ''}`.trim()
    : post.author_client
    ? `${post.author_client.first_name || ''} ${post.author_client.last_name || ''}`.trim()
    : 'Unknown';

  const initials = authorName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  const toggleReaction = useMutation({
    mutationFn: async (type: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const existing = post.reactions.find((r) => r.reaction_type === type && r.reacted_by_me);
      if (existing) {
        await supabase
          .from('pt_social_reactions' as any)
          .delete()
          .eq('post_id', post.id)
          .eq('reactor_profile_id', user.id)
          .eq('reaction_type', type);
      } else {
        await supabase.from('pt_social_reactions' as any).insert({
          post_id: post.id,
          reactor_profile_id: user.id,
          reaction_type: type,
          shop_id: post.shop_id,
        });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-feed'] }),
  });

  return (
    <Card className="overflow-hidden border-border/50 bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-2">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="bg-gradient-to-br from-orange-500 to-red-500 text-white text-sm font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{authorName}</p>
            {post.is_pinned && <Pin className="h-3 w-3 text-orange-500" />}
            {post.post_type === 'reel' && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">Reel</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Media */}
      {post.media_urls.length > 0 && (
        <div className="relative">
          {post.post_type === 'reel' ? (
            <video
              src={post.media_urls[0]}
              controls
              playsInline
              className="w-full max-h-[500px] object-cover bg-black"
            />
          ) : post.media_urls.length === 1 ? (
            <img
              src={post.media_urls[0]}
              alt=""
              className="w-full max-h-[500px] object-cover"
              loading="lazy"
            />
          ) : (
            <div className="relative">
              <img
                src={post.media_urls[mediaIndex]}
                alt=""
                className="w-full max-h-[500px] object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {post.media_urls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setMediaIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === mediaIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Caption & Tags */}
      <div className="px-4 pt-3 pb-2 space-y-2">
        {post.caption && <p className="text-sm whitespace-pre-wrap">{post.caption}</p>}
        <HashtagBadges tags={post.tags || []} />
      </div>

      {/* Reactions */}
      <div className="px-4 pb-2">
        <ReactionBar
          reactions={post.reactions}
          onReact={(type) => toggleReaction.mutate(type)}
          loading={toggleReaction.isPending}
        />
      </div>

      {/* Comments */}
      <CommentsSection postId={post.id} shopId={post.shop_id} commentCount={post.comment_count} />
    </Card>
  );
}
