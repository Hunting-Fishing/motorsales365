import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ChefHat, ShoppingCart, Sparkles, Clock, UtensilsCrossed, BookOpen } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMealPlans, useGenerateMealPlan, useWorkoutDayTypes } from '@/hooks/useNutrition';
import RecipeSearch from './RecipeSearch';

interface Props {
  clientId: string;
  shopId: string;
}

const MEAL_TYPE_ICONS: Record<string, string> = {
  breakfast: '🌅',
  pre_workout: '💪',
  lunch: '☀️',
  post_workout: '🔋',
  dinner: '🌙',
  snack: '🍎',
};

export default function MealPlanView({ clientId, shopId }: Props) {
  const { data: plans = [], isLoading } = useMealPlans(clientId, shopId);
  const { data: dayTypes = [] } = useWorkoutDayTypes();
  const generateMutation = useGenerateMealPlan();
  const [selectedDayType, setSelectedDayType] = useState('moderate');
  const [showGrocery, setShowGrocery] = useState(false);

  const activePlan = plans[0];
  const meals = (activePlan?.meals || []) as any[];
  const groceryList = (activePlan?.grocery_list || []) as any[];

  const handleGenerate = () => {
    generateMutation.mutate({ clientId, shopId, dayType: selectedDayType });
  };

  return (
    <Tabs defaultValue="recipes" className="space-y-4">
      <TabsList className="w-full">
        <TabsTrigger value="recipes" className="flex-1 text-xs gap-1">
          <BookOpen className="h-3.5 w-3.5" /> Recipe Search
        </TabsTrigger>
        <TabsTrigger value="ai-plan" className="flex-1 text-xs gap-1">
          <Sparkles className="h-3.5 w-3.5" /> AI Meal Plan
        </TabsTrigger>
      </TabsList>

      <TabsContent value="recipes">
        <RecipeSearch clientId={clientId} shopId={shopId} />
      </TabsContent>

      <TabsContent value="ai-plan" className="space-y-4">
        {/* Generate Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ChefHat className="h-5 w-5 text-primary" />
              AI Meal Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Select value={selectedDayType} onValueChange={setSelectedDayType}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {dayTypes.map((dt: any) => (
                    <SelectItem key={dt.id} value={dt.day_type}>{dt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Plan */}
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : activePlan ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">{activePlan.plan_name}</h3>
                <p className="text-xs text-muted-foreground">
                  {activePlan.target_calories} kcal · P:{activePlan.target_protein_g}g · C:{activePlan.target_carbs_g}g · F:{activePlan.target_fat_g}g
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowGrocery(!showGrocery)}>
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                {showGrocery ? 'Meals' : 'Grocery List'}
              </Button>
            </div>

            {!showGrocery ? (
              <div className="space-y-3">
                {meals.map((meal: any, idx: number) => (
                  <Card key={idx}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{MEAL_TYPE_ICONS[meal.meal_type] || '🍽️'}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{meal.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{meal.meal_type?.replace('_', ' ')}</p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-semibold">{meal.calories} kcal</p>
                          <p className="text-muted-foreground">P:{meal.protein_g}g C:{meal.carbs_g}g F:{meal.fat_g}g</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {(meal.foods || []).map((food: string, fi: number) => (
                          <Badge key={fi} variant="outline" className="text-xs">{food}</Badge>
                        ))}
                      </div>
                      {meal.prep_time_min && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="h-3 w-3" />{meal.prep_time_min} min prep
                        </p>
                      )}
                      {meal.notes && <p className="text-xs text-muted-foreground mt-1">{meal.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {groceryList.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                        <span>{item.item}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{item.quantity}</span>
                          {item.category && <Badge variant="outline" className="text-[10px]">{item.category}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <UtensilsCrossed className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No meal plans yet. Generate one above!</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}
