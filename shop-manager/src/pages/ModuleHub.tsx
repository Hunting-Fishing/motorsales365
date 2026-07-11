import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useModuleAccess } from '@/hooks/useModuleSubscriptions';
import { getAllModuleRoutes, UPCOMING_MODULES } from '@/config/moduleRoutes';
import { ModuleCard } from '@/components/module-hub/ModuleCard';
import { ModuleHubHeader } from '@/components/module-hub/ModuleHubHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Spotlight } from '@/components/ui/spotlight';
import { StaticBeams } from '@/components/ui/background-beams';
import { Card3D } from '@/components/ui/card-3d';
import { Particles } from '@/components/ui/magicui/particles';
import { 
  LayoutGrid, Sparkles, Search, X, ChevronDown, ChevronRight, 
  Home, HardHat, Car, Scissors, Dog, UtensilsCrossed, Monitor, 
  Key, Tractor, Briefcase, Heart, Baby, Rocket, LucideIcon,
  Zap, Flame, Star
} from 'lucide-react';

// Category icons and colors
const CATEGORY_CONFIG: Record<string, { icon: LucideIcon; gradient: string; emoji: string }> = {
  'Home & Property Services': { icon: Home, gradient: 'from-blue-500 to-cyan-500', emoji: '🏠' },
  'Construction & Trade': { icon: HardHat, gradient: 'from-orange-500 to-amber-500', emoji: '🏗️' },
  'Automotive & Transportation': { icon: Car, gradient: 'from-red-500 to-pink-500', emoji: '🚗' },
  'Personal Services': { icon: Scissors, gradient: 'from-purple-500 to-violet-500', emoji: '✨' },
  'Pet Services': { icon: Dog, gradient: 'from-amber-500 to-yellow-500', emoji: '🐾' },
  'Food & Beverage': { icon: UtensilsCrossed, gradient: 'from-rose-500 to-orange-500', emoji: '🍽️' },
  'Technology & Electronics': { icon: Monitor, gradient: 'from-indigo-500 to-blue-500', emoji: '💻' },
  'Specialty & Niche': { icon: Key, gradient: 'from-emerald-500 to-teal-500', emoji: '🔑' },
  'Agriculture & Outdoor': { icon: Tractor, gradient: 'from-green-500 to-lime-500', emoji: '🌿' },
  'Professional Services': { icon: Briefcase, gradient: 'from-slate-500 to-gray-600', emoji: '💼' },
  'Healthcare & Wellness': { icon: Heart, gradient: 'from-pink-500 to-rose-500', emoji: '❤️' },
  'Childcare & Education': { icon: Baby, gradient: 'from-pink-400 to-purple-500', emoji: '👶' },
  'Other': { icon: Rocket, gradient: 'from-violet-500 to-purple-600', emoji: '🚀' },
};

export default function ModuleHub() {
  const { user } = useAuthUser();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const { 
    hasModuleAccess, 
    trialActive, 
    trialEndsAt, 
    subscriptions,
    isLoading 
  } = useModuleAccess();

  const allModules = getAllModuleRoutes();

  // Group upcoming modules by category
  const upcomingByCategory = useMemo(() => {
    const grouped: Record<string, typeof UPCOMING_MODULES> = {};
    UPCOMING_MODULES.forEach(module => {
      const category = module.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(module);
    });
    return grouped;
  }, []);

  const categoryOrder = Object.keys(upcomingByCategory).sort();
  
  // Filter function for modules
  const filterModules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return { accessible: [], locked: [], upcoming: [], upcomingByCategory: {}, hasResults: false, isSearching: false };
    
    const matchScore = (name: string, description: string, category?: string) => {
      const nameLower = name.toLowerCase();
      const descLower = description.toLowerCase();
      const catLower = (category || '').toLowerCase();
      
      if (nameLower === query) return 100;
      if (nameLower.startsWith(query)) return 80;
      if (nameLower.includes(query)) return 60;
      if (catLower.includes(query)) return 50;
      if (descLower.includes(query)) return 40;
      const words = query.split(' ');
      const matchedWords = words.filter(w => nameLower.includes(w) || descLower.includes(w) || catLower.includes(w));
      if (matchedWords.length > 0) return 20 * (matchedWords.length / words.length);
      
      return 0;
    };

    const accessibleModules = allModules
      .filter(m => hasModuleAccess(m.slug))
      .map(m => ({ ...m, score: matchScore(m.name, m.description) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    const lockedModules = allModules
      .filter(m => !hasModuleAccess(m.slug))
      .map(m => ({ ...m, score: matchScore(m.name, m.description) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    const upcomingModules = UPCOMING_MODULES
      .map(m => ({ ...m, score: matchScore(m.name, m.description, m.category) }))
      .filter(m => m.score > 0)
      .sort((a, b) => b.score - a.score);

    const filteredUpcomingByCategory: Record<string, typeof upcomingModules> = {};
    upcomingModules.forEach(module => {
      const category = module.category || 'Other';
      if (!filteredUpcomingByCategory[category]) {
        filteredUpcomingByCategory[category] = [];
      }
      filteredUpcomingByCategory[category].push(module);
    });

    return {
      accessible: accessibleModules,
      locked: lockedModules,
      upcoming: upcomingModules,
      upcomingByCategory: filteredUpcomingByCategory,
      hasResults: accessibleModules.length > 0 || lockedModules.length > 0 || upcomingModules.length > 0,
      isSearching: true
    };
  }, [searchQuery, allModules, hasModuleAccess]);

  const accessibleModules = allModules.filter(m => hasModuleAccess(m.slug));
  const lockedModules = allModules.filter(m => !hasModuleAccess(m.slug));

  const isSearching = searchQuery.trim().length > 0;
  const displayAccessible = isSearching ? filterModules.accessible : accessibleModules;
  const displayLocked = isSearching ? filterModules.locked : lockedModules;
  const displayUpcomingByCategory = isSearching ? filterModules.upcomingByCategory : upcomingByCategory;
  const displayUpcomingCategories = Object.keys(displayUpcomingByCategory).sort();

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const expandAllCategories = () => {
    const allExpanded: Record<string, boolean> = {};
    displayUpcomingCategories.forEach(cat => {
      allExpanded[cat] = true;
    });
    setExpandedCategories(allExpanded);
  };

  const collapseAllCategories = () => {
    setExpandedCategories({});
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-32 w-full mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalUpcoming = Object.values(displayUpcomingByCategory).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <Spotlight className="relative min-h-screen bg-gradient-to-br from-background via-background to-muted/20" size={600}>
      <Particles className="absolute inset-0 -z-10 opacity-60" quantity={70} />
      <div className="relative max-w-7xl mx-auto p-6 md:p-8">
        <ModuleHubHeader 
          userName={user?.user_metadata?.first_name || user?.email?.split('@')[0]}
          trialActive={trialActive}
          trialEndsAt={trialEndsAt}
          activeCount={accessibleModules.length}
        />

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search modules... (e.g., auto repair, plumbing, salon)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {isSearching && (
            <p className="text-sm text-muted-foreground mt-2">
              {filterModules.hasResults 
                ? `Found ${displayAccessible.length + displayLocked.length + totalUpcoming} matching modules`
                : 'No modules found. Try a different search term.'
              }
            </p>
          )}
        </div>

        {/* No Results State */}
        {isSearching && !filterModules.hasResults && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No modules found</h3>
            <p className="text-muted-foreground mb-4">
              Try searching with different keywords like "repair", "fleet", or "salon"
            </p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </div>
        )}

        {/* Your Modules Section */}
        {displayAccessible.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Your Modules</h2>
              <Badge variant="secondary" className="text-xs">
                {displayAccessible.length} {isSearching ? 'found' : 'active'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayAccessible.map(module => (
                <Card3D key={module.slug} rotationIntensity={8} glareOpacity={0.15} scale={1.02}>
                  <ModuleCard
                    module={module}
                    hasAccess={true}
                    isSubscribed={subscriptions.some(s => s.module_slug === module.slug)}
                  />
                </Card3D>
              ))}
            </div>
          </section>
        )}

        {/* Available Modules Section */}
        {displayLocked.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-semibold text-foreground">Available Modules</h2>
              <Badge variant="outline" className="text-xs">
                {displayLocked.length} {isSearching ? 'found' : 'available'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {displayLocked.map(module => (
                <Card3D key={module.slug} rotationIntensity={6} glareOpacity={0.1} scale={1.01}>
                  <ModuleCard
                    module={module}
                    hasAccess={false}
                    isSubscribed={false}
                    onViewPlans={() => navigate(`/modules/${module.slug}`)}
                  />
                </Card3D>
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Modules Section - Exciting Design */}
        {displayUpcomingCategories.length > 0 && (
          <section className="mb-10">
            {/* Hero Header for Upcoming - Premium Glass Design */}
            <StaticBeams className="relative overflow-hidden rounded-3xl p-6 md:p-8 mb-6">
              {/* Mesh gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-fuchsia-500" />
              <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/40 via-transparent to-cyan-400/30" />
              <div className="absolute inset-0 bg-gradient-to-bl from-rose-500/30 via-transparent to-indigo-600/40" />
              
              {/* Glass overlay */}
              <div className="absolute inset-0 backdrop-blur-[1px] bg-white/5" />
              
              {/* Pattern overlay */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '24px 24px'
              }} />
              
              <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-2xl shadow-purple-500/25 border border-white/20">
                    <Sparkles className="w-8 h-8 text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2 drop-shadow-lg">
                      Upcoming Modules
                      <Flame className="w-6 h-6 text-yellow-300 drop-shadow-lg animate-pulse" />
                    </h2>
                    <p className="text-white/90 text-sm md:text-base mt-1 drop-shadow">
                      <span className="font-semibold text-yellow-200">{totalUpcoming}</span> exciting modules coming soon across <span className="font-semibold text-cyan-200">{displayUpcomingCategories.length}</span> categories
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={expandAllCategories}
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm shadow-lg"
                  >
                    Expand All
                  </Button>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={collapseAllCategories}
                    className="bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-sm shadow-lg"
                  >
                    Collapse All
                  </Button>
                  {!isSearching && (
                    <Button variant="secondary" size="sm" asChild className="bg-white/90 text-purple-700 hover:bg-white shadow-lg font-semibold">
                      <Link to="/upcoming-modules">View All</Link>
                    </Button>
                  )}
                </div>
              </div>
            </StaticBeams>

            <div className="grid gap-4">
              {displayUpcomingCategories.map((category, idx) => {
                const modules = displayUpcomingByCategory[category];
                const isExpanded = expandedCategories[category] || false;
                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['Other'];
                const CategoryIcon = config.icon;
                
                return (
                  <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <button 
                        className="group relative flex items-center justify-between w-full p-4 rounded-2xl text-left overflow-hidden transition-all duration-300 hover:scale-[1.01]"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        {/* Multi-layer gradient background */}
                        <div className={`absolute inset-0 bg-gradient-to-r ${config.gradient}`} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
                        
                        {/* Glass reflection */}
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60" />
                        
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
                        
                        {/* Shadow depth */}
                        <div className="absolute inset-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)] rounded-2xl" />
                        
                        <div className="relative flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg border border-white/20">
                            <CategoryIcon className="h-6 w-6 text-white drop-shadow" />
                          </div>
                          <div>
                            <span className="font-semibold text-white text-lg flex items-center gap-2 drop-shadow">
                              {config.emoji} {category}
                            </span>
                            <span className="text-white/80 text-sm drop-shadow-sm">
                              {modules.length} module{modules.length !== 1 ? 's' : ''} coming soon
                            </span>
                          </div>
                        </div>
                        <div className="relative flex items-center gap-3">
                          <Badge className="bg-white/25 text-white border border-white/30 backdrop-blur-sm shadow-lg font-semibold">
                            {modules.length}
                          </Badge>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-white drop-shadow transition-transform" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-white drop-shadow group-hover:translate-x-1 transition-transform" />
                          )}
                        </div>
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-4 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pl-2">
                        {modules.map((module, moduleIdx) => {
                          const Icon = module.icon;
                          return (
                            <Card 
                              key={module.slug} 
                              className="group relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-background via-background to-muted/30 hover:shadow-2xl hover:shadow-primary/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                              style={{ animationDelay: `${moduleIdx * 30}ms` }}
                            >
                              {/* Glassmorphism overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                              
                              {/* Gradient glow on hover */}
                              <div className={`absolute -inset-1 bg-gradient-to-br ${module.gradientFrom} ${module.gradientTo} opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500`} />
                              
                              {/* Inner gradient overlay on hover */}
                              <div className={`absolute inset-0 bg-gradient-to-br ${module.gradientFrom} ${module.gradientTo} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`} />
                              
                              {/* Expected date badge - premium glass */}
                              <div className="absolute top-3 right-3 z-10">
                                <Badge className="bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white border-0 text-xs shadow-lg shadow-purple-500/25 backdrop-blur-sm">
                                  <Star className="w-3 h-3 mr-1" />
                                  {module.expectedDate || 'Coming Soon'}
                                </Badge>
                              </div>
                              
                              <CardHeader className="relative pb-2 pt-4">
                                {/* Icon with glow */}
                                <div className="relative">
                                  <div className={`absolute inset-0 w-12 h-12 bg-gradient-to-br ${module.gradientFrom} ${module.gradientTo} blur-lg opacity-40 group-hover:opacity-60 transition-opacity`} />
                                  <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${module.gradientFrom} ${module.gradientTo} mb-3 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-lg border border-white/20`}>
                                    <Icon className="h-6 w-6 text-white drop-shadow" />
                                  </div>
                                </div>
                                <CardTitle className="text-base group-hover:text-primary transition-colors font-semibold">
                                  {module.name}
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="relative pb-4">
                                <CardDescription className="text-xs line-clamp-2 text-muted-foreground/80">
                                  {module.description}
                                </CardDescription>
                              </CardContent>
                              
                              {/* Bottom gradient bar with glow */}
                              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${module.gradientFrom} ${module.gradientTo} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                              <div className={`absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t ${module.gradientFrom} ${module.gradientTo} opacity-0 group-hover:opacity-10 blur-md transition-opacity duration-300`} />
                            </Card>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {!isSearching && accessibleModules.length === 0 && lockedModules.length === 0 && (
          <div className="text-center py-16">
            <LayoutGrid className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No modules available</h3>
            <p className="text-muted-foreground">
              Please contact support if you believe this is an error.
            </p>
          </div>
        )}
      </div>
    </Spotlight>
  );
}
