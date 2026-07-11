
import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, Image, Flame, Heart, Star, ThumbsUp, Loader2, Calendar, X, ArrowLeftRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useDropzone } from 'react-dropzone';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Front', 'Back', 'Side', 'Flexing', 'Progress'];
const REACTIONS = [
  { emoji: '🔥', label: 'fire' },
  { emoji: '👏', label: 'clap' },
  { emoji: '❤️', label: 'heart' },
  { emoji: '⭐', label: 'star' },
];

interface ClientProgressPhotosProps {
  clientId: string;
  shopId: string;
}

export default function ClientProgressPhotos({ clientId, shopId }: ClientProgressPhotosProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Progress');
  const [uploadNotes, setUploadNotes] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<any>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePhotos, setComparePhotos] = useState<any[]>([]);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['pt-progress-photos', clientId, shopId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('pt_progress_photos')
        .select('*')
        .eq('client_id', clientId)
        .eq('shop_id', shopId)
        .order('photo_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const reactionMutation = useMutation({
    mutationFn: async ({ photoId, reaction }: { photoId: string; reaction: string }) => {
      const { error } = await (supabase as any)
        .from('pt_progress_photos')
        .update({ trainer_reaction: reaction })
        .eq('id', photoId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pt-progress-photos', clientId] }),
  });

  const onDrop = useCallback(async (files: File[]) => {
    if (files.length === 0) return;
    setUploading(true);

    try {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `progress/${clientId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('pt-progress-photos')
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('pt-progress-photos')
          .getPublicUrl(path);

        const { error: insertError } = await (supabase as any)
          .from('pt_progress_photos')
          .insert({
            client_id: clientId,
            shop_id: shopId,
            photo_url: urlData.publicUrl,
            photo_date: new Date().toISOString().split('T')[0],
            category: uploadCategory,
            notes: uploadNotes || null,
          });
        if (insertError) throw insertError;
      }

      queryClient.invalidateQueries({ queryKey: ['pt-progress-photos', clientId] });
      setUploadNotes('');
      toast({ title: `${files.length} photo(s) uploaded!` });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  }, [clientId, shopId, uploadCategory, uploadNotes, queryClient, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: uploading,
  });

  const filteredPhotos = filterCategory === 'all' ? photos : photos.filter((p: any) => p.category === filterCategory);

  const handleCompareToggle = (photo: any) => {
    if (comparePhotos.find((p: any) => p.id === photo.id)) {
      setComparePhotos(comparePhotos.filter((p: any) => p.id !== photo.id));
    } else if (comparePhotos.length < 2) {
      setComparePhotos([...comparePhotos, photo]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-dashed border-2 border-primary/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Select value={uploadCategory} onValueChange={setUploadCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Add a note (optional)"
              value={uploadNotes}
              onChange={e => setUploadNotes(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
          </div>

          <div
            {...getRootProps()}
            className={cn(
              'flex flex-col items-center justify-center py-8 rounded-lg cursor-pointer transition-colors',
              isDragActive ? 'bg-primary/10' : 'bg-muted/50 hover:bg-muted'
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <>
                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  {isDragActive ? 'Drop photos here...' : 'Drag & drop photos or tap to upload'}
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter & Compare Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant={filterCategory === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setFilterCategory('all')}
        >
          All ({photos.length})
        </Badge>
        {CATEGORIES.map(c => {
          const count = photos.filter((p: any) => p.category === c).length;
          if (count === 0) return null;
          return (
            <Badge
              key={c}
              variant={filterCategory === c ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterCategory(c)}
            >
              {c} ({count})
            </Badge>
          );
        })}
        <Button
          variant={compareMode ? 'default' : 'outline'}
          size="sm"
          className="ml-auto"
          onClick={() => { setCompareMode(!compareMode); setComparePhotos([]); }}
        >
          <ArrowLeftRight className="h-4 w-4 mr-1" />
          Compare
        </Button>
      </div>

      {/* Compare View */}
      {compareMode && comparePhotos.length === 2 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Before / After</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {comparePhotos.map((photo: any) => (
                <div key={photo.id} className="space-y-1">
                  <img
                    src={photo.photo_url}
                    alt={photo.category}
                    className="w-full aspect-[3/4] object-cover rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    {format(new Date(photo.photo_date), 'MMM d, yyyy')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-12">
          <Image className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No progress photos yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload the first photo to start tracking progress</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filteredPhotos.map((photo: any) => (
            <div
              key={photo.id}
              className={cn(
                'relative group rounded-lg overflow-hidden cursor-pointer border-2 transition-all',
                compareMode && comparePhotos.find((p: any) => p.id === photo.id)
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-transparent hover:border-primary/30'
              )}
              onClick={() => compareMode ? handleCompareToggle(photo) : setSelectedPhoto(photo)}
            >
              <img
                src={photo.photo_url}
                alt={photo.category || 'Progress'}
                className="w-full aspect-[3/4] object-cover"
                loading="lazy"
              />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-[10px] text-white font-medium">{format(new Date(photo.photo_date), 'MMM d, yyyy')}</p>
                <div className="flex items-center gap-1">
                  {photo.category && <Badge variant="secondary" className="text-[9px] h-4 px-1">{photo.category}</Badge>}
                  {photo.trainer_reaction && <span className="text-sm">{REACTIONS.find(r => r.label === photo.trainer_reaction)?.emoji}</span>}
                </div>
              </div>
              {compareMode && (
                <div className="absolute top-2 right-2">
                  <div className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                    comparePhotos.find((p: any) => p.id === photo.id) ? 'bg-primary border-primary text-primary-foreground' : 'bg-black/30 border-white'
                  )}>
                    {comparePhotos.findIndex((p: any) => p.id === photo.id) >= 0 && (
                      <span className="text-xs font-bold">{comparePhotos.findIndex((p: any) => p.id === photo.id) + 1}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {selectedPhoto && format(new Date(selectedPhoto.photo_date), 'MMMM d, yyyy')}
            </DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <img
                src={selectedPhoto.photo_url}
                alt={selectedPhoto.category}
                className="w-full rounded-lg"
              />
              <div className="flex items-center gap-2">
                {selectedPhoto.category && <Badge>{selectedPhoto.category}</Badge>}
              </div>
              {selectedPhoto.notes && (
                <p className="text-sm text-muted-foreground">{selectedPhoto.notes}</p>
              )}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Trainer Reaction</Label>
                <div className="flex gap-2">
                  {REACTIONS.map(r => (
                    <button
                      key={r.label}
                      onClick={() => reactionMutation.mutate({ photoId: selectedPhoto.id, reaction: r.label })}
                      className={cn(
                        'text-2xl p-2 rounded-lg transition-all hover:scale-110',
                        selectedPhoto.trainer_reaction === r.label ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-muted'
                      )}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
