import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Globe,
  Link2,
  Package,
  Pencil,
  Plus,
  Tags,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

type LinkType = 'web' | 'affiliate';

type GunsmithUsefulLink = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  link_type: LinkType;
  category?: string | null;
  is_active: boolean;
  sort_order: number;
};

type GunsmithLinkSuggestion = {
  id: string;
  title: string;
  url: string;
  description?: string | null;
  link_type: LinkType;
  category?: string | null;
  status: string;
  created_at: string;
};

export default function GunsmithUsefulLinks() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { userId, userRoles } = useAuthUser();
  const canManage = userRoles.includes('developer') || userRoles.includes('admin') || userRoles.includes('owner');
  const canReviewSuggestions = userRoles.includes('developer');
  const affiliateScriptContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = affiliateScriptContainerRef.current;
    if (!container) return;
    if (container.querySelector('script[data-avantlink="confirm"]')) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src =
      'https://classic.avantlink.com/affiliate_app_confirm.php?mode=js&authResponse=a90f3305d34906a4a71523b93d9a7d2eb3423e59';
    script.setAttribute('data-avantlink', 'confirm');
    container.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const { data: profile } = useQuery({
    queryKey: ['gunsmith-links-profile', userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${userId},user_id.eq.${userId}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const shopId = profile?.shop_id ?? null;

  const { data: links = [], isLoading: linksLoading } = useQuery({
    queryKey: ['gunsmith-useful-links', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await (supabase as any)
        .from('gunsmith_useful_links')
        .select('*')
        .eq('shop_id', shopId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GunsmithUsefulLink[];
    },
    enabled: !!shopId,
  });

  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery({
    queryKey: ['gunsmith-link-suggestions', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data, error } = await (supabase as any)
        .from('gunsmith_link_suggestions')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as GunsmithLinkSuggestion[];
    },
    enabled: !!shopId,
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [suggestionDialogOpen, setSuggestionDialogOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'title-asc' | 'title-desc'>('default');
  const [linkForm, setLinkForm] = useState({
    title: '',
    url: '',
    description: '',
    linkType: 'web' as LinkType,
    category: '',
    isActive: true,
    sortOrder: 0,
  });

  const [suggestionForm, setSuggestionForm] = useState({
    title: '',
    url: '',
    description: '',
  });

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalForm, setApprovalForm] = useState({
    suggestionId: '',
    title: '',
    url: '',
    description: '',
    linkType: 'affiliate' as LinkType,
    category: '',
    reviewNotes: '',
  });

  const resetLinkForm = () => {
    setEditingLinkId(null);
    setLinkForm({
      title: '',
      url: '',
      description: '',
      linkType: 'web',
      category: '',
      isActive: true,
      sortOrder: 0,
    });
  };

  const resetSuggestionForm = () => {
    setSuggestionForm({
      title: '',
      url: '',
      description: '',
    });
  };

  const saveLink = useMutation({
    mutationFn: async () => {
      if (!shopId) throw new Error('Shop not found');
      const payload = {
        title: linkForm.title.trim(),
        url: linkForm.url.trim(),
        description: linkForm.description.trim() || null,
        link_type: linkForm.linkType,
        category: linkForm.category.trim() || null,
        is_active: linkForm.isActive,
        sort_order: linkForm.sortOrder,
        shop_id: shopId,
      };

      if (editingLinkId) {
        const { error } = await (supabase as any)
          .from('gunsmith_useful_links')
          .update(payload)
          .eq('id', editingLinkId);
        if (error) throw error;
        return;
      }

      const { error } = await (supabase as any)
        .from('gunsmith_useful_links')
        .insert({
          ...payload,
          created_by: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-useful-links', shopId] });
      toast({ title: editingLinkId ? 'Link updated' : 'Link added' });
      setLinkDialogOpen(false);
      resetLinkForm();
    },
    onError: (error) => {
      toast({ title: 'Failed to save link', description: error.message, variant: 'destructive' });
    },
  });

  const deleteLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await (supabase as any)
        .from('gunsmith_useful_links')
        .delete()
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-useful-links', shopId] });
      toast({ title: 'Link removed' });
    },
    onError: (error) => {
      toast({ title: 'Failed to delete link', description: error.message, variant: 'destructive' });
    },
  });

  const submitSuggestion = useMutation({
    mutationFn: async () => {
      if (!shopId || !userId) throw new Error('Missing shop or user');
      const { error } = await (supabase as any)
        .from('gunsmith_link_suggestions')
        .insert({
          shop_id: shopId,
          title: suggestionForm.title.trim(),
          url: suggestionForm.url.trim(),
          description: suggestionForm.description.trim() || null,
          link_type: 'web',
          category: null,
          suggested_by: userId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-link-suggestions', shopId] });
      toast({ title: 'Suggestion submitted', description: 'We will review it shortly.' });
      resetSuggestionForm();
      setSuggestionDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Failed to submit suggestion', description: error.message, variant: 'destructive' });
    },
  });

  const approveSuggestion = useMutation({
    mutationFn: async () => {
      if (!shopId || !userId) throw new Error('Missing shop or user');
      const linkPayload = {
        shop_id: shopId,
        title: approvalForm.title.trim(),
        url: approvalForm.url.trim(),
        description: approvalForm.description.trim() || null,
        link_type: approvalForm.linkType,
        category: approvalForm.category.trim() || null,
        is_active: true,
        sort_order: 0,
        created_by: userId,
      };

      const { data: inserted, error: insertError } = await (supabase as any)
        .from('gunsmith_useful_links')
        .insert(linkPayload)
        .select('id')
        .single();
      if (insertError) throw insertError;

      const { error: updateError } = await (supabase as any)
        .from('gunsmith_link_suggestions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
          review_notes: approvalForm.reviewNotes.trim() || null,
          approved_link_id: inserted?.id ?? null,
        })
        .eq('id', approvalForm.suggestionId);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-useful-links', shopId] });
      queryClient.invalidateQueries({ queryKey: ['gunsmith-link-suggestions', shopId] });
      toast({ title: 'Suggestion approved' });
      setApprovalDialogOpen(false);
      setApprovalForm({
        suggestionId: '',
        title: '',
        url: '',
        description: '',
        linkType: 'affiliate',
        category: '',
        reviewNotes: '',
      });
    },
    onError: (error) => {
      toast({ title: 'Failed to approve suggestion', description: error.message, variant: 'destructive' });
    },
  });

  const rejectSuggestion = useMutation({
    mutationFn: async (suggestionId: string) => {
      if (!userId) throw new Error('Missing user');
      const { error } = await (supabase as any)
        .from('gunsmith_link_suggestions')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId,
        })
        .eq('id', suggestionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gunsmith-link-suggestions', shopId] });
      toast({ title: 'Suggestion rejected' });
    },
    onError: (error) => {
      toast({ title: 'Failed to reject suggestion', description: error.message, variant: 'destructive' });
    },
  });

  const webLinks = useMemo(() => {
    return links.filter((link) => link.link_type === 'web' && (canManage || link.is_active));
  }, [links, canManage]);

  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    links.forEach((link) => {
      if (link.category?.trim()) {
        categories.add(link.category.trim());
      } else {
        categories.add('Uncategorized');
      }
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }, [links]);

  const recommendedCategories = useMemo(() => {
    const recommendedLinks = links.filter(
      (link) => link.link_type === 'affiliate' && (canManage || link.is_active)
    );
    const categoryMap = new Map<string, GunsmithUsefulLink[]>();
    recommendedLinks.forEach((link) => {
      const category = link.category?.trim() || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)?.push(link);
    });

    const order = ['Tools', 'Safety', 'Compliance', 'Parts', 'Suppliers', 'Uncategorized'];
    return Array.from(categoryMap.entries())
      .map(([title, links]) => ({ title, links }))
      .sort((a, b) => {
        const aIndex = order.indexOf(a.title);
        const bIndex = order.indexOf(b.title);
        if (aIndex !== -1 || bIndex !== -1) {
          return (aIndex === -1 ? 99 : aIndex) - (bIndex === -1 ? 99 : bIndex);
        }
        return a.title.localeCompare(b.title);
      });
  }, [links, canManage]);

  const pendingSuggestions = useMemo(
    () => suggestions.filter((suggestion) => suggestion.status === 'pending'),
    [suggestions]
  );

  const formatUrlHost = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch (error) {
      return url;
    }
  };

  const matchesSearch = (link: GunsmithUsefulLink) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      link.title.toLowerCase().includes(term) ||
      link.url.toLowerCase().includes(term) ||
      (link.description || '').toLowerCase().includes(term) ||
      (link.category || '').toLowerCase().includes(term)
    );
  };

  const sortLinks = (items: GunsmithUsefulLink[]) => {
    if (sortBy === 'title-asc') {
      return [...items].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === 'title-desc') {
      return [...items].sort((a, b) => b.title.localeCompare(a.title));
    }
    return items;
  };

  const filteredWebLinks = useMemo(() => {
    const filtered = webLinks.filter((link) => {
      const category = link.category?.trim() || 'Uncategorized';
      const matchesCategory = categoryFilter === 'all' || category === categoryFilter;
      return matchesCategory && matchesSearch(link);
    });
    return sortLinks(filtered);
  }, [webLinks, categoryFilter, searchTerm, sortBy]);

  const filteredRecommendedCategories = useMemo(() => {
    return recommendedCategories
      .filter((category) => categoryFilter === 'all' || category.title === categoryFilter)
      .map((category) => ({
        ...category,
        links: sortLinks(category.links.filter((link) => matchesSearch(link))),
      }))
      .filter((category) => category.links.length > 0);
  }, [recommendedCategories, categoryFilter, searchTerm, sortBy]);

  const renderLinkGrid = (items: GunsmithUsefulLink[], type: 'web' | 'affiliate') => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No links yet</p>
          <p className="text-sm">Add your go-to resources here.</p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((link) => (
          <Card key={link.id} className="group overflow-hidden">
            <CardContent className="p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="h-12 w-12 rounded-xl bg-muted/60 flex items-center justify-center">
                  {type === 'web' ? (
                    <Globe className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <Package className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                {!link.is_active && <Badge variant="secondary">Inactive</Badge>}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{link.title}</p>
                  {link.category && <Badge variant="outline">{link.category}</Badge>}
                </div>
                {link.description && (
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                )}
                <p className="text-xs text-muted-foreground">{formatUrlHost(link.url)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Button size="sm" asChild>
                  <a href={link.url} target="_blank" rel="noreferrer">
                    Visit
                    <ExternalLink className="h-3 w-3 ml-2" />
                  </a>
                </Button>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingLinkId(link.id);
                        setLinkForm({
                          title: link.title,
                          url: link.url,
                          description: link.description || '',
                          linkType: link.link_type,
                          category: link.category || '',
                          isActive: link.is_active,
                          sortOrder: link.sort_order,
                        });
                        setLinkDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (window.confirm('Delete this link?')) {
                          deleteLink.mutate(link.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/gunsmith')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Link2 className="h-8 w-8 text-amber-600" />
            Gunsmith Resources
          </h1>
          <p className="text-muted-foreground mt-1">
            Curate resources and recommended tools for your gunsmith operation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canManage && (
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={() => resetLinkForm()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Link
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingLinkId ? 'Edit Link' : 'Add Link'}</DialogTitle>
                  <DialogDescription>Add a resource or product link.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="link-title">Title *</Label>
                    <Input
                      id="link-title"
                      value={linkForm.title}
                      onChange={(event) => setLinkForm({ ...linkForm, title: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="link-url">URL *</Label>
                    <Input
                      id="link-url"
                      value={linkForm.url}
                      onChange={(event) => setLinkForm({ ...linkForm, url: event.target.value })}
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <Label>Link Category</Label>
                    <Select
                      value={linkForm.linkType}
                      onValueChange={(value) =>
                        setLinkForm({ ...linkForm, linkType: value as LinkType })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="web">Web Resource</SelectItem>
                        <SelectItem value="affiliate">Product Link</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="link-category">Category</Label>
                    <Input
                      id="link-category"
                      value={linkForm.category}
                      onChange={(event) => setLinkForm({ ...linkForm, category: event.target.value })}
                      placeholder="Tools, Safety, Compliance"
                    />
                  </div>
                  <div>
                    <Label htmlFor="link-description">Description</Label>
                    <Textarea
                      id="link-description"
                      value={linkForm.description}
                      onChange={(event) => setLinkForm({ ...linkForm, description: event.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Status</Label>
                      <Select
                        value={linkForm.isActive ? 'active' : 'inactive'}
                        onValueChange={(value) =>
                          setLinkForm({ ...linkForm, isActive: value === 'active' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="link-order">Sort Order</Label>
                      <Input
                        id="link-order"
                        type="number"
                        value={linkForm.sortOrder}
                        onChange={(event) =>
                          setLinkForm({
                            ...linkForm,
                            sortOrder: Number(event.target.value || 0),
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => saveLink.mutate()}
                    disabled={!linkForm.title.trim() || !linkForm.url.trim() || saveLink.isPending}
                  >
                    {saveLink.isPending ? 'Saving...' : 'Save Link'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={suggestionDialogOpen} onOpenChange={setSuggestionDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Suggest a Link
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Suggest a Link</DialogTitle>
                <DialogDescription>
                  Share a resource or product that would help your team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="suggestion-title">Title *</Label>
                    <Input
                      id="suggestion-title"
                      value={suggestionForm.title}
                      onChange={(event) => setSuggestionForm({ ...suggestionForm, title: event.target.value })}
                      placeholder="Example: ATF Forms Portal"
                    />
                  </div>
                  <div>
                    <Label htmlFor="suggestion-url">Web URL *</Label>
                    <Input
                      id="suggestion-url"
                      value={suggestionForm.url}
                      onChange={(event) => setSuggestionForm({ ...suggestionForm, url: event.target.value })}
                      placeholder="https://"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="suggestion-description">Why is this useful?</Label>
                  <Textarea
                    id="suggestion-description"
                    value={suggestionForm.description}
                    onChange={(event) => setSuggestionForm({ ...suggestionForm, description: event.target.value })}
                    placeholder="Optional notes for the team"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={() => submitSuggestion.mutate()}
                  disabled={
                    !suggestionForm.title.trim() ||
                    !suggestionForm.url.trim() ||
                    submitSuggestion.isPending
                  }
                >
                  {submitSuggestion.isPending ? 'Submitting...' : 'Submit Suggestion'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div ref={affiliateScriptContainerRef} />

      <div className="space-y-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="flex-1">
                <Label htmlFor="link-search">Search</Label>
                <Input
                  id="link-search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search title, URL, or notes..."
                />
              </div>
              <div className="w-full lg:w-56">
                <Label>Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {allCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full lg:w-48">
                <Label>Sort</Label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Default order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="title-asc">Title A-Z</SelectItem>
                    <SelectItem value="title-desc">Title Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="web" className="space-y-6">
          <TabsList>
            <TabsTrigger value="web" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Web Links
            </TabsTrigger>
            <TabsTrigger value="recommended" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Recommended Picks
            </TabsTrigger>
            {canReviewSuggestions && (
              <TabsTrigger value="suggestions" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Suggestions
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="web">
            {linksLoading ? (
              <p className="text-sm text-muted-foreground">Loading links...</p>
            ) : (
              renderLinkGrid(filteredWebLinks, 'web')
            )}
          </TabsContent>

          <TabsContent value="recommended">
            {linksLoading ? (
              <Card>
                <CardContent className="py-8 text-sm text-muted-foreground">Loading links...</CardContent>
              </Card>
            ) : filteredRecommendedCategories.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Tags className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>No matching recommendations</p>
                  <p className="text-sm">Try adjusting your search or filters.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {filteredRecommendedCategories.map((category) => (
                  <div key={category.title} className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{category.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Curated picks for {category.title.toLowerCase()}.
                      </p>
                    </div>
                    {renderLinkGrid(category.links, 'affiliate')}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {canReviewSuggestions && (
            <TabsContent value="suggestions">
              <Card>
                <CardContent className="py-6">
                  {suggestionsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading suggestions...</p>
                  ) : pendingSuggestions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                      <p>No pending suggestions</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingSuggestions.map((suggestion) => (
                        <div
                          key={suggestion.id}
                          className="flex flex-col gap-3 rounded-lg border border-border p-4 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground">{suggestion.title}</p>
                              <Badge variant="outline">{suggestion.link_type}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{suggestion.url}</p>
                            {suggestion.description && (
                              <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                            )}
                            {suggestion.category && (
                              <p className="text-xs text-muted-foreground">Category: {suggestion.category}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => {
                                setApprovalForm({
                                  suggestionId: suggestion.id,
                                  title: suggestion.title,
                                  url: suggestion.url,
                                  description: suggestion.description || '',
                                  linkType: suggestion.link_type,
                                  category: suggestion.category || '',
                                  reviewNotes: '',
                                });
                                setApprovalDialogOpen(true);
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => rejectSuggestion.mutate(suggestion.id)}
                              disabled={rejectSuggestion.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        <Dialog open={approvalDialogOpen} onOpenChange={setApprovalDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Approve Suggestion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="approval-title">Title *</Label>
                <Input
                  id="approval-title"
                  value={approvalForm.title}
                  onChange={(event) => setApprovalForm({ ...approvalForm, title: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="approval-url">Destination URL *</Label>
                <Input
                  id="approval-url"
                  value={approvalForm.url}
                  onChange={(event) => setApprovalForm({ ...approvalForm, url: event.target.value })}
                  placeholder="https://"
                />
              </div>
              <div>
                <Label>Link Category</Label>
                <Select
                  value={approvalForm.linkType}
                  onValueChange={(value) => setApprovalForm({ ...approvalForm, linkType: value as LinkType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="web">Web Resource</SelectItem>
                    <SelectItem value="affiliate">Product Link</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {approvalForm.linkType === 'affiliate' && (
                <div>
                  <Label htmlFor="approval-category">Category</Label>
                  <Input
                    id="approval-category"
                    value={approvalForm.category}
                    onChange={(event) => setApprovalForm({ ...approvalForm, category: event.target.value })}
                    placeholder="Tools"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="approval-description">Description</Label>
                <Textarea
                  id="approval-description"
                  value={approvalForm.description}
                  onChange={(event) => setApprovalForm({ ...approvalForm, description: event.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="approval-notes">Review Notes</Label>
                <Textarea
                  id="approval-notes"
                  value={approvalForm.reviewNotes}
                  onChange={(event) => setApprovalForm({ ...approvalForm, reviewNotes: event.target.value })}
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setApprovalDialogOpen(false)}
                  disabled={approveSuggestion.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={() => approveSuggestion.mutate()}
                  disabled={!approvalForm.title.trim() || !approvalForm.url.trim() || approveSuggestion.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {approveSuggestion.isPending ? 'Approving...' : 'Approve'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
