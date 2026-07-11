import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, BookOpen } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useRecipeSearch, useRecipeDetails } from '@/hooks/useNutrition';
import RecipeCard, { type RecipeResult } from './RecipeCard';
import RecipeDetailDialog, { type RecipeDetail } from './RecipeDetailDialog';
import { useToast } from '@/hooks/use-toast';

const DIETS = [
  { value: '', label: 'Any Diet' },
  { value: 'gluten free', label: 'Gluten Free' },
  { value: 'ketogenic', label: 'Keto' },
  { value: 'vegetarian', label: 'Vegetarian' },
  { value: 'vegan', label: 'Vegan' },
  { value: 'paleo', label: 'Paleo' },
  { value: 'whole30', label: 'Whole 30' },
  { value: 'pescetarian', label: 'Pescetarian' },
];

interface Props {
  clientId: string;
  shopId: string;
  onAddToMealPlan?: (recipe: RecipeDetail) => void;
}

export default function RecipeSearch({ clientId, shopId, onAddToMealPlan }: Props) {
  const [query, setQuery] = useState('');
  const [diet, setDiet] = useState('');
  const [maxCalories, setMaxCalories] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const searchMutation = useRecipeSearch();
  const detailsMutation = useRecipeDetails();

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;
    searchMutation.mutate({
      query: query.trim(),
      diet: diet || undefined,
      maxCalories: maxCalories ? parseInt(maxCalories) : undefined,
    });
  }, [query, diet, maxCalories]);

  const handleRecipeClick = (recipe: RecipeResult) => {
    setSelectedRecipeId(recipe.id);
    setDialogOpen(true);
    detailsMutation.mutate(recipe.id);
  };

  const handleAddToMealPlan = (recipe: RecipeDetail) => {
    if (onAddToMealPlan) {
      onAddToMealPlan(recipe);
    }
    toast({ title: 'Recipe added to meal plan!' });
    setDialogOpen(false);
  };

  const results = (searchMutation.data?.results || []) as RecipeResult[];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Recipe Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search recipes (e.g. chicken salad, keto pancakes)..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={searchMutation.isPending || !query.trim()}>
              {searchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Select value={diet} onValueChange={setDiet}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Any Diet" /></SelectTrigger>
              <SelectContent>
                {DIETS.map(d => <SelectItem key={d.value || 'any'} value={d.value || 'any'}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="Max kcal"
              type="number"
              value={maxCalories}
              onChange={e => setMaxCalories(e.target.value)}
              className="w-28"
            />
          </div>
        </CardContent>
      </Card>

      {searchMutation.isPending && (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {results.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={() => handleRecipeClick(recipe)} />
          ))}
        </div>
      )}

      {searchMutation.isSuccess && results.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No recipes found. Try a different search.</p>
          </CardContent>
        </Card>
      )}

      <RecipeDetailDialog
        recipe={detailsMutation.data as RecipeDetail | null}
        isLoading={detailsMutation.isPending}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onAddToMealPlan={handleAddToMealPlan}
      />
    </div>
  );
}
