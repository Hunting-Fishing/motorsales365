import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Trash2, Eye, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface Photo {
  id: string;
  photo_type: string;
  photo_url: string;
  caption: string | null;
  location_tag: string | null;
  job_id: string | null;
}

interface Job {
  id: string;
  job_number: string;
  property_address: string | null;
}

const PowerWashingPhotos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedJob, setSelectedJob] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: photos, isLoading } = useQuery({
    queryKey: ['power-washing-photos', selectedJob, selectedType],
    queryFn: async () => {
      let query = supabase.from('power_washing_photos' as any).select('*').order('taken_at', { ascending: false });
      if (selectedJob !== 'all') query = query.eq('job_id', selectedJob);
      if (selectedType !== 'all') query = query.eq('photo_type', selectedType);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Photo[];
    }
  });

  const { data: jobs } = useQuery({
    queryKey: ['power-washing-jobs-list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('power_washing_jobs').select('id, job_number, property_address').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Job[];
    }
  });

  const deletePhoto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('power_washing_photos' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-photos'] });
      toast.success('Photo deleted');
    }
  });

  const photoTypes = ['before', 'after', 'progress', 'damage', 'inspection'];

  const getTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      before: 'bg-blue-100 text-blue-800',
      after: 'bg-green-100 text-green-800',
      progress: 'bg-yellow-100 text-yellow-800',
      damage: 'bg-red-100 text-red-800',
      inspection: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/power-washing')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Photo Documentation</h1>
          <p className="text-muted-foreground text-sm">Before/after photos for jobs</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Select value={selectedJob} onValueChange={setSelectedJob}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by job" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs?.map(job => (
              <SelectItem key={job.id} value={job.id}>{job.job_number} - {job.property_address || 'No address'}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue placeholder="Photo type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {photoTypes.map(type => (
              <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading photos...</div>
      ) : !photos?.length ? (
        <Card className="p-8 text-center">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">No Photos Yet</h3>
          <p className="text-sm text-muted-foreground">Photos will appear here when added to jobs</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map(photo => (
            <Card key={photo.id} className="overflow-hidden">
              <div className="relative aspect-square bg-muted">
                {photo.photo_url ? (
                  <img src={photo.photo_url} alt={photo.caption || 'Job photo'} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Image className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <Badge className={`absolute top-2 left-2 ${getTypeBadgeColor(photo.photo_type)}`}>
                  {photo.photo_type}
                </Badge>
              </div>
              <CardContent className="p-3">
                <p className="text-sm font-medium truncate">{photo.caption || 'No caption'}</p>
                <p className="text-xs text-muted-foreground">{photo.location_tag || 'No location'}</p>
                <div className="flex gap-2 mt-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>{photo.caption || 'Photo'}</DialogTitle>
                      </DialogHeader>
                      <img src={photo.photo_url} alt={photo.caption || ''} className="w-full rounded-lg" />
                    </DialogContent>
                  </Dialog>
                  <Button size="sm" variant="destructive" onClick={() => deletePhoto.mutate(photo.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PowerWashingPhotos;
