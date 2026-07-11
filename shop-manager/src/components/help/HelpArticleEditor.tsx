import React, { useState, useEffect } from 'react';
import { Save, Eye, ArrowLeft, Plus, Trash2, Tag, Upload, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeHTML } from '@/components/ui/SafeHTML';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HelpArticle {
  id?: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  search_keywords: string[];
  author_id: string;
  slug: string;
}

interface HelpArticleEditorProps {
  articleId?: string;
  onSave?: () => void;
  onCancel?: () => void;
}

const CATEGORIES = [
  'tutorial',
  'guide', 
  'faq',
  'video',
  'troubleshooting',
  'getting-started',
  'advanced'
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' }
];

export function HelpArticleEditor({ articleId, onSave, onCancel }: HelpArticleEditorProps) {
  const [article, setArticle] = useState<HelpArticle>({
    title: '',
    content: '',
    category: 'tutorial',
    tags: [],
    status: 'draft',
    featured: false,
    search_keywords: [],
    author_id: '',
    slug: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (articleId) {
      loadArticle();
    } else {
      // Initialize with current user as author
      initializeNewArticle();
    }
  }, [articleId]);

  const initializeNewArticle = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setArticle(prev => ({
          ...prev,
          author_id: user.id
        }));
      }
    } catch (error) {
      console.error('Error initializing article:', error);
    }
  };

  const loadArticle = async () => {
    if (!articleId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('help_articles')
        .select('*')
        .eq('id', articleId)
        .single();

      if (error) throw error;
      
      setArticle({
        id: data.id,
        title: data.title,
        content: data.content,
        category: data.category,
        subcategory: data.subcategory,
        tags: data.tags || [],
        status: data.status as 'draft' | 'published' | 'archived',
        featured: data.featured || false,
        search_keywords: data.search_keywords || [],
        author_id: data.author_id,
        slug: data.slug
      });
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

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
  };

  const handleTitleChange = (title: string) => {
    setArticle(prev => ({
      ...prev,
      title,
      slug: generateSlug(title)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !article.tags.includes(newTag.trim())) {
      setArticle(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setArticle(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !article.search_keywords.includes(newKeyword.trim())) {
      setArticle(prev => ({
        ...prev,
        search_keywords: [...prev.search_keywords, newKeyword.trim()]
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    setArticle(prev => ({
      ...prev,
      search_keywords: prev.search_keywords.filter(keyword => keyword !== keywordToRemove)
    }));
  };

  const handleSave = async () => {
    if (!article.title.trim() || !article.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const articleData = {
        ...article,
        last_updated_by: user.id,
        updated_at: new Date().toISOString()
      };

      if (articleId) {
        // Update existing article
        const { error } = await supabase
          .from('help_articles')
          .update(articleData)
          .eq('id', articleId);

        if (error) throw error;
      } else {
        // Create new article
        const { error } = await supabase
          .from('help_articles')
          .insert({
            ...articleData,
            author_id: user.id
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Article ${articleId ? 'updated' : 'created'} successfully`,
      });

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving article:', error);
      toast({
        title: "Error",
        description: "Failed to save article",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setArticle(prev => ({ ...prev, status: 'published' }));
    await handleSave();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse"></div>
        <div className="h-64 bg-muted rounded animate-pulse"></div>
        <div className="h-32 bg-muted rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold">
              {articleId ? 'Edit Article' : 'Create New Article'}
            </h1>
            <p className="text-muted-foreground">
              {articleId ? 'Update help content' : 'Add new help content to the library'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewMode(!previewMode)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          {article.status !== 'published' && (
            <Button onClick={handlePublish} disabled={isSaving}>
              Publish
            </Button>
          )}
        </div>
      </div>

      {previewMode ? (
        // Preview Mode
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{article.category}</Badge>
              {article.featured && <Badge variant="default">Featured</Badge>}
            </div>
            <CardTitle className="text-2xl">{article.title}</CardTitle>
            <div className="flex flex-wrap gap-1">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <SafeHTML 
              html={article.content.replace(/\n/g, '<br>')}
              className="prose prose-sm max-w-none"
            />
          </CardContent>
        </Card>
      ) : (
        // Edit Mode
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="seo">SEO & Search</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Article Content</CardTitle>
                <CardDescription>Create engaging and helpful content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={article.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Enter article title..."
                    required
                  />
                  {article.slug && (
                    <p className="text-xs text-muted-foreground mt-1">
                      URL: /help?id={article.slug}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={article.content}
                    onChange={(e) => setArticle(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Write your article content here... You can use HTML for formatting."
                    rows={20}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    HTML formatting is supported. Use proper headings, lists, and links for better readability.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Article Metadata</CardTitle>
                <CardDescription>Configure article settings and categorization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={article.category} onValueChange={(value) => setArticle(prev => ({ ...prev, category: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={article.status} onValueChange={(value: any) => setArticle(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="subcategory">Subcategory (Optional)</Label>
                  <Input
                    id="subcategory"
                    value={article.subcategory || ''}
                    onChange={(e) => setArticle(prev => ({ ...prev, subcategory: e.target.value }))}
                    placeholder="Enter subcategory..."
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={article.featured}
                    onCheckedChange={(checked) => setArticle(prev => ({ ...prev, featured: checked }))}
                  />
                  <Label htmlFor="featured">Featured Article</Label>
                  <p className="text-xs text-muted-foreground">Featured articles appear in recommendations</p>
                </div>

                <div>
                  <Label>Tags</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add a tag..."
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button onClick={() => removeTag(tag)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SEO & Search Optimization</CardTitle>
                <CardDescription>Improve discoverability with search keywords</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Search Keywords</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add search keyword..."
                      onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    />
                    <Button onClick={addKeyword} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {article.search_keywords.map((keyword) => (
                      <Badge key={keyword} variant="outline" className="flex items-center gap-1">
                        {keyword}
                        <button onClick={() => removeKeyword(keyword)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Keywords help users find this article when searching. Include terms they might use.
                  </p>
                </div>

                <div>
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={article.slug}
                    onChange={(e) => setArticle(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="url-friendly-slug"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Auto-generated from title. Only use lowercase letters, numbers, and hyphens.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}