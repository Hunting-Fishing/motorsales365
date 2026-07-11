import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useEnabledModules } from '@/hooks/useEnabledModules';
import { MODULE_ROUTES, ModuleSectionItem } from '@/config/moduleRoutes';
import { useSidebar } from '@/hooks/use-sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { ChevronDown, ExternalLink } from 'lucide-react';
import { 
  AnimatedCollapsible, 
  CollapsibleTrigger, 
  CollapsibleContent 
} from '@/components/ui/animated-collapsible';
import { motion } from 'framer-motion';
import { trackAffiliateClick } from '@/services/affiliateTrackingService';

export function ModuleSections() {
  const location = useLocation();
  const { setIsOpen } = useSidebar();
  const isMobile = useIsMobile();
  const { getEnabledModuleSlugs, hasShop, isLoading } = useEnabledModules();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const handleLinkClick = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  if (isLoading || !hasShop) {
    return null;
  }

  // Get the currently active module based on the route
  const currentPath = location.pathname;
  
  // Find the active module by checking which module's dashboard route matches
  const activeModuleSlug = Object.keys(MODULE_ROUTES).find(slug => {
    const config = MODULE_ROUTES[slug];
    if (!config) return false;
    
    const dashboardRoute = config.dashboardRoute;
    return currentPath === dashboardRoute || currentPath.startsWith(dashboardRoute + '/');
  });

  // If no active module found, don't show sections
  if (!activeModuleSlug) {
    return null;
  }

  const moduleConfig = MODULE_ROUTES[activeModuleSlug];
  if (!moduleConfig?.sections || moduleConfig.sections.length === 0) {
    return null;
  }

  const Icon = moduleConfig.icon;

  // Group sections by their group property
  const groupedSections = moduleConfig.sections.reduce((acc, item) => {
    const group = item.group || 'General';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(item);
    return acc;
  }, {} as Record<string, ModuleSectionItem[]>);

  const groupOrder = [
    'Dashboard',
    'Services', 
    'Customers',
    'Inventory',
    'Billing',
    'Scheduling',
    'Compliance',
    'Communications',
    'Marketing',
    'Operations',
    'Equipment & Tools',
    'Fleet',
    'Tools',
    'Safety & Compliance',
    'Company',
    'Resources',
    'Settings',
    'Automotive',
    'General',
    'Quick Links'
  ];

  const sortedGroups = Object.keys(groupedSections).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a);
    const bIndex = groupOrder.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <div className="mb-3">
      {/* Module Section Header */}
      <div className={cn(
        "px-3 py-2 rounded-t-lg border-b mb-1",
        "bg-gradient-to-r",
        moduleConfig.gradientFrom,
        moduleConfig.gradientTo,
        "border-white/20"
      )}>
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-white" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            {moduleConfig.name}
          </h3>
        </div>
      </div>
      
      {/* Grouped Module Section Items */}
      <div className="space-y-1">
        {sortedGroups.map((groupName) => {
          const items = groupedSections[groupName];
          const isExpanded = expandedGroups[groupName] ?? (groupName === 'Dashboard' || groupName === 'Services');
          
          // For Dashboard group, render items directly without collapsible
          if (groupName === 'Dashboard') {
            return (
              <div key={groupName}>
                {items.map((item) => (
                  <SectionLink 
                    key={item.href}
                    item={item}
                    currentPath={currentPath}
                    dashboardRoute={moduleConfig.dashboardRoute}
                    onClick={handleLinkClick}
                    moduleId={activeModuleSlug}
                  />
                ))}
              </div>
            );
          }

          return (
            <AnimatedCollapsible
              key={groupName}
              open={isExpanded}
              onOpenChange={() => toggleGroup(groupName)}
            >
              <CollapsibleTrigger 
                showChevron={true}
                className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors"
              >
                <span className="uppercase tracking-wider">{groupName}</span>
              </CollapsibleTrigger>
              <CollapsibleContent staggerChildren staggerDelay={0.03} className="space-y-0.5">
                {items.map((item) => (
                  <SectionLink 
                    key={item.href}
                    item={item}
                    currentPath={currentPath}
                    dashboardRoute={moduleConfig.dashboardRoute}
                    onClick={handleLinkClick}
                    moduleId={activeModuleSlug}
                  />
                ))}
              </CollapsibleContent>
            </AnimatedCollapsible>
          );
        })}
      </div>
    </div>
  );
}

interface SectionLinkProps {
  item: ModuleSectionItem;
  currentPath: string;
  dashboardRoute: string;
  onClick: () => void;
  moduleId?: string;
}

function SectionLink({ item, currentPath, dashboardRoute, onClick, moduleId }: SectionLinkProps) {
  const isExternal = item.isExternal || item.href.startsWith('http');
  const isActive = !isExternal && (
    currentPath === item.href || 
    (item.href !== dashboardRoute && currentPath.startsWith(item.href))
  );
  
  const ItemIcon = item.icon;

  const handleExternalClick = () => {
    // Track affiliate clicks for Amazon links
    if (item.href.includes('amzn.to')) {
      trackAffiliateClick({
        linkUrl: item.href,
        linkType: 'sidebar',
        moduleId: moduleId,
        referrerPath: currentPath,
        metadata: { linkTitle: item.title }
      });
    }
    onClick();
  };
  
  // External link rendering
  if (isExternal) {
    return (
      <motion.div
        whileHover={{ x: 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleExternalClick}
          className="group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
          title={item.description || item.title}
        >
          <ItemIcon className="mr-3 h-4 w-4 flex-shrink-0 text-amber-500" />
          {item.title}
          <ExternalLink className="ml-auto h-3 w-3 opacity-50" />
        </a>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      whileHover={{ x: 2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          'group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-150',
          isActive
            ? 'bg-primary/10 text-primary font-semibold'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )}
        title={item.description || item.title}
      >
        <ItemIcon
          className={cn(
            'mr-3 h-4 w-4 flex-shrink-0 transition-colors',
            isActive 
              ? 'text-primary'
              : 'text-muted-foreground/70 group-hover:text-foreground'
          )}
        />
        {item.title}
      </Link>
    </motion.div>
  );
}
