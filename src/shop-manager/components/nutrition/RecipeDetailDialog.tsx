import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Loader2, Clock, Users, ExternalLink, Plus, ShoppingCart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Ingredient {
  id: number;
  name: string;
  original: string;
  amount: number;
  unit: string;
  aisle: string;
  image: string | null;
}

interface Step {
  number: number;
  step: string;
  ingredients: string[];
  equipment: string[];
}

interface Nutrient {
  name: string;
  amount: number;
  unit: string;
  percentOfDailyNeeds: number;
}

export interface RecipeDetail {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  sourceUrl: string;
  summary: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  diets: string[];
  ingredients: Ingredient[];
  instructions: Step[];
  allNutrients: Nutrient[];
}

interface Props {
  recipe: RecipeDetail | null;
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToMealPlan?: (recipe: RecipeDetail) => void;
}

export default function RecipeDetailDialog({ recipe, isLoading, open, onOpenChange, onAddToMealPlan }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : recipe ? (
          <>
            {recipe.image && (
              <div className="relative h-48">
                <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <h2 className="font-bold text-lg text-foreground leading-tight">{recipe.title}</h2>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.readyInMinutes} min</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{recipe.servings} servings</span>
                  </div>
                </div>
              </div>
            )}
            {!recipe.image && (
              <DialogHeader className="px-4 pt-4">
                <DialogTitle>{recipe.title}</DialogTitle>
              </DialogHeader>
            )}

            {/* Macro bar */}
            <div className="px-4 py-2 flex gap-3 text-xs font-semibold border-b border-border">
              <span className="text-primary">{recipe.calories} kcal</span>
              <span className="text-foreground">P: {recipe.protein_g}g</span>
              <span className="text-muted-foreground">C: {recipe.carbs_g}g</span>
              <span className="text-destructive">F: {recipe.fat_g}g</span>
              <span className="text-accent-foreground">Fiber: {recipe.fiber_g}g</span>
            </div>

            <ScrollArea className="flex-1 max-h-[45vh]">
              <Tabs defaultValue="ingredients" className="px-4 pb-4">
                <TabsList className="w-full mb-3">
                  <TabsTrigger value="ingredients" className="flex-1 text-xs">Ingredients</TabsTrigger>
                  <TabsTrigger value="instructions" className="flex-1 text-xs">Instructions</TabsTrigger>
                  <TabsTrigger value="nutrition" className="flex-1 text-xs">Nutrition</TabsTrigger>
                </TabsList>

                <TabsContent value="ingredients" className="space-y-2">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border/50 last:border-0">
                      {ing.image && <img src={ing.image} alt={ing.name} className="h-8 w-8 rounded object-cover" />}
                      <span className="text-sm flex-1">{ing.original}</span>
                      {ing.aisle && <Badge variant="outline" className="text-[9px] shrink-0">{ing.aisle}</Badge>}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="instructions" className="space-y-3">
                  {recipe.instructions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No step-by-step instructions available.
                      {recipe.sourceUrl && (
                        <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer"
                           className="flex items-center justify-center gap-1 text-primary mt-2">
                          View on source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </p>
                  ) : recipe.instructions.map((step) => (
                    <div key={step.number} className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                        {step.number}
                      </div>
                      <p className="text-sm leading-relaxed">{step.step}</p>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="nutrition" className="space-y-1">
                  {recipe.allNutrients
                    .filter(n => n.percentOfDailyNeeds > 0)
                    .sort((a, b) => b.percentOfDailyNeeds - a.percentOfDailyNeeds)
                    .slice(0, 20)
                    .map((n, i) => (
                      <div key={i} className="flex items-center gap-2 py-1">
                        <span className="text-xs w-28 truncate">{n.name}</span>
                        <Progress value={Math.min(n.percentOfDailyNeeds, 100)} className="flex-1 h-1.5" />
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {n.amount}{n.unit} ({n.percentOfDailyNeeds}%)
                        </span>
                      </div>
                    ))}
                </TabsContent>
              </Tabs>
            </ScrollArea>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-border flex gap-2">
              {onAddToMealPlan && (
                <Button size="sm" className="flex-1" onClick={() => onAddToMealPlan(recipe)}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add to Meal Plan
                </Button>
              )}
              {recipe.sourceUrl && (
                <Button size="sm" variant="outline" asChild>
                  <a href={recipe.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              )}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
