import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Star, ThumbsUp, ThumbsDown, Flag, CheckCircle } from 'lucide-react';
import { getProductReviews, getReviewSummary, markReviewHelpful, getUserReviewHelpfulness } from '@/services/productReviewService';
import WriteReviewForm from '../WriteReviewForm';
import { useToast } from '@/hooks/use-toast';

interface ProductReview {
  id: string;
  reviewer_name: string;
  rating: number;
  title?: string;
  content?: string;
  is_verified_purchase?: boolean;
  helpful_count?: number;
  review_images?: string[];
  created_at: string;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: number[];
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, productName }) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful'>('newest');
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadReviews();
    loadSummary();
  }, [productId]);

  const loadReviews = async () => {
    try {
      const reviewsData = await getProductReviews(productId);
      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await getReviewSummary(productId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading review summary:', error);
    }
  };

  const handleReviewSubmitted = () => {
    loadReviews();
    loadSummary();
  };

  const handleHelpful = async (reviewId: string, isHelpful: boolean) => {
    try {
      await markReviewHelpful(reviewId, isHelpful);
      loadReviews(); // Refresh to show updated helpful counts
      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps other customers."
      });
    } catch (error) {
      console.error('Error marking review helpful:', error);
      toast({
        title: "Error",
        description: "Failed to record your feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const sortedAndFilteredReviews = React.useMemo(() => {
    let filtered = reviews;
    
    if (filterRating) {
      filtered = filtered.filter(review => review.rating === filterRating);
    }

    switch (sortBy) {
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'highest':
        return filtered.sort((a, b) => b.rating - a.rating);
      case 'lowest':
        return filtered.sort((a, b) => a.rating - b.rating);
      case 'helpful':
        return filtered.sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
      default:
        return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [reviews, sortBy, filterRating]);

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const starSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${starSize} ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        ))}
      </div>
    );
  };

  const renderRatingBreakdown = () => {
    if (!summary) return null;

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => {
          const count = summary.ratingBreakdown[rating - 1] || 0;
          const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                className={`flex items-center gap-1 hover:underline ${
                  filterRating === rating ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}
              >
                <span>{rating}</span>
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              </button>
              <Progress value={percentage} className="flex-1 h-2" />
              <span className="text-muted-foreground w-8 text-right">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4" />
            <div className="h-20 bg-muted rounded" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Customer Reviews
              <Button onClick={() => setShowWriteReview(true)}>
                Write a Review
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Overall Rating */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">{summary.averageRating.toFixed(1)}</span>
                  {renderStars(Math.round(summary.averageRating), 'md')}
                </div>
                <p className="text-muted-foreground">
                  Based on {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Rating Breakdown */}
              <div>
                <h4 className="font-medium mb-3">Rating breakdown</h4>
                {renderRatingBreakdown()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sort */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="highest">Highest Rating</option>
            <option value="lowest">Lowest Rating</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>

        {filterRating && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterRating(null)}>
            {filterRating} star reviews ✕
          </Badge>
        )}
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {sortedAndFilteredReviews.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">
                {filterRating ? `No ${filterRating}-star reviews found.` : 'No reviews yet. Be the first to review this product!'}
              </p>
              {!filterRating && (
                <Button onClick={() => setShowWriteReview(true)} className="mt-4">
                  Write the First Review
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          sortedAndFilteredReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{review.reviewer_name}</span>
                        <span>•</span>
                        <span>{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Review Title */}
                  {review.title && (
                    <h4 className="font-semibold">{review.title}</h4>
                  )}

                  {/* Review Content */}
                  {review.content && (
                    <p className="text-muted-foreground leading-relaxed">{review.content}</p>
                  )}

                  {/* Review Images */}
                  {review.review_images && review.review_images.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {review.review_images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Review image ${index + 1}`}
                          className="h-20 w-20 object-cover rounded border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(image, '_blank')}
                        />
                      ))}
                    </div>
                  )}

                  {/* Helpfulness */}
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        Was this review helpful?
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHelpful(review.id, true)}
                          className="h-8"
                        >
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          Yes
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleHelpful(review.id, false)}
                          className="h-8"
                        >
                          <ThumbsDown className="h-3 w-3 mr-1" />
                          No
                        </Button>
                      </div>
                    </div>
                    
                    {review.helpful_count && review.helpful_count > 0 && (
                      <span className="text-sm text-muted-foreground">
                        {review.helpful_count} people found this helpful
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Write Review Modal */}
      {showWriteReview && (
        <WriteReviewForm
          productId={productId}
          productName={productName}
          onReviewSubmitted={handleReviewSubmitted}
        />
      )}
    </div>
  );
};

export default ProductReviews;