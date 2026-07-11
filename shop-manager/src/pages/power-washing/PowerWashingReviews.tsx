import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Star,
  ThumbsUp,
  MessageSquare,
  ArrowLeft,
  Filter,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Review {
  id: string;
  job_id: string | null;
  rating: number;
  review_text: string | null;
  would_recommend: boolean | null;
  service_quality: number | null;
  timeliness: number | null;
  professionalism: number | null;
  value_for_money: number | null;
  is_public: boolean | null;
  response: string | null;
  responded_at: string | null;
  created_at: string;
}

export default function PowerWashingReviews() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterRating, setFilterRating] = useState<string>('all');
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['power-washing-reviews', filterRating],
    queryFn: async () => {
      let query = supabase
        .from('power_washing_reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (filterRating !== 'all') {
        query = query.eq('rating', parseInt(filterRating));
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Review[];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ id, response }: { id: string; response: string }) => {
      const { error } = await supabase
        .from('power_washing_reviews')
        .update({
          response,
          responded_at: new Date().toISOString(),
          responded_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['power-washing-reviews'] });
      toast.success('Response submitted');
      setRespondingTo(null);
      setResponseText('');
    },
    onError: () => {
      toast.error('Failed to submit response');
    },
  });

  const averageRating = reviews?.length 
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingCounts = reviews?.reduce((acc, r) => {
    acc[r.rating] = (acc[r.rating] || 0) + 1;
    return acc;
  }, {} as Record<number, number>) || {};

  const renderStars = (rating: number, size = 'h-4 w-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${size} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground/30'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate('/power-washing')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Star className="h-8 w-8 text-amber-400" />
              Customer Reviews
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and respond to customer feedback
            </p>
          </div>
          <Select value={filterRating} onValueChange={setFilterRating}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ratings</SelectItem>
              <SelectItem value="5">5 Stars</SelectItem>
              <SelectItem value="4">4 Stars</SelectItem>
              <SelectItem value="3">3 Stars</SelectItem>
              <SelectItem value="2">2 Stars</SelectItem>
              <SelectItem value="1">1 Star</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-border">
          <CardContent className="p-6 text-center">
            <div className="text-4xl font-bold text-foreground mb-1">{averageRating}</div>
            <div className="flex justify-center mb-2">{renderStars(parseFloat(averageRating), 'h-5 w-5')}</div>
            <p className="text-sm text-muted-foreground">{reviews?.length || 0} reviews</p>
          </CardContent>
        </Card>
        
        <Card className="border-border md:col-span-3">
          <CardContent className="p-6">
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((rating) => (
                <div key={rating} className="flex items-center gap-3">
                  <span className="w-8 text-sm text-muted-foreground">{rating}★</span>
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className="bg-amber-400 h-2 rounded-full transition-all"
                      style={{
                        width: `${reviews?.length ? (ratingCounts[rating] || 0) / reviews.length * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-sm text-muted-foreground text-right">
                    {ratingCounts[rating] || 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : reviews && reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id} className="border-border">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {renderStars(review.rating, 'h-5 w-5')}
                      {review.would_recommend && (
                        <Badge variant="outline" className="text-green-500 border-green-500/30">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Would Recommend
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <Badge variant={review.is_public ? 'default' : 'secondary'}>
                    {review.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>

                {review.review_text && (
                  <p className="text-foreground mb-4">{review.review_text}</p>
                )}

                {/* Rating Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  {review.service_quality && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Service Quality:</span>
                      <span className="ml-2 font-medium">{review.service_quality}/5</span>
                    </div>
                  )}
                  {review.timeliness && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Timeliness:</span>
                      <span className="ml-2 font-medium">{review.timeliness}/5</span>
                    </div>
                  )}
                  {review.professionalism && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Professionalism:</span>
                      <span className="ml-2 font-medium">{review.professionalism}/5</span>
                    </div>
                  )}
                  {review.value_for_money && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Value:</span>
                      <span className="ml-2 font-medium">{review.value_for_money}/5</span>
                    </div>
                  )}
                </div>

                {/* Response Section */}
                {review.response ? (
                  <div className="bg-muted/50 rounded-lg p-4 mt-4">
                    <p className="text-sm font-medium text-foreground mb-1">Your Response</p>
                    <p className="text-sm text-muted-foreground">{review.response}</p>
                    {review.responded_at && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Responded on {format(new Date(review.responded_at), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                ) : respondingTo === review.id ? (
                  <div className="mt-4 space-y-3">
                    <Textarea
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Write your response..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondMutation.mutate({ id: review.id, response: responseText })}
                        disabled={!responseText.trim()}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Submit Response
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRespondingTo(null);
                          setResponseText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-4"
                    onClick={() => setRespondingTo(review.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Respond
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-border">
          <CardContent className="p-12 text-center">
            <Star className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-xl font-semibold mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground">
              Customer reviews will appear here once you receive feedback
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
