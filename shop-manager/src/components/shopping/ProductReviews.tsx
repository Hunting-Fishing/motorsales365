import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  ThumbsUp, 
  ThumbsDown, 
  MessageSquare, 
  User,
  MoreHorizontal,
  Flag
} from 'lucide-react';
import { 
  getProductReviews, 
  getReviewSummary, 
  markReviewHelpful,
  getUserReviewHelpfulness,
  ProductReview 
} from '@/services/productReviewService';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface ProductReviewsProps {
  productId: string;
  onWriteReview?: () => void;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: number[];
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, onWriteReview }) => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [helpfulnessStates, setHelpfulnessStates] = useState<Record<string, boolean | null>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
    fetchReviewSummary();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const data = await getProductReviews(productId);
        // Map database fields to component interface
        const mappedReviews = data.map(review => ({
          ...review,
          reviewer_name: 'Anonymous', // Default since field doesn't exist yet
          title: review.review_title,
          content: review.review_text,
          helpful_count: review.helpful_votes || 0
        }));
        setReviews(mappedReviews);
      
      // Fetch helpfulness states for authenticated users
      if (user) {
        const helpfulnessPromises = data.map(review => 
          getUserReviewHelpfulness(review.id!)
        );
        const helpfulnessResults = await Promise.all(helpfulnessPromises);
        const helpfulnessMap: Record<string, boolean | null> = {};
        
        data.forEach((review, index) => {
          helpfulnessMap[review.id!] = helpfulnessResults[index];
        });
        
        setHelpfulnessStates(helpfulnessMap);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const fetchReviewSummary = async () => {
    try {
      const summaryData = await getReviewSummary(productId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error fetching review summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHelpfulness = async (reviewId: string, isHelpful: boolean) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to mark reviews as helpful.",
        variant: "destructive"
      });
      return;
    }

    try {
      await markReviewHelpful(reviewId, isHelpful);
      setHelpfulnessStates(prev => ({ ...prev, [reviewId]: isHelpful }));
      
      // Update the helpful count in the reviews state
      setReviews(prev => prev.map(review => 
        review.id === reviewId 
          ? { 
              ...review, 
              helpful_count: (review.helpful_count || 0) + (isHelpful ? 1 : -1) 
            }
          : review
      ));

      toast({
        title: "Thank you for your feedback",
        description: "Your feedback helps other customers make informed decisions."
      });
    } catch (error) {
      console.error('Error marking review helpful:', error);
      toast({
        title: "Error",
        description: "Failed to submit your feedback. Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderStars = (rating: number, size: string = "h-4 w-4") => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`${size} ${
              star <= rating 
                ? "fill-yellow-400 text-yellow-400" 
                : "text-muted-foreground"
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
        {[5, 4, 3, 2, 1].map(rating => {
          const count = summary.ratingBreakdown[rating - 1];
          const percentage = summary.totalReviews > 0 ? (count / summary.totalReviews) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center gap-2 text-sm">
              <span className="w-8">{rating}</span>
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="w-8 text-right text-muted-foreground">{count}</span>
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
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Review Summary */}
      {summary && summary.totalReviews > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Customer Reviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold">{summary.averageRating}</div>
                <div className="flex justify-center mb-1">
                  {renderStars(Math.round(summary.averageRating))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Based on {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
                </div>
              </div>
              <div className="flex-1">
                {renderRatingBreakdown()}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={onWriteReview} variant="outline">
                Write a Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share your experience with this product.
              </p>
              <Button onClick={onWriteReview}>Write the First Review</Button>
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="bg-muted rounded-full p-2">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{review.reviewer_name}</span>
                        {review.is_verified_purchase && (
                          <Badge variant="secondary" className="text-xs">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(review.created_at!), { addSuffix: true })}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Flag className="h-4 w-4 mr-2" />
                              Report Review
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {renderStars(review.rating)}
                      <span className="text-sm text-muted-foreground">
                        {review.rating} out of 5 stars
                      </span>
                    </div>
                    
                    {review.title && (
                      <h4 className="font-medium">{review.title}</h4>
                    )}
                    
                    {review.content && (
                      <p className="text-muted-foreground">{review.content}</p>
                    )}
                    
                    {review.review_images && review.review_images.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {review.review_images.map((image, index) => (
                          <img
                            key={index}
                            src={image}
                            alt={`Review image ${index + 1}`}
                            className="h-20 w-20 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHelpfulness(review.id!, true)}
                          className={
                            helpfulnessStates[review.id!] === true 
                              ? "text-green-600" 
                              : ""
                          }
                        >
                          <ThumbsUp className="h-4 w-4 mr-1" />
                          Helpful ({review.helpful_count || 0})
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHelpfulness(review.id!, false)}
                          className={
                            helpfulnessStates[review.id!] === false 
                              ? "text-red-600" 
                              : ""
                          }
                        >
                          <ThumbsDown className="h-4 w-4 mr-1" />
                          Not Helpful
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default ProductReviews;