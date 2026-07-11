import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, ThumbsDown, Star, Clock, User, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SafeHTML } from '@/components/ui/SafeHTML';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  search_keywords: string[];
  author_id: string;
  created_at: string;
  updated_at: string;
  status: string;
  featured: boolean;
  helpful_count: number;
  last_updated_by: string;
  slug: string;
  subcategory?: string;
  tags: string[];
  view_count: number;
}

interface ArticleFeedback {
  id: string;
  article_id: string;
  user_id: string;
  feedback_text?: string;
  is_helpful: boolean;
  created_at: string;
}

export function HelpArticleViewer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [feedback, setFeedback] = useState<ArticleFeedback[]>([]);
  const [userFeedback, setUserFeedback] = useState<ArticleFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);
  const { toast } = useToast();

  const articleId = searchParams.get('id');

  useEffect(() => {
    if (articleId) {
      loadArticle();
      loadFeedback();
      recordView();
    }
  }, [articleId]);

  const loadArticle = async () => {
    if (!articleId) return;

    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('id', articleId)
        .eq('status', 'published')
        .single();

      if (error) throw error;
      setArticle(data);
    } catch (error) {
      console.error('Error loading article:', error);
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadFeedback = async () => {
    if (!articleId) return;

    try {
      const { data, error } = await supabase
        .from('help_article_feedback')
        .select('*')
        .eq('article_id', articleId);

      if (error) throw error;
      setFeedback(data);

      // Check if current user has provided feedback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userFeedbackItem = data.find(f => f.user_id === user.id);
        setUserFeedback(userFeedbackItem || null);
        if (userFeedbackItem) {
          setFeedbackText(userFeedbackItem.feedback_text || '');
        }
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
    }
  };

  const recordView = async () => {
    if (!articleId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase
        .from('help_article_views')
        .insert({
          article_id: articleId,
          user_id: user?.id,
          viewed_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const submitFeedback = async (isHelpful: boolean) => {
    if (!articleId) return;

    setIsSubmittingFeedback(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to provide feedback",
          variant: "destructive",
        });
        return;
      }

      const feedbackData = {
        article_id: articleId,
        user_id: user.id,
        feedback_text: feedbackText.trim() || null,
        is_helpful: isHelpful
      };

      if (userFeedback) {
        // Update existing feedback
        const { error } = await supabase
          .from('help_article_feedback')
          .update(feedbackData)
          .eq('id', userFeedback.id);

        if (error) throw error;
      } else {
        // Create new feedback
        const { error } = await supabase
          .from('help_article_feedback')
          .insert(feedbackData);

        if (error) throw error;
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });

      loadFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Article Not Found</h1>
        <p className="text-muted-foreground mb-4">The requested help article could not be found.</p>
        <Button onClick={() => setSearchParams({})}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Button>
      </div>
    );
  }

  const helpfulCount = feedback.filter(f => f.is_helpful).length;
  const totalFeedback = feedback.length;
  const helpfulPercentage = totalFeedback > 0 ? (helpfulCount / totalFeedback) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => setSearchParams({})}
          className="mb-4"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{article.category}</Badge>
                {article.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
              <CardTitle className="text-2xl">{article.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {article.author_id}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(article.updated_at).toLocaleDateString()}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <SafeHTML 
                html={article.content}
                className="prose prose-sm max-w-none"
              />
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Was this article helpful?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Button
                  variant={userFeedback?.is_helpful === true ? "default" : "outline"}
                  onClick={() => submitFeedback(true)}
                  disabled={isSubmittingFeedback}
                  className="flex items-center gap-2"
                >
                  <ThumbsUp className="h-4 w-4" />
                  Yes ({helpfulCount})
                </Button>
                <Button
                  variant={userFeedback?.is_helpful === false ? "default" : "outline"}
                  onClick={() => submitFeedback(false)}
                  disabled={isSubmittingFeedback}
                  className="flex items-center gap-2"
                >
                  <ThumbsDown className="h-4 w-4" />
                  No ({totalFeedback - helpfulCount})
                </Button>
                <span className="text-sm text-muted-foreground">
                  {helpfulPercentage.toFixed(0)}% found this helpful
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="rating" className="text-sm">Rate this article (optional)</Label>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-5 w-5 ${
                            star <= rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="feedback">Additional feedback (optional)</Label>
                  <Textarea
                    id="feedback"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Help us improve this article..."
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {(rating > 0 || feedbackText.trim()) && (
                  <Button
                    onClick={() => submitFeedback(userFeedback?.is_helpful ?? true)}
                    disabled={isSubmittingFeedback}
                    size="sm"
                  >
                    {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Article Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Helpfulness</span>
                <span className="text-sm font-medium">{helpfulPercentage.toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Feedback</span>
                <span className="text-sm font-medium">{totalFeedback}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Category</span>
                <span className="text-sm font-medium">{article.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm font-medium">
                  {new Date(article.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}