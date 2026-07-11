import React, { useState } from 'react';
import { BookOpen, Video, FileText, Star, Clock, Users, Download, ExternalLink, Filter, SortAsc, Grid, List, Search, PlayCircle, Award, TrendingUp, Code, Zap, Wrench, Shield, Rocket, Package, DollarSign, BarChart3, Heart, AlertCircle, Settings, Smartphone, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useHelpCategories, useHelpArticles, useHelpLearningPaths, useHelpResources } from '@/hooks/useHelp';

// Helper function to get category icon based on name
const getCategoryIconByName = (categoryName: string) => {
  switch (categoryName.toLowerCase()) {
    case 'getting started':
      return <Rocket className="h-4 w-4" />;
    case 'work orders':
      return <Wrench className="h-4 w-4" />;
    case 'customer management':
      return <Users className="h-4 w-4" />;
    case 'inventory management':
      return <Package className="h-4 w-4" />;
    case 'financial management':
      return <DollarSign className="h-4 w-4" />;
    case 'reporting & analytics':
      return <BarChart3 className="h-4 w-4" />;
    case 'integrations':
      return <Zap className="h-4 w-4" />;
    case 'mobile & remote':
      return <Smartphone className="h-4 w-4" />;
    case 'security & compliance':
      return <Shield className="h-4 w-4" />;
    case 'nonprofit features':
      return <Heart className="h-4 w-4" />;
    case 'troubleshooting':
      return <AlertCircle className="h-4 w-4" />;
    case 'advanced features':
      return <Settings className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return 'default';
    case 'intermediate':
      return 'secondary';
    case 'advanced':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getResourceTypeIcon = (type: string) => {
  switch (type) {
    case 'template':
      return <FileText className="h-4 w-4" />;
    case 'tool':
      return <Wrench className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'document':
      return <FileText className="h-4 w-4" />;
    case 'calculator':
      return <BarChart3 className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

export const HelpContentLibrary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'date' | 'popularity' | 'rating'>('date');

  // Fetch data from database
  const { data: categories = [], isLoading: categoriesLoading } = useHelpCategories();
  const { data: articles = [], isLoading: articlesLoading } = useHelpArticles(
    selectedCategory === 'all' ? undefined : selectedCategory
  );
  const { data: learningPaths = [], isLoading: pathsLoading } = useHelpLearningPaths();
  const { data: resources = [], isLoading: resourcesLoading } = useHelpResources(
    selectedCategory === 'all' ? undefined : selectedCategory
  );

  // Filter and search logic
  const filteredArticles = articles.filter(article => {
    const matchesDifficulty = selectedDifficulty === 'all' || article.difficulty_level === selectedDifficulty;
    const matchesSearch = searchQuery === '' || 
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (article.tags && article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())));
    
    return matchesDifficulty && matchesSearch;
  });

  // Sort articles
  const sortedArticles = [...filteredArticles].sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return (b.view_count || 0) - (a.view_count || 0);
      case 'rating':
        return ((b as any).rating || 0) - ((a as any).rating || 0);
      case 'date':
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const difficulties = [
    { id: 'all', label: 'All Levels' },
    { id: 'beginner', label: 'Beginner' },
    { id: 'intermediate', label: 'Intermediate' },
    { id: 'advanced', label: 'Advanced' }
  ];

  const renderArticleCard = (article: any) => (
    <Card 
      key={article.id} 
      className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
      onClick={() => window.location.href = `/help/article/${article.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {article.help_categories && getCategoryIconByName(article.help_categories.name)}
            <Badge variant="outline" className="text-xs">
              {article.help_categories?.name || 'General'}
            </Badge>
            {article.is_featured && (
              <Badge variant="secondary" className="text-xs">
                Featured
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getDifficultyColor(article.difficulty_level) as any} className="text-xs">
              {article.difficulty_level}
            </Badge>
          </div>
        </div>
        <CardTitle className="text-lg leading-tight">{article.title}</CardTitle>
        <CardDescription className="line-clamp-2">
          {article.content.substring(0, 150)}...
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.estimated_read_time || 5} min
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {(article.view_count || 0).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {(article as any).rating || 4.5}
          </div>
        </div>
        
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {article.tags.slice(0, 3).map((tag: string) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {article.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{article.tags.length - 3} more
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Updated {new Date(article.updated_at).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            {article.video_url && (
              <PlayCircle className="h-3 w-3 text-muted-foreground" />
            )}
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderLearningPathCard = (path: any) => (
    <Card key={path.id} className="cursor-pointer transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            {path.target_role}
          </Badge>
          <Badge variant={getDifficultyColor(path.difficulty_level) as any} className="text-xs">
            {path.difficulty_level}
          </Badge>
        </div>
        <CardTitle className="text-lg">{path.title}</CardTitle>
        <CardDescription>{path.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>{path.articles?.length || 0} articles</span>
            <span>{path.estimated_duration}</span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span>Completion Rate</span>
              <span>75%</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderResourceCard = (resource: any) => (
    <Card key={resource.id} className="cursor-pointer transition-all duration-200 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getResourceTypeIcon(resource.resource_type)}
            <Badge variant="outline" className="text-xs">
              {resource.resource_type}
            </Badge>
          </div>
          <Badge variant="secondary" className="text-xs">
            {resource.help_categories?.name || 'General'}
          </Badge>
        </div>
        <CardTitle className="text-lg">{resource.title}</CardTitle>
        <CardDescription>{resource.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
          <span>Resource</span>
          <span>{resource.download_count.toLocaleString()} downloads</span>
        </div>
        <Button 
          className="w-full" 
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            if (resource.download_url) {
              window.open(resource.download_url, '_blank');
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </CardContent>
    </Card>
  );

  const isLoading = categoriesLoading || articlesLoading || pathsLoading || resourcesLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 w-24 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Articles ({articles.length})
          </TabsTrigger>
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Learning Paths ({learningPaths.length})
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Resources ({resources.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6 mt-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search articles, tags, or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((difficulty) => (
                      <SelectItem key={difficulty.id} value={difficulty.id}>
                        {difficulty.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Latest</SelectItem>
                    <SelectItem value="popularity">Popular</SelectItem>
                    <SelectItem value="rating">Rating</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center border rounded-md">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-r-none"
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedCategory('all')}
                className="h-auto py-2 px-4"
                size="sm"
              >
                All Content
                <Badge variant="secondary" className="ml-2">
                  {articles.length}
                </Badge>
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(category.id)}
                  className="h-auto py-2 px-4"
                  size="sm"
                >
                  <div className="flex items-center gap-2">
                    {getCategoryIconByName(category.name)}
                    {category.name}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Articles Grid */}
          <div className={viewMode === 'grid' ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
            {sortedArticles.map(renderArticleCard)}
          </div>

          {sortedArticles.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No articles found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="paths" className="space-y-6 mt-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Structured Learning Paths</h3>
            <p className="text-muted-foreground mb-6">
              Follow curated learning paths designed to take you from beginner to expert in specific areas.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {learningPaths.map(renderLearningPathCard)}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6 mt-6">
          <div>
            <h3 className="text-xl font-semibold mb-4">Downloadable Resources</h3>
            <p className="text-muted-foreground mb-6">
              Templates, checklists, calculators, and other tools to help you succeed.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resources.map(renderResourceCard)}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};