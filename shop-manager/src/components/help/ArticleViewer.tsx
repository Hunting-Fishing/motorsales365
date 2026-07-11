import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Clock, 
  ThumbsUp, 
  ThumbsDown, 
  Share2, 
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eye,
  Tag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  difficulty_level: string;
  estimated_read_time: number;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  tags: string[];
  featured: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
}

interface ArticleViewerProps {
  articleId?: string;
  onClose?: () => void;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ 
  articleId: propArticleId, 
  onClose 
}) => {
  const { articleId: paramArticleId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const articleId = propArticleId || paramArticleId;
  const [article, setArticle] = useState<Article | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [userFeedback, setUserFeedback] = useState<'helpful' | 'not_helpful' | null>(null);

  useEffect(() => {
    if (articleId) {
      fetchArticle();
      incrementViewCount();
    }
  }, [articleId]);

  const fetchArticle = async () => {
    try {
      // Fetch main article
      const { data: articleData, error: articleError } = await supabase
        .from('help_articles' as any)
        .select(`
          *
        `)
        .eq('id', articleId)
        .eq('published', true)
        .single();

      if (articleError) throw articleError;
      
      if (!articleData) {
        setLoading(false);
        return;
      }

      // Fetch category separately
      let categoryData = null;
      if ((articleData as any).category_id) {
        const { data: catData, error: catError } = await supabase
          .from('help_categories' as any)
          .select('id, name, color, icon')
          .eq('id', (articleData as any).category_id)
          .single();
        
        if (!catError) {
          categoryData = catData;
        }
      }
      
      const transformedArticle = {
        ...(articleData as any),
        tags: Array.isArray((articleData as any).tags) ? (articleData as any).tags : [],
        category: categoryData
      };
      
      setArticle(transformedArticle);

      // Fetch related articles from same category
      if ((articleData as any).category_id) {
        const { data: relatedData, error: relatedError } = await supabase
          .from('help_articles' as any)
          .select('id, title, excerpt, difficulty_level, estimated_read_time')
          .eq('category_id', (articleData as any).category_id)
          .eq('published', true)
          .neq('id', articleId)
          .limit(3);

        if (!relatedError && relatedData) {
          setRelatedArticles(relatedData as any);
        }
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      toast({
        title: "Error",
        description: "Failed to load article",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const incrementViewCount = async () => {
    try {
      await supabase
        .from('help_articles' as any)
        .update({ 
          view_count: (article?.view_count || 0) + 1 
        })
        .eq('id', articleId);
    } catch (error) {
      console.error('Error incrementing view count:', error);
    }
  };

  const handleFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (!article || userFeedback) return;

    try {
      const field = type === 'helpful' ? 'helpful_count' : 'not_helpful_count';
      const currentCount = article[field] || 0;
      
      await supabase
        .from('help_articles' as any)
        .update({ [field]: currentCount + 1 })
        .eq('id', articleId);

      setUserFeedback(type);
      setArticle(prev => prev ? {
        ...prev,
        [field]: currentCount + 1
      } : null);

      toast({
        title: "Thank you!",
        description: "Your feedback helps us improve our documentation.",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: article?.title,
          text: article?.excerpt,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied",
          description: "Article link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatContent = (content: string) => {
    // Simple content formatting - in production you'd use a proper markdown/rich text renderer
    return content.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-4 text-muted-foreground leading-relaxed">
        {paragraph}
      </p>
    ));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-4 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">Article Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The article you're looking for doesn't exist or has been moved.
            </p>
            <Button onClick={() => navigate('/help')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Help Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onClose || (() => navigate('/help'))}
          className="hover-scale"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Button>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Bookmark className="h-4 w-4 mr-2" />
            Bookmark
          </Button>
        </div>
      </div>

      {/* Article Header */}
      <Card className="border-none shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {article.category && (
              <Badge 
                variant="outline" 
                className="px-3 py-1"
                style={{ borderColor: article.category.color, color: article.category.color }}
              >
                {article.category.name}
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={getDifficultyColor(article.difficulty_level)}
            >
              {article.difficulty_level}
            </Badge>
            {article.featured && (
              <Badge variant="default" className="bg-gradient-to-r from-yellow-400 to-orange-500">
                Featured
              </Badge>
            )}
          </div>
          
          <CardTitle className="text-2xl lg:text-3xl font-bold leading-tight mb-3">
            {article.title}
          </CardTitle>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {article.estimated_read_time} min read
            </div>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {article.view_count} views
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {article.helpful_count} helpful
            </div>
          </div>

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Article Content */}
      <Card>
        <CardContent className="prose prose-gray max-w-none p-8">
          <div className="text-lg leading-relaxed">
            {formatContent(article.content)}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Was this article helpful?</h3>
          <div className="flex gap-3">
            <Button
              variant={userFeedback === 'helpful' ? 'default' : 'outline'}
              onClick={() => handleFeedback('helpful')}
              disabled={!!userFeedback}
              className="hover-scale"
            >
              <ThumbsUp className="h-4 w-4 mr-2" />
              Yes ({article.helpful_count})
            </Button>
            <Button
              variant={userFeedback === 'not_helpful' ? 'default' : 'outline'}
              onClick={() => handleFeedback('not_helpful')}
              disabled={!!userFeedback}
              className="hover-scale"
            >
              <ThumbsDown className="h-4 w-4 mr-2" />
              No ({article.not_helpful_count})
            </Button>
          </div>
          {userFeedback && (
            <p className="text-sm text-muted-foreground mt-3 animate-fade-in">
              Thank you for your feedback!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Related Articles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {relatedArticles.map((related) => (
                <div
                  key={related.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer hover-scale"
                  onClick={() => navigate(`/help/article/${related.id}`)}
                >
                  <h4 className="font-semibold mb-2 story-link">{related.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {related.excerpt}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-xs">
                      {related.difficulty_level}
                    </Badge>
                    <span>{related.estimated_read_time} min</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};