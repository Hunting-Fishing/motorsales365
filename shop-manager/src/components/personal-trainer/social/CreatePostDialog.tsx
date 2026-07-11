import React, { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HashtagBadges } from './HashtagBadges';
import { Camera, Film, Type, Upload, X, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
}

export function CreatePostDialog({ open, onOpenChange, shopId }: CreatePostDialogProps) {
  const [postType, setPostType] = useState<'photo' | 'reel' | 'text'>('photo');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState('everyone');
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const onDrop = useCallback((accepted: File[]) => {
    if (postType === 'reel') {
      setFiles(accepted.slice(0, 1));
      setPreviews(accepted.slice(0, 1).map((f) => URL.createObjectURL(f)));
    } else {
      setFiles((prev) => [...prev, ...accepted].slice(0, 6));
      setPreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))].slice(0, 6));
    }
  }, [postType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: postType === 'reel'
      ? { 'video/*': ['.mp4', '.mov', '.webm'] }
      : { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 50 * 1024 * 1024,
  });

  const removeFile = (idx: number) => {
    setFiles((f) => f.filter((_, i) => i !== idx));
    setPreviews((p) => p.filter((_, i) => i !== idx));
  };

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const createPost = useMutation({
    mutationFn: async () => {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload media
      const mediaUrls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `social/${shopId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('pt-progress-photos').upload(path, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('pt-progress-photos').getPublicUrl(path);
        mediaUrls.push(publicUrl);
      }

      const { error } = await supabase.from('pt_social_posts' as any).insert({
        shop_id: shopId,
        author_profile_id: user.id,
        post_type: postType,
        caption,
        media_urls: mediaUrls,
        tags,
        visibility,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Post shared! 🎉' });
      queryClient.invalidateQueries({ queryKey: ['social-feed'] });
      resetForm();
      onOpenChange(false);
    },
    onError: (e) => {
      toast({ title: 'Failed to create post', description: String(e), variant: 'destructive' });
    },
    onSettled: () => setUploading(false),
  });

  const resetForm = () => {
    setPostType('photo');
    setCaption('');
    setTags([]);
    setVisibility('everyone');
    setFiles([]);
    setPreviews([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Post type selector */}
          <div className="flex gap-2">
            {[
              { type: 'photo' as const, icon: Camera, label: 'Photo' },
              { type: 'reel' as const, icon: Film, label: 'Reel' },
              { type: 'text' as const, icon: Type, label: 'Text' },
            ].map((opt) => (
              <Button
                key={opt.type}
                variant={postType === opt.type ? 'default' : 'outline'}
                size="sm"
                className={postType === opt.type ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' : ''}
                onClick={() => { setPostType(opt.type); setFiles([]); setPreviews([]); }}
              >
                <opt.icon className="h-4 w-4 mr-1" />
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Media upload */}
          {postType !== 'text' && (
            <div>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-orange-500 bg-orange-500/5' : 'border-border hover:border-orange-500/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {postType === 'reel' ? 'Drop a video or click to upload' : 'Drop photos or click to upload (max 6)'}
                </p>
              </div>

              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {previews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                      {postType === 'reel' ? (
                        <video src={url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      )}
                      <button
                        onClick={() => removeFile(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Caption */}
          <div>
            <Label>Caption</Label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Share your fitness journey..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="mb-2 block">Hashtags</Label>
            <HashtagBadges tags={tags} onToggle={toggleTag} editable />
          </div>

          {/* Visibility */}
          <div>
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
                <SelectItem value="trainers_only">Trainers Only</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createPost.mutate()}
            disabled={uploading || (!caption.trim() && files.length === 0)}
            className="bg-gradient-to-r from-orange-500 to-red-500 text-white"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Share Post
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
