import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Filter, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { HelpArticleEditor } from './HelpArticleEditor';

interface Article {
  id: string;
  title: string;
  category: string;
  status: string;
  featured: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  view_count: number;
  helpful_count: number;
  tags: string[];
}

export function HelpAdminPanel() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingArticle, setEditingArticle] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteArticle = async (articleId: string) => {
    try {
      const { error } = await supabase
        .from('help_articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Article deleted successfully",
      });

      loadArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      toast({
        title: "Error",
        description: "Failed to delete article",
        variant: "destructive",
      });
    }
  };

  const toggleArticleStatus = async (articleId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('help_articles')
        .update({ status: newStatus })
        .eq('id', articleId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Article ${newStatus} successfully`,
      });

      loadArticles();
    } catch (error) {
      console.error('Error updating article status:', error);
      toast({
        title: "Error",
        description: "Failed to update article status",
        variant: "destructive",
      });
    }
  };

  const exportArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*');

      if (error) throw error;

      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `help-articles-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Articles exported successfully",
      });
    } catch (error) {
      console.error('Error exporting articles:', error);
      toast({
        title: "Error",
        description: "Failed to export articles",
        variant: "destructive",
      });
    }
  };

  const filteredArticles = articles.filter(article => {
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || article.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || article.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'secondary';
      case 'archived': return 'destructive';
      default: return 'secondary';
    }
  };

  const categories = [...new Set(articles.map(a => a.category))];

  if (editingArticle) {
    return (
      <HelpArticleEditor
        articleId={editingArticle}
        onSave={() => {
          setEditingArticle(null);
          loadArticles();
        }}
        onCancel={() => setEditingArticle(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold">Help Articles Management</h2>
          <p className="text-muted-foreground">Create and manage help center content</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportArticles}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Article
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Articles Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <h3 className="text-lg font-medium mb-2">No articles found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first help article to get started'
              }
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredArticles.map((article) => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusColor(article.status) as any}>
                      {article.status}
                    </Badge>
                    {article.featured && (
                      <Badge variant="outline">Featured</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `/help?id=${article.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingArticle(article.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Article</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{article.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteArticle(article.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardTitle className="text-lg leading-tight">{article.title}</CardTitle>
                <CardDescription>
                  Category: {article.category}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1">
                    {article.tags.slice(0, 3).map((tag) => (
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
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{article.view_count || 0} views</span>
                    <span>{article.helpful_count || 0} helpful</span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Updated {new Date(article.updated_at).toLocaleDateString()}
                  </div>

                  <div className="flex gap-2">
                    {article.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => toggleArticleStatus(article.id, 'published')}
                      >
                        Publish
                      </Button>
                    )}
                    {article.status === 'published' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleArticleStatus(article.id, 'archived')}
                      >
                        Archive
                      </Button>
                    )}
                    {article.status === 'archived' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleArticleStatus(article.id, 'draft')}
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Article Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Article</DialogTitle>
          </DialogHeader>
          <HelpArticleEditor
            onSave={() => {
              setIsCreateModalOpen(false);
              loadArticles();
            }}
            onCancel={() => setIsCreateModalOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}