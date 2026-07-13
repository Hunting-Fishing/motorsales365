import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Eye, 
  Star, 
  Search, 
  Filter,
  ArrowRight,
  BookOpen
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  summary: string;
  difficulty_level: string;
  estimated_read_time: number;
  view_count: number;
  helpful_count: number;
  is_featured: boolean;
  tags: string[];
  created_at: string;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
}

interface CategoryArticlesListProps {
  onArticleSelect: (articleId: string) => void;
}

export const CategoryArticlesList: React.FC<CategoryArticlesListProps> = ({ 
  onArticleSelect 
}) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCategoriesAndArticles();
  }, []);

  useEffect(() => {
    filterArticles();
  }, [articles, selectedCategory, searchTerm, difficultyFilter]);

  const fetchCategoriesAndArticles = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('help_categories' as any)
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesError) throw categoriesError;

      // Fetch all articles
      const { data: articlesData, error: articlesError } = await supabase
        .from('help_articles' as any)
        .select(`
          id, title, summary, difficulty_level, estimated_read_time,
          view_count, helpful_count, is_featured, tags, created_at, category_id
        `)
        .eq('status', 'published')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (articlesError) throw articlesError;

      // Transform articles data
      const transformedArticles = (articlesData as any)?.map((article: any) => ({
        ...article,
        tags: Array.isArray(article.tags) ? article.tags : []
      })) || [];

      setCategories((categoriesData as any) || []);
      setArticles(transformedArticles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load help content",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = articles;

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(article => article.category_id === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      filtered = filtered.filter(article => article.difficulty_level === difficultyFilter);
    }

    setFilteredArticles(filtered);
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

  const getCategoryArticleCount = (categoryId: string) => {
    return articles.filter(article => article.category_id === categoryId).length;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Help Articles</h2>
        <p className="text-muted-foreground">
          Browse our comprehensive knowledge base by category or search for specific topics.
        </p>
      </div>

      {/* Categories Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Browse by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md hover-scale ${
              !selectedCategory ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedCategory(null)}
          >
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-primary" />
              <h4 className="font-semibold">All Articles</h4>
              <p className="text-sm text-muted-foreground">{articles.length} articles</p>
            </CardContent>
          </Card>
          
          {categories.map((category) => (
            <Card
              key={category.id}
              className={`cursor-pointer transition-all hover:shadow-md hover-scale ${
                selectedCategory === category.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <CardContent className="p-4 text-center">
                <div 
                  className="h-8 w-8 mx-auto mb-2 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20', color: category.color }}
                >
                  <span className="text-sm font-bold">{category.icon?.charAt(0) || '📖'}</span>
                </div>
                <h4 className="font-semibold mb-1">{category.name}</h4>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {category.description}
                </p>
                <p className="text-sm text-muted-foreground">
                  {getCategoryArticleCount(category.id)} articles
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value="all">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''}
          {selectedCategory && (
            <span> in {categories.find(c => c.id === selectedCategory)?.name}</span>
          )}
        </p>
        
        {(selectedCategory || searchTerm || difficultyFilter !== 'all') && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSelectedCategory(null);
              setSearchTerm('');
              setDifficultyFilter('all');
            }}
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Articles List */}
      <div className="space-y-4">
        {filteredArticles.map((article) => (
          <Card 
            key={article.id} 
            className="cursor-pointer hover:shadow-md transition-shadow hover-scale"
            onClick={() => navigate(`/help/article/${article.id}`)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {article.is_featured && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={getDifficultyColor(article.difficulty_level)}
                    >
                      {article.difficulty_level}
                    </Badge>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-2 story-link">
                    {article.title}
                  </h3>
                  
                  <p className="text-muted-foreground mb-3 line-clamp-2">
                    {article.summary}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {article.estimated_read_time} min
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {article.view_count} views
                    </div>
                    <div className="flex items-center gap-1">
                      👍 {article.helpful_count} helpful
                    </div>
                  </div>
                  
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {article.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {article.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{article.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                
                <ArrowRight className="h-5 w-5 text-muted-foreground ml-4 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredArticles.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Articles Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory || difficultyFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Articles will appear here when available.'
              }
            </p>
            {(selectedCategory || searchTerm || difficultyFilter !== 'all') && (
              <Button 
                variant="outline"
                onClick={() => {
                  setSelectedCategory(null);
                  setSearchTerm('');
                  setDifficultyFilter('all');
                }}
              >
                Show All Articles
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};