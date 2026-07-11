import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Package, 
  ShoppingBag, 
  Settings, 
  BarChart3,
  Plus,
  ExternalLink,
  Store,
  Trash2,
  Eye,
  ChevronRight,
  Pencil,
  AlertTriangle,
  History
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { SubmissionReviewDialog } from './SubmissionReviewDialog';
import { AddProductDialog } from './AddProductDialog';
import { PriceHistoryDialog } from './PriceHistoryDialog';
import { toast } from 'sonner';

interface ModuleDeveloperPageProps {
  moduleSlug: string;
  moduleName: string;
  moduleIcon: React.ReactNode;
  backRoute: string;
}

type ActiveSection = 'overview' | 'shopping' | 'submissions' | 'settings';

export function ModuleDeveloperPage({ 
  moduleSlug, 
  moduleName, 
  moduleIcon,
  backRoute 
}: ModuleDeveloperPageProps) {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');

  // Fetch product submissions for this module
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ['product-submissions', moduleSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_submissions')
        .select('*')
        .eq('module_id', moduleSlug)
        .order('submitted_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch product count for this module
  const { data: productCount = 0 } = useQuery({
    queryKey: ['module-product-count', moduleSlug],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', moduleSlug);
      
      if (error) throw error;
      return count || 0;
    },
  });

  const pendingSubmissions = submissions.filter(s => s.status === 'pending').length;
  const approvedSubmissions = submissions.filter(s => s.status === 'approved').length;

  const sectionNavItems = [
    { 
      id: 'overview' as const, 
      label: 'Overview', 
      icon: BarChart3, 
      description: 'Dashboard & analytics' 
    },
    { 
      id: 'shopping' as const, 
      label: 'Shopping', 
      icon: ShoppingBag, 
      description: 'Manage store products',
      badge: productCount > 0 ? `${productCount} products` : undefined
    },
    { 
      id: 'submissions' as const, 
      label: 'Submissions', 
      icon: Package, 
      description: 'User product suggestions',
      badge: pendingSubmissions > 0 ? `${pendingSubmissions} pending` : undefined
    },
    { 
      id: 'settings' as const, 
      label: 'Module Settings', 
      icon: Settings, 
      description: 'Configure module behavior' 
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate(backRoute)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              {moduleIcon}
              <div>
                <h1 className="text-2xl font-bold">{moduleName} Developer</h1>
                <p className="text-sm text-muted-foreground">
                  Configure and manage all aspects of the {moduleName} module
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Section Navigation Sidebar */}
        <div className="w-72 border-r bg-muted/30 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            {sectionNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-colors",
                  activeSection === item.id 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 mt-0.5 shrink-0",
                  activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground"
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant={activeSection === item.id ? "secondary" : "outline"} 
                        className="text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-xs mt-0.5",
                    activeSection === item.id ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  activeSection === item.id ? "text-primary-foreground" : "text-muted-foreground/50"
                )} />
              </button>
            ))}
          </nav>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {activeSection === 'overview' && (
            <OverviewSection 
              moduleName={moduleName}
              moduleSlug={moduleSlug}
              submissions={submissions}
              pendingSubmissions={pendingSubmissions}
              approvedSubmissions={approvedSubmissions}
            />
          )}
          {activeSection === 'shopping' && (
            <ShoppingSection moduleName={moduleName} moduleSlug={moduleSlug} />
          )}
          {activeSection === 'submissions' && (
            <SubmissionsSection 
              moduleName={moduleName}
              moduleSlug={moduleSlug}
              submissions={submissions}
              isLoading={submissionsLoading}
            />
          )}
          {activeSection === 'settings' && (
            <SettingsSection moduleName={moduleName} moduleSlug={moduleSlug} />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Section Component
function OverviewSection({ 
  moduleName,
  moduleSlug,
  submissions, 
  pendingSubmissions, 
  approvedSubmissions 
}: { 
  moduleName: string;
  moduleSlug: string;
  submissions: any[];
  pendingSubmissions: number;
  approvedSubmissions: number;
}) {
  // Fetch real product count
  const { data: productCount = 0 } = useQuery({
    queryKey: ['module-product-count', moduleSlug],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', moduleSlug);
      
      if (error) throw error;
      return count || 0;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Overview</h2>
        <p className="text-muted-foreground">Quick glance at {moduleName} developer metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Submissions</CardTitle>
            <Package className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedSubmissions}</div>
            <p className="text-xs text-muted-foreground">Converted to products</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store Products</CardTitle>
            <ShoppingBag className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productCount}</div>
            <p className="text-xs text-muted-foreground">Active in store</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates in the {moduleName} module</CardDescription>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No recent activity
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.slice(0, 5).map((submission) => (
                <div 
                  key={submission.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{submission.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={
                      submission.status === 'pending' ? 'secondary' :
                      submission.status === 'approved' ? 'default' : 'destructive'
                    }
                  >
                    {submission.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Shopping Section Component - Enhanced with category filter and improved styling
function ShoppingSection({ moduleName, moduleSlug }: { moduleName: string; moduleSlug: string }) {
  const queryClient = useQueryClient();
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<{ id: string; name: string } | null>(null);

  // Fetch products for this module with category data
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['module-products', moduleSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:product_categories(id, name, slug)')
        .eq('module_id', moduleSlug)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Get unique categories from products
  const categories = React.useMemo(() => {
    const categoryMap = new Map<string, { id: string; name: string; count: number }>();
    products.forEach((product: any) => {
      const catId = product.category?.id || 'uncategorized';
      const catName = product.category?.name || 'Uncategorized';
      const existing = categoryMap.get(catId);
      if (existing) {
        existing.count++;
      } else {
        categoryMap.set(catId, { id: catId, name: catName, count: 1 });
      }
    });
    return Array.from(categoryMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  // Filter products by selected category
  const filteredProducts = React.useMemo(() => {
    if (selectedCategory === 'all') return products;
    if (selectedCategory === 'uncategorized') {
      return products.filter((p: any) => !p.category_id);
    }
    return products.filter((p: any) => p.category?.id === selectedCategory);
  }, [products, selectedCategory]);

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
      
      if (error) throw error;
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['module-products', moduleSlug] });
      queryClient.invalidateQueries({ queryKey: ['module-product-count', moduleSlug] });
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setAddProductOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setAddProductOpen(open);
    if (!open) {
      setEditingProduct(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Store Products</h2>
          <p className="text-muted-foreground">
            Manage products for the {moduleName} store ({products.length} total)
          </p>
        </div>
        <Button onClick={() => setAddProductOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      {/* Category Filter Tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="gap-1.5"
          >
            All
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {products.length}
            </Badge>
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="gap-1.5"
            >
              {cat.name}
              <Badge 
                variant={selectedCategory === cat.id ? 'secondary' : 'outline'} 
                className="ml-1 h-5 px-1.5 text-xs"
              >
                {cat.count}
              </Badge>
            </Button>
          ))}
        </div>
      )}
      
      {productsLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="py-12 text-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <p className="text-muted-foreground mt-4">Loading products...</p>
            </div>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="py-12 text-center">
              <Store className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {selectedCategory === 'all' ? 'No Products Yet' : 'No Products in Category'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {selectedCategory === 'all' 
                  ? `Add products to your ${moduleName} store to start selling`
                  : 'Try selecting a different category or add new products'}
              </p>
              <Button onClick={() => setAddProductOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Product
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product: any) => (
            <Card 
              key={product.id} 
              className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50"
            >
              {/* Product Image */}
              <div className="relative aspect-video bg-muted overflow-hidden">
                {product.image_url ? (
                  <img 
                    src={product.image_url} 
                    alt={product.title || product.name} 
                    className="w-full h-full object-contain bg-white p-2 transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-2 left-2">
                  <Badge 
                    variant={product.is_approved ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {product.is_approved ? 'Approved' : 'Pending'}
                  </Badge>
                </div>
                {/* Quick Actions on Hover */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-8 w-8 shadow-md"
                    onClick={() => setPriceHistoryProduct({ 
                      id: product.id, 
                      name: product.title || product.name 
                    })}
                    title="View price history"
                  >
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="icon"
                    className="h-8 w-8 shadow-md"
                    onClick={() => handleEditProduct(product)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="icon"
                    className="h-8 w-8 shadow-md"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <CardContent className="p-4">
                {/* Title & Description */}
                <h4 className="font-semibold text-base line-clamp-1 mb-1">
                  {product.title || product.name}
                </h4>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 min-h-[2.5rem]">
                  {product.description || 'No description provided'}
                </p>

                {/* Price & Category Row */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {product.price != null ? (
                    <span className="text-lg font-bold text-primary">
                      ${product.price.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No price set</span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {product.category?.name || 'Uncategorized'}
                  </Badge>
                </div>

                {/* Affiliate Link */}
                {product.affiliate_link ? (
                  <a 
                    href={product.affiliate_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View affiliate link
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    No affiliate link set
                  </span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddProductDialog
        open={addProductOpen}
        onOpenChange={handleCloseDialog}
        moduleSlug={moduleSlug}
        editProduct={editingProduct}
      />

      <PriceHistoryDialog
        open={!!priceHistoryProduct}
        onOpenChange={(open) => !open && setPriceHistoryProduct(null)}
        productId={priceHistoryProduct?.id || ''}
        productName={priceHistoryProduct?.name || ''}
      />
    </div>
  );
}

// Submissions Section Component
function SubmissionsSection({ 
  moduleName, 
  moduleSlug,
  submissions, 
  isLoading 
}: { 
  moduleName: string;
  moduleSlug: string;
  submissions: any[];
  isLoading: boolean;
}) {
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('product_submissions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('Submission deleted');
      queryClient.invalidateQueries({ queryKey: ['product-submissions', moduleSlug] });
    } catch (error: any) {
      console.error('Error deleting submission:', error);
      toast.error(`Failed to delete: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleOpenReview = (submission: any) => {
    setSelectedSubmission(submission);
    setReviewDialogOpen(true);
  };

  const pendingCount = submissions.filter(s => s.status === 'pending').length;
  const approvedCount = submissions.filter(s => s.status === 'approved').length;
  const rejectedCount = submissions.filter(s => s.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Product Submissions</h2>
          <p className="text-muted-foreground">
            Review and manage user-submitted product suggestions for {moduleName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{pendingCount} Pending</Badge>
          <Badge variant="default">{approvedCount} Approved</Badge>
          <Badge variant="destructive">{rejectedCount} Rejected</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Submissions</h3>
              <p className="text-muted-foreground">
                Users can submit product suggestions from the {moduleName} store
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {submissions.map((submission) => (
                <div 
                  key={submission.id} 
                  className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{submission.product_name}</p>
                      <Badge variant="outline" className="text-xs">
                        {submission.suggested_category || 'Uncategorized'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {submission.notes?.startsWith('[REJECTED]') 
                        ? submission.notes.substring(0, 80) + '...'
                        : submission.notes || 'No additional notes'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(submission.submitted_at).toLocaleDateString()} at{' '}
                      {new Date(submission.submitted_at).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge 
                      variant={
                        submission.status === 'pending' ? 'secondary' :
                        submission.status === 'approved' ? 'default' : 'destructive'
                      }
                    >
                      {submission.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8"
                        onClick={() => handleOpenReview(submission)}
                        title="Review submission"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(submission.id)}
                        disabled={deletingId === submission.id}
                        title="Delete submission"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <SubmissionReviewDialog
        submission={selectedSubmission}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
        moduleSlug={moduleSlug}
      />
    </div>
  );
}

// Settings Section Component
function SettingsSection({ moduleName, moduleSlug }: { moduleName: string; moduleSlug: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Module Settings</h2>
        <p className="text-muted-foreground">
          Configure behavior and features for the {moduleName} module
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Store Configuration</CardTitle>
            <CardDescription>General store settings for {moduleName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Store</Label>
                <p className="text-xs text-muted-foreground">
                  Allow users to browse and purchase products
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Allow Product Submissions</Label>
                <p className="text-xs text-muted-foreground">
                  Users can suggest products to add to the store
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Affiliate Badges</Label>
                <p className="text-xs text-muted-foreground">
                  Display affiliate disclosure on products
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Module Features</CardTitle>
            <CardDescription>Enable or disable specific features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Product Reviews</Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to leave product reviews
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Wishlist</Label>
                <p className="text-xs text-muted-foreground">
                  Let users save products for later
                </p>
              </div>
              <Switch />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Price Alerts</Label>
                <p className="text-xs text-muted-foreground">
                  Notify users when prices drop
                </p>
              </div>
              <Switch />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Display Settings</CardTitle>
            <CardDescription>Customize how products appear</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="products-per-page">Products Per Page</Label>
              <Input id="products-per-page" type="number" defaultValue="12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="default-sort">Default Sort Order</Label>
              <Input id="default-sort" placeholder="Newest First" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
