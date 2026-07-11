import React, { useState, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Utensils, Plus, Loader2, Search, ChefHat, Target, User, BarChart3, ShoppingCart, Apple, Brain, TrendingUp } from 'lucide-react';
import { useShopId } from '@/hooks/useShopId';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useFoodLogs } from '@/hooks/useNutrition';

const DailyTargets = lazy(() => import('@/components/nutrition/DailyTargets'));

const FoodSearch = lazy(() => import('@/components/nutrition/FoodSearch'));
const ProductDetail = lazy(() => import('@/components/nutrition/ProductDetail'));
const NutritionProfile = lazy(() => import('@/components/nutrition/NutritionProfile'));
const GoalSetup = lazy(() => import('@/components/nutrition/GoalSetup'));
const MealPlanView = lazy(() => import('@/components/nutrition/MealPlanView'));
const HydrationTracker = lazy(() => import('@/components/nutrition/HydrationTracker'));
const WeeklyReport = lazy(() => import('@/components/nutrition/WeeklyReport'));
const ClientComparison = lazy(() => import('@/components/nutrition/ClientComparison'));
const ClientOverviewCard = lazy(() => import('@/components/nutrition/ClientOverviewCard'));
const EnhancedFoodLogger = lazy(() => import('@/components/nutrition/EnhancedFoodLogger'));
const GroceryList = lazy(() => import('@/components/nutrition/GroceryList'));
const IntakeTrendChart = lazy(() => import('@/components/nutrition/IntakeTrendChart'));
const AiAdviceCard = lazy(() => import('@/components/nutrition/AiAdviceCard'));

const LazyFallback = () => <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

export default function PersonalTrainerNutrition() {
  const { shopId } = useShopId();
  const { toast } = useToast();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [logDialogOpen, setLogDialogOpen] = useState(false);
  const [aiAdvice, setAiAdvice] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: clients = [] } = useQuery({
    queryKey: ['pt-nutrition-clients', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await (supabase as any).from('pt_clients').select('id, first_name, last_name, calorie_target, protein_target_g').eq('shop_id', shopId).eq('membership_status', 'active').order('first_name');
      return data || [];
    },
    enabled: !!shopId,
  });

  const { data: logs = [], isLoading } = useFoodLogs(selectedClient || undefined, shopId || undefined);
  const selectedClientData = clients.find((c: any) => c.id === selectedClient);

  const getAiAdvice = async () => {
    if (!selectedClient) return;
    setAiLoading(true);
    setAiAdvice('');
    try {
      const { data, error } = await supabase.functions.invoke('nutrition-engine', {
        body: { action: 'nutrition_advice', clientId: selectedClient, shopId },
      });
      if (error) throw error;
      setAiAdvice(data.content);
    } catch (e: any) {
      toast({ title: 'AI Error', description: e.message, variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  // Aggregate daily totals for chart
  const dailyTotals = Object.values(
    logs.reduce((acc: Record<string, any>, l: any) => {
      const d = l.log_date;
      if (!acc[d]) acc[d] = { date: d, calories: 0, protein: 0 };
      acc[d].calories += l.calories || 0;
      acc[d].protein += l.protein_g || 0;
      return acc;
    }, {})
  ).slice(0, 14).reverse() as any[];

  const todayLogs = logs.filter((l: any) => l.log_date === new Date().toISOString().split('T')[0]);
  const todayIntake = {
    calories: todayLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0),
    protein_g: todayLogs.reduce((s: number, l: any) => s + (l.protein_g || 0), 0),
    carbs_g: todayLogs.reduce((s: number, l: any) => s + (l.carbs_g || 0), 0),
    fat_g: todayLogs.reduce((s: number, l: any) => s + (l.fat_g || 0), 0),
  };

  // Group today's logs by meal type for timeline
  const mealTimeline = ['breakfast', 'pre_workout', 'lunch', 'post_workout', 'dinner', 'snack'];
  const mealEmojis: Record<string, string> = {
    breakfast: '🌅', pre_workout: '💪', lunch: '☀️', post_workout: '🔋', dinner: '🌙', snack: '🍎',
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Utensils className="h-6 w-6 text-primary" />Nutrition Intelligence
          </h1>
          <p className="text-muted-foreground text-sm">AI-powered nutrition tracking, scoring & meal planning</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedClient && (
            <Button variant="outline" size="sm" onClick={getAiAdvice} disabled={aiLoading}>
              {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}AI Advice
            </Button>
          )}
          <Button onClick={() => setLogDialogOpen(true)} disabled={!selectedClient} size="sm">
            <Plus className="h-4 w-4 mr-1" />Log Meal
          </Button>
        </div>
      </div>

      {/* Client Selector */}
      <div className="max-w-xs">
        <Select value={selectedClient} onValueChange={v => { setSelectedClient(v); setSelectedProduct(null); setActiveTab('dashboard'); }}>
          <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
          <SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* Client Comparison when no client selected */}
      {!selectedClient && shopId && (
        <Suspense fallback={<LazyFallback />}>
          <ClientComparison shopId={shopId} onSelectClient={setSelectedClient} />
        </Suspense>
      )}

      {/* Client Overview Card */}
      {selectedClient && selectedClientData && (
        <Suspense fallback={<LazyFallback />}>
          <ClientOverviewCard client={selectedClientData} shopId={shopId!} />
        </Suspense>
      )}

      {selectedClient && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-7 h-auto">
            <TabsTrigger value="dashboard" className="text-[11px] px-1"><TrendingUp className="h-3.5 w-3.5 mr-0.5" />Dashboard</TabsTrigger>
            <TabsTrigger value="search" className="text-[11px] px-1"><Search className="h-3.5 w-3.5 mr-0.5" />Food</TabsTrigger>
            <TabsTrigger value="meals" className="text-[11px] px-1"><ChefHat className="h-3.5 w-3.5 mr-0.5" />Meals</TabsTrigger>
            <TabsTrigger value="grocery" className="text-[11px] px-1"><ShoppingCart className="h-3.5 w-3.5 mr-0.5" />Grocery</TabsTrigger>
            <TabsTrigger value="goals" className="text-[11px] px-1"><Target className="h-3.5 w-3.5 mr-0.5" />Goals</TabsTrigger>
            <TabsTrigger value="profile" className="text-[11px] px-1"><User className="h-3.5 w-3.5 mr-0.5" />Profile</TabsTrigger>
            <TabsTrigger value="reports" className="text-[11px] px-1"><BarChart3 className="h-3.5 w-3.5 mr-0.5" />Reports</TabsTrigger>
          </TabsList>

          {/* DASHBOARD */}
          <TabsContent value="dashboard" className="space-y-4 mt-4">
            <DailyTargets clientId={selectedClient} shopId={shopId!} todayIntake={todayIntake} />

            <Suspense fallback={<LazyFallback />}>
              <HydrationTracker clientId={selectedClient} shopId={shopId!} />
            </Suspense>

            {/* AI Advice */}
            {aiAdvice && (
              <Suspense fallback={<LazyFallback />}>
                <AiAdviceCard advice={aiAdvice} />
              </Suspense>
            )}

            {/* Meal Timeline for Today */}
            {todayLogs.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Apple className="h-4 w-4 text-primary" />
                    Today's Meals
                    <Badge variant="outline" className="ml-auto text-xs">{todayLogs.length} entries</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {mealTimeline.map(mealType => {
                      const mealLogs = todayLogs.filter((l: any) => l.meal_type === mealType);
                      if (mealLogs.length === 0) return null;
                      const totalCal = mealLogs.reduce((s: number, l: any) => s + (l.calories || 0), 0);
                      return (
                        <div key={mealType} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                          <span className="text-lg mt-0.5">{mealEmojis[mealType]}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold capitalize text-muted-foreground">{mealType.replace('_', ' ')}</p>
                            {mealLogs.map((l: any) => (
                              <div key={l.id} className="flex items-center gap-2 mt-0.5">
                                {l.photo_url && <img src={l.photo_url} alt="" className="w-8 h-8 rounded object-cover border border-border" />}
                                <span className="text-sm truncate">{l.food_name}</span>
                              </div>
                            ))}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{totalCal}</p>
                            <p className="text-[10px] text-muted-foreground">cal</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty state for no logs */}
            {!isLoading && todayLogs.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Utensils className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No meals logged today</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">Start tracking to see progress towards daily targets</p>
                  <Button size="sm" onClick={() => setLogDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />Log First Meal
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Charts */}
            {dailyTotals.length > 0 && (
              <Suspense fallback={<LazyFallback />}>
                <IntakeTrendChart dailyTotals={dailyTotals} />
              </Suspense>
            )}

            {/* Recent Logs */}
            {isLoading ? <LazyFallback /> : logs.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Recent Entries</h3>
                {logs.slice(0, 15).map((l: any) => (
                  <Card key={l.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-3 flex items-center gap-3">
                      {l.photo_url ? (
                        <img src={l.photo_url} alt="" className="w-10 h-10 rounded-md object-cover border border-border flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 text-lg">
                          {mealEmojis[l.meal_type] || '🍽️'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize py-0">{l.meal_type?.replace('_', ' ')}</Badge>
                          <span className="font-medium text-sm truncate">{l.food_name}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(l.log_date), 'EEE, MMM d')}{l.notes ? ` · ${l.notes}` : ''}</p>
                      </div>
                      <div className="text-right text-xs space-y-0.5 flex-shrink-0">
                        <p className="font-bold">{Math.round(l.calories || 0)} cal</p>
                        <p className="text-muted-foreground">P:{Math.round(l.protein_g || 0)} C:{Math.round(l.carbs_g || 0)} F:{Math.round(l.fat_g || 0)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* FOOD SEARCH */}
          <TabsContent value="search" className="mt-4">
            <Suspense fallback={<LazyFallback />}>
              {selectedProduct ? (
                <ProductDetail product={selectedProduct} clientId={selectedClient} shopId={shopId!} onBack={() => setSelectedProduct(null)} onLogFood={() => {}} />
              ) : (
                <FoodSearch clientId={selectedClient} shopId={shopId!} onSelectProduct={setSelectedProduct} onLogFood={() => {}} />
              )}
            </Suspense>
          </TabsContent>

          {/* MEAL PLANS */}
          <TabsContent value="meals" className="mt-4">
            <Suspense fallback={<LazyFallback />}><MealPlanView clientId={selectedClient} shopId={shopId!} /></Suspense>
          </TabsContent>

          {/* GROCERY LIST */}
          <TabsContent value="grocery" className="mt-4">
            <Suspense fallback={<LazyFallback />}><GroceryList clientId={selectedClient} shopId={shopId!} /></Suspense>
          </TabsContent>

          {/* GOALS */}
          <TabsContent value="goals" className="mt-4">
            <Suspense fallback={<LazyFallback />}><GoalSetup clientId={selectedClient} shopId={shopId!} /></Suspense>
          </TabsContent>

          {/* PROFILE */}
          <TabsContent value="profile" className="mt-4">
            <Suspense fallback={<LazyFallback />}><NutritionProfile clientId={selectedClient} shopId={shopId!} /></Suspense>
          </TabsContent>

          {/* REPORTS */}
          <TabsContent value="reports" className="mt-4">
            <Suspense fallback={<LazyFallback />}><WeeklyReport clientId={selectedClient} shopId={shopId!} /></Suspense>
          </TabsContent>
        </Tabs>
      )}

      {/* Enhanced Food Logger Dialog */}
      {selectedClient && (
        <Suspense fallback={null}>
          <EnhancedFoodLogger clientId={selectedClient} shopId={shopId!} open={logDialogOpen} onOpenChange={setLogDialogOpen} />
        </Suspense>
      )}
    </div>
  );
}
