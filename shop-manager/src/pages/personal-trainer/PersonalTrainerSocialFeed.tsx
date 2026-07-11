import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SocialPostCard } from '@/components/personal-trainer/social/SocialPostCard';
import { CreatePostDialog } from '@/components/personal-trainer/social/CreatePostDialog';
import { ReelsViewer } from '@/components/personal-trainer/social/ReelsViewer';
import { Plus, Clapperboard } from 'lucide-react';

export default function PersonalTrainerSocialFeed() {
  const { shopId } = useShopId();
  const [createOpen, setCreateOpen] = useState(false);
  const [tab, setTab] = useState('all');

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['social-feed', shopId, tab],
    queryFn: async () => {
      if (!shopId) return [];

      let query = supabase
        .from('pt_social_posts' as any)
        .select(`
          *,
          author_profile:profiles!pt_social_posts_author_profile_id_fkey(first_name, last_name),
          author_client:pt_clients!pt_social_posts_author_client_id_fkey(first_name, last_name)
        `)
        .eq('shop_id', shopId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (tab === 'photos') {
        query = query.eq('post_type', 'photo');
      } else if (tab === 'reels') {
        query = query.eq('post_type', 'reel');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reactions and comment counts for all posts
      const postIds = (data || []).map((p: any) => p.id);
      if (postIds.length === 0) return [];

      const [reactionsResult, commentsResult] = await Promise.all([
        supabase.from('pt_social_reactions' as any).select('post_id, reaction_type, reactor_profile_id').in('post_id', postIds),
        supabase.from('pt_social_comments' as any).select('post_id').in('post_id', postIds),
      ]);

      const reactions = (reactionsResult.data || []) as any[];
      const comments = (commentsResult.data || []) as any[];

      return (data || []).map((post: any) => {
        const postReactions = reactions.filter((r) => r.post_id === post.id);
        const reactionMap = new Map<string, { count: number; reacted_by_me: boolean }>();
        for (const r of postReactions) {
          const existing = reactionMap.get(r.reaction_type) || { count: 0, reacted_by_me: false };
          existing.count++;
          if (r.reactor_profile_id === currentUser?.id) existing.reacted_by_me = true;
          reactionMap.set(r.reaction_type, existing);
        }

        return {
          ...post,
          reactions: Array.from(reactionMap.entries()).map(([type, data]) => ({
            reaction_type: type,
            ...data,
          })),
          comment_count: comments.filter((c) => c.post_id === post.id).length,
        };
      });
    },
    enabled: !!shopId,
  });

  const reels = posts
    .filter((p: any) => p.post_type === 'reel' && p.media_urls?.length > 0)
    .map((p: any) => ({
      id: p.id,
      media_url: p.media_urls[0],
      caption: p.caption,
      author_name: p.author_profile
        ? `${p.author_profile.first_name || ''} ${p.author_profile.last_name || ''}`.trim()
        : 'Unknown',
      tags: p.tags || [],
    }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Social Feed</h1>
            <p className="text-sm text-muted-foreground">Share your fitness journey</p>
          </div>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Post
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))
          ) : posts.length === 0 ? (
            <EmptyState onCreatePost={() => setCreateOpen(true)} />
          ) : (
            posts.map((post: any) => <SocialPostCard key={post.id} post={post} />)
          )}
        </TabsContent>

        <TabsContent value="photos" className="mt-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))
          ) : posts.length === 0 ? (
            <EmptyState onCreatePost={() => setCreateOpen(true)} />
          ) : (
            posts.map((post: any) => <SocialPostCard key={post.id} post={post} />)
          )}
        </TabsContent>

        <TabsContent value="reels" className="mt-4">
          {isLoading ? (
            <Skeleton className="h-96 rounded-xl max-w-sm mx-auto" />
          ) : (
            <ReelsViewer reels={reels} />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Post Dialog */}
      {shopId && (
        <CreatePostDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          shopId={shopId}
        />
      )}
    </div>
  );
}

function EmptyState({ onCreatePost }: { onCreatePost: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 mb-4">
        <Clapperboard className="h-8 w-8 text-orange-500" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
      <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
        Be the first to share a progress photo, achievement, or motivational moment!
      </p>
      <Button
        onClick={onCreatePost}
        className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
      >
        <Plus className="h-4 w-4 mr-1" />
        Create First Post
      </Button>
    </div>
  );
}
