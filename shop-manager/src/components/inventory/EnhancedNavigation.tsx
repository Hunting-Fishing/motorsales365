import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  ArrowRight, 
  Home, 
  Package, 
  BarChart3,
  Settings,
  Users,
  FileText,
  MapPin,
  Truck,
  ShoppingCart,
  Clock,
  TrendingUp,
  ScanLine
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface NavigationItem {
  id: string;
  title: string;
  path: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
  keywords: string[];
}

interface EnhancedNavigationProps {
  className?: string;
}

export function EnhancedNavigation({ className }: EnhancedNavigationProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      path: '/',
      icon: Home,
      description: 'Overview and analytics',
      keywords: ['home', 'overview', 'dashboard', 'stats']
    },
    {
      id: 'inventory',
      title: 'Inventory',
      path: '/inventory',
      icon: Package,
      description: 'Manage inventory items',
      keywords: ['inventory', 'items', 'stock', 'products']
    },
    {
      id: 'inventory-add',
      title: 'Add Item',
      path: '/inventory/add',
      icon: Package,
      description: 'Add new inventory item',
      keywords: ['add', 'new', 'create', 'item']
    },
    {
      id: 'inventory-categories',
      title: 'Categories',
      path: '/inventory/categories',
      icon: BarChart3,
      description: 'Manage item categories',
      keywords: ['categories', 'organize', 'groups']
    },
    {
      id: 'inventory-suppliers',
      title: 'Suppliers',
      path: '/inventory/suppliers',
      icon: Users,
      description: 'Manage suppliers',
      keywords: ['suppliers', 'vendors', 'providers']
    },
    {
      id: 'inventory-locations',
      title: 'Locations',
      path: '/inventory/locations',
      icon: MapPin,
      description: 'Manage storage locations',
      keywords: ['locations', 'warehouse', 'storage']
    },
    {
      id: 'inventory-orders',
      title: 'Purchase Orders',
      path: '/inventory/orders',
      icon: ShoppingCart,
      description: 'Manage purchase orders',
      badge: 'New',
      keywords: ['orders', 'purchase', 'buying']
    },
    {
      id: 'inventory-scan',
      title: 'Scan Invoice',
      path: '/inventory/scan',
      icon: ScanLine,
      description: 'Scan invoices to add products',
      badge: 'AI',
      keywords: ['scan', 'invoice', 'receipt', 'camera', 'ai', 'extract', 'ocr']
    },
    {
      id: 'inventory-manager',
      title: 'Settings',
      path: '/inventory/manager',
      icon: Settings,
      description: 'Inventory settings',
      keywords: ['settings', 'configuration', 'preferences']
    },
    {
      id: 'reports',
      title: 'Reports',
      path: '/reports',
      icon: FileText,
      description: 'Generate reports',
      keywords: ['reports', 'analytics', 'data']
    }
  ];

  const getBreadcrumbs = () => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ title: 'Home', path: '/' }];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const item = navigationItems.find(nav => nav.path === currentPath);
      
      if (item) {
        breadcrumbs.push({
          title: item.title,
          path: item.path
        });
      } else {
        // Handle dynamic segments like /inventory/item/:id
        if (segment === 'item' && pathSegments[index - 1] === 'inventory') {
          breadcrumbs.push({
            title: 'Item Details',
            path: currentPath
          });
        } else {
          breadcrumbs.push({
            title: segment.charAt(0).toUpperCase() + segment.slice(1),
            path: currentPath
          });
        }
      }
    });

    return breadcrumbs;
  };

  const filteredItems = navigationItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.keywords.some(keyword => keyword.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const recentItems = React.useMemo(() => {
    const recent = JSON.parse(localStorage.getItem('recentNavigation') || '[]');
    return navigationItems.filter(item => recent.includes(item.id)).slice(0, 5);
  }, []);

  const frequentItems = React.useMemo(() => {
    const usage = JSON.parse(localStorage.getItem('navigationUsage') || '{}');
    return navigationItems
      .filter(item => usage[item.id] > 0)
      .sort((a, b) => (usage[b.id] || 0) - (usage[a.id] || 0))
      .slice(0, 5);
  }, []);

  const handleNavigation = (path: string, itemId: string) => {
    // Track usage
    const usage = JSON.parse(localStorage.getItem('navigationUsage') || '{}');
    usage[itemId] = (usage[itemId] || 0) + 1;
    localStorage.setItem('navigationUsage', JSON.stringify(usage));

    // Track recent
    const recent = JSON.parse(localStorage.getItem('recentNavigation') || '[]');
    const newRecent = [itemId, ...recent.filter(id => id !== itemId)].slice(0, 10);
    localStorage.setItem('recentNavigation', JSON.stringify(newRecent));

    navigate(path);
    setSearchOpen(false);
  };

  const breadcrumbs = getBreadcrumbs();

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              <BreadcrumbItem>
                {index === breadcrumbs.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {crumb.title}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => navigate(crumb.path)}
                    className="cursor-pointer hover:text-primary transition-colors"
                  >
                    {crumb.title}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Quick Navigation & Search */}
      <div className="flex items-center justify-between">
        {/* Quick Actions */}
        <div className="flex items-center space-x-2">
          {frequentItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleNavigation(item.path, item.id)}
                className={`h-8 ${isActive ? 'bg-primary' : ''}`}
              >
                <Icon className="h-3 w-3 mr-1" />
                {item.title}
                {item.badge && (
                  <Badge variant="secondary" className="ml-1 text-xs h-4">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>

        {/* Global Search */}
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-80 justify-start text-muted-foreground"
            >
              <Search className="h-4 w-4 mr-2" />
              Search navigation...
              <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <Command>
              <CommandInput
                placeholder="Search pages and actions..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                
                {recentItems.length > 0 && (
                  <CommandGroup heading="Recent">
                    {recentItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleNavigation(item.path, item.id)}
                          className="flex items-center space-x-2"
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <Clock className="h-3 w-3 text-muted-foreground" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                {frequentItems.length > 0 && (
                  <CommandGroup heading="Frequently Used">
                    {frequentItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <CommandItem
                          key={item.id}
                          onSelect={() => handleNavigation(item.path, item.id)}
                          className="flex items-center space-x-2"
                        >
                          <Icon className="h-4 w-4" />
                          <div className="flex-1">
                            <p className="font-medium">{item.title}</p>
                            {item.description && (
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            )}
                          </div>
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}

                <CommandGroup heading="All Pages">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <CommandItem
                        key={item.id}
                        onSelect={() => handleNavigation(item.path, item.id)}
                        className="flex items-center space-x-2"
                      >
                        <Icon className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{item.title}</p>
                            {item.badge && (
                              <Badge variant="secondary" className="text-xs h-4">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}