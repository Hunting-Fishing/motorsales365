// All Business 365 — Landing Page
import React, { useState, useMemo, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, Wrench, ArrowRight, LogIn } from 'lucide-react';
import { SearchInput } from '@/components/settings/SearchInput';
import { ModuleCard } from '@/components/landing/ModuleCard';
import { ComingSoonCard } from '@/components/landing/ComingSoonCard';
import { HeroSection } from '@/components/landing/HeroSection';
import { WelcomeSection } from '@/components/landing/WelcomeSection';
import { CategoryBanner } from '@/components/landing/CategoryBanner';

// Lazy-load below-fold sections
const FeatureGrid = lazy(() => import('@/components/landing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const PricingSection = lazy(() => import('@/components/landing/PricingSection').then(m => ({ default: m.PricingSection })));
const TestimonialsSection = lazy(() => import('@/components/landing/TestimonialsSection').then(m => ({ default: m.TestimonialsSection })));
import { LANDING_COMING_SOON_CATEGORIES, LANDING_MODULES } from '@/config/landingModules';
import { useAuthUser } from '@/hooks/useAuthUser';

// Category images
import categoryAutomotive from '@/assets/category-automotive.jpg';
import categoryBeauty from '@/assets/category-beauty.jpg';
import categoryHome from '@/assets/category-home.jpg';
import categoryPets from '@/assets/category-pets.jpg';
import categoryFood from '@/assets/category-food.jpg';
import categoryAdventure from '@/assets/category-adventure.jpg';
import categoryFarming from '@/assets/category-farming.jpg';

// Mobile background
import mobileBgHome from '@/assets/mobile-bg-home.jpg';

// Map category names to images
const categoryImages: Record<string, string> = {
  'Automotive & Fleet': categoryAutomotive,
  'Beauty & Personal Care': categoryBeauty,
  'Home & Property Services': categoryHome,
  'Pet & Animal Services': categoryPets,
  'Food & Hospitality': categoryFood,
  'Adventure & Outdoor': categoryAdventure,
  'Farming & Livestock': categoryFarming,
  // Fallback mappings for different category names
  'Outdoor & Adventure': categoryAdventure,
  'Adventure Outfitters & Guide Services': categoryAdventure,
};

export default function Index() {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAuthenticated, isLoading } = useAuthUser();

  // Keyword associations for smart search (includes compound words)
  const keywordAssociations: Record<string, string[]> = {
    eye: ['lash', 'lashes', 'eyelash', 'eyelashes', 'brow', 'brows', 'eyebrow', 'eyebrows', 'optometry', 'vision', 'optical', 'eyewear', 'glasses', 'contacts', 'esthetician'],
    lash: ['eye', 'eyelash', 'esthetician', 'beauty', 'extensions'],
    brow: ['eye', 'eyebrow', 'esthetician', 'beauty', 'wax', 'threading'],
    hair: ['salon', 'barber', 'stylist', 'cut', 'color', 'beauty', 'haircut'],
    skin: ['facial', 'esthetician', 'spa', 'derma', 'beauty', 'wax', 'skincare'],
    pet: ['dog', 'cat', 'vet', 'veterinary', 'grooming', 'animal', 'boarding', 'kennel'],
    dog: ['pet', 'grooming', 'walking', 'training', 'boarding', 'kennel', 'canine'],
    cat: ['pet', 'grooming', 'boarding', 'sitting', 'feline'],
    car: ['auto', 'vehicle', 'repair', 'mechanic', 'tire', 'oil', 'detailing', 'wash', 'automotive'],
    auto: ['car', 'vehicle', 'repair', 'mechanic', 'automotive'],
    food: ['restaurant', 'catering', 'bakery', 'cafe', 'kitchen', 'chef', 'meal'],
    clean: ['cleaning', 'maid', 'janitorial', 'housekeeping', 'pressure', 'wash', 'power'],
    health: ['medical', 'therapy', 'wellness', 'clinic', 'doctor', 'nurse', 'care', 'healthcare'],
    beauty: ['salon', 'spa', 'nail', 'hair', 'lash', 'brow', 'esthetician', 'makeup', 'cosmetic'],
    home: ['house', 'residential', 'property', 'renovation', 'repair', 'maintenance'],
    tech: ['computer', 'phone', 'IT', 'repair', 'software', 'electronic', 'technology'],
    fitness: ['gym', 'training', 'workout', 'personal', 'yoga', 'pilates', 'exercise'],
    wedding: ['bridal', 'event', 'photography', 'catering', 'florist', 'venue', 'marriage'],
    lawn: ['landscape', 'garden', 'mowing', 'yard', 'grass', 'tree', 'landscaping'],
    pool: ['swimming', 'spa', 'hot tub', 'maintenance', 'cleaning'],
    nail: ['manicure', 'pedicure', 'salon', 'beauty', 'polish'],
    massage: ['therapy', 'spa', 'wellness', 'relaxation', 'bodywork'],
    tattoo: ['piercing', 'ink', 'body art', 'studio'],
    photo: ['photography', 'photographer', 'portrait', 'wedding', 'event'],
    dive: ['scuba', 'diving', 'underwater', 'snorkel', 'water', 'ocean', 'reef'],
    scuba: ['dive', 'diving', 'underwater', 'certification', 'padi', 'reef'],
    fish: ['fishing', 'charter', 'guide', 'angler', 'fly', 'deep sea', 'bass', 'trout'],
    wildlife: ['safari', 'tour', 'animal', 'nature', 'bird', 'whale', 'watching'],
    ocean: ['sea', 'marine', 'water', 'beach', 'surf', 'dive', 'boat'],
    adventure: ['outdoor', 'tour', 'safari', 'rafting', 'kayak', 'extreme'],
    water: ['aquatic', 'marine', 'ocean', 'river', 'lake', 'swim', 'dive', 'surf'],
    tour: ['guide', 'trip', 'excursion', 'safari', 'adventure', 'travel'],
    kayak: ['paddle', 'paddleboard', 'canoe', 'water', 'river', 'lake'],
    surf: ['surfing', 'wave', 'board', 'beach', 'ocean', 'water'],
    boat: ['sailing', 'yacht', 'charter', 'marine', 'vessel', 'cruise'],
  };

  // Get expanded search terms including associations (handles partial matches)
  const getExpandedTerms = (query: string): string[] => {
    const lowerQuery = query.toLowerCase().trim();
    const terms = [lowerQuery];
    
    // Add associated keywords - check partial matches both ways
    Object.entries(keywordAssociations).forEach(([key, associations]) => {
      // Check if query contains key OR key contains query (partial match)
      if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
        terms.push(key, ...associations);
      }
      // Also check if query matches any association (partial both ways)
      associations.forEach(assoc => {
        if (lowerQuery.includes(assoc) || assoc.includes(lowerQuery)) {
          terms.push(key, ...associations);
        }
      });
    });
    
    return [...new Set(terms)];
  };

  // Smart search matching with relevance scoring and partial word support
  const matchScore = (text: string, query: string): number => {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase().trim();
    
    if (!lowerQuery) return 0;
    
    // Exact match
    if (lowerText === lowerQuery) return 100;
    
    // Word boundary match (query is a complete word in text)
    const wordBoundaryRegex = new RegExp(`\\b${lowerQuery}\\b`);
    if (wordBoundaryRegex.test(lowerText)) return 90;
    
    // Text starts with query
    if (lowerText.startsWith(lowerQuery)) return 85;
    
    // Query found within text (substring)
    if (lowerText.includes(lowerQuery)) return 70;
    
    // Any word in text starts with query (partial word match)
    const words = lowerText.split(/[\s,.\-\/]+/);
    if (words.some(word => word.startsWith(lowerQuery))) return 65;
    
    // Query contains a word from the text (reverse partial)
    if (words.some(word => word.length >= 3 && lowerQuery.includes(word))) return 50;
    
    // Fuzzy match - check if all query words appear somewhere
    const queryWords = lowerQuery.split(/\s+/);
    const allWordsMatch = queryWords.every(qWord => 
      words.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))
    );
    if (allWordsMatch) return 40;
    
    return 0;
  };

  // Enhanced match with keyword associations
  const smartMatchScore = (text: string, query: string): number => {
    const directScore = matchScore(text, query);
    if (directScore > 0) return directScore;
    
    // Check expanded terms
    const expandedTerms = getExpandedTerms(query);
    let bestScore = 0;
    for (const term of expandedTerms) {
      if (term === query.toLowerCase().trim()) continue; // Skip original query
      const score = matchScore(text, term);
      if (score > bestScore) bestScore = score;
    }
    // Reduce score for association matches (less relevant than direct)
    return bestScore * 0.6;
  };

  // Filter available modules
  const filteredAvailableModules = useMemo(() => {
    const available = LANDING_MODULES.filter((module) => module.available);
    if (!searchQuery.trim()) return available;

    return available
      .map(module => ({
        module,
        score: Math.max(
          smartMatchScore(module.name, searchQuery) * 2,
          smartMatchScore(module.description, searchQuery)
        )
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.module);
  }, [searchQuery]);

  // Filter coming soon categories and modules
  const filteredComingSoonCategories = useMemo(() => {
    if (!searchQuery.trim()) return LANDING_COMING_SOON_CATEGORIES;

    return LANDING_COMING_SOON_CATEGORIES.map(category => {
      const filteredModules = category.modules
        .map(module => ({
          module,
          score: Math.max(
            smartMatchScore(module.name, searchQuery) * 2,
            smartMatchScore(module.description, searchQuery),
            smartMatchScore(category.category, searchQuery) * 0.5
          )
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.module);

      return { ...category, modules: filteredModules };
    }).filter(category => category.modules.length > 0);
  }, [searchQuery]);

  const totalResults = filteredAvailableModules.length + 
    filteredComingSoonCategories.reduce((acc, cat) => acc + cat.modules.length, 0);

  return (
    <div className="min-h-screen bg-background font-['Space_Grotesk',sans-serif] relative">
      {/* Mobile Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat md:hidden z-0"
        style={{ backgroundImage: `url(${mobileBgHome})` }}
      >
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>
      {/* Header */}
      <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 border-b relative">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">All Business 365</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Professional Service Management</p>
            </div>
            <div className="flex gap-3">
              <Link to="/customer-portal">
                <Button variant="ghost" className="gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Customer</span> Portal
                </Button>
              </Link>
              {/* Show different button based on auth state */}
              {isLoading ? (
                <Button className="gap-2" disabled>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                </Button>
              ) : isAuthenticated ? (
                <Link to="/module-hub">
                  <Button className="gap-2">
                    <Wrench className="h-4 w-4" />
                    Open App
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button className="gap-2">
                    <LogIn className="h-4 w-4" />
                    Login / Signup
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section with Image */}
      <HeroSection />
      
      {/* Welcome Section */}
      <WelcomeSection />

      {/* Available Modules */}
      <section id="modules" className="py-10 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">
              Available Modules
            </h2>
            <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto mb-4 md:mb-8">
              Industry-specific solutions ready to deploy today
            </p>
            
            {/* Search Input */}
            <div className="flex justify-center mb-3 md:mb-4">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search all modules..."
                className="max-w-lg"
              />
            </div>
            
            {searchQuery && (
              <p className="text-xs md:text-sm text-muted-foreground">
                Found {totalResults} module{totalResults !== 1 ? 's' : ''} matching "{searchQuery}"
              </p>
            )}
          </div>

          {filteredAvailableModules.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-6 max-w-6xl mx-auto">
              {filteredAvailableModules.map((module) => (
                <ModuleCard key={module.slug} {...module} />
              ))}
            </div>
          ) : searchQuery && (
            <p className="text-center text-muted-foreground">No available modules match your search.</p>
          )}
        </div>
      </section>

      {/* Coming Soon Modules */}
      {filteredComingSoonCategories.length > 0 && (
        <section className="py-10 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-6 md:mb-12">
              <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">
                Coming Soon
              </h2>
              <p className="text-muted-foreground text-sm md:text-lg max-w-2xl mx-auto">
                New modules in development. Get notified when they launch.
              </p>
            </div>
            
            {/* Categorized Coming Soon Modules with Category Banners */}
            <div className="space-y-8 md:space-y-12 max-w-6xl mx-auto">
              {filteredComingSoonCategories.map((category, index) => (
                <div key={category.category}>
                  {/* Category Banner with Image */}
                  {categoryImages[category.category] ? (
                    <CategoryBanner
                      title={category.category}
                      description={category.description}
                      image={categoryImages[category.category]}
                      align={index % 2 === 0 ? 'left' : 'right'}
                    />
                  ) : (
                    <div className="mb-4 md:mb-6">
                      <h3 className="text-lg md:text-2xl font-bold text-foreground mb-1 md:mb-2">
                        {category.category}
                      </h3>
                      <p className="text-muted-foreground text-sm md:text-base">
                        {category.description}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-4">
                    {category.modules.map((module) => (
                      <ComingSoonCard key={module.name} {...module} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      <Suspense fallback={null}>
        <section className="py-10 md:py-16">
          <div className="container mx-auto px-4">
            <TestimonialsSection />
          </div>
        </section>

        {/* Features Grid */}
        <FeatureGrid />

        {/* Pricing Section */}
        <PricingSection />
      </Suspense>

      {/* CTA Section */}
      <section className="py-12 md:py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-sm md:text-lg opacity-90 max-w-2xl mx-auto mb-6 md:mb-8">
            Join thousands of service professionals who trust All Business 365 to run their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {isAuthenticated ? (
              <Link to="/module-hub" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 w-full sm:w-auto">
                  Open App
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/signup" className="w-full sm:w-auto">
                <Button size="lg" variant="secondary" className="gap-2 text-base md:text-lg px-6 md:px-8 w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </Link>
            )}
            <Link to="/customer-portal" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 w-full sm:w-auto">
                Customer Portal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-xl font-bold mb-2">All Business 365</h3>
              <p className="text-muted-foreground text-sm max-w-md">
                Professional service management platform for any industry. 
                Streamline your operations and grow your business.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#modules" className="hover:text-foreground transition-colors">Modules</a></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Staff Portal</Link></li>
                <li><Link to="/customer-portal" className="hover:text-foreground transition-colors">Customer Portal</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} All Business 365. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
