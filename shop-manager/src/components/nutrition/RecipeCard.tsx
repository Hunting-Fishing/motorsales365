import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Flame, Beef } from 'lucide-react';

export interface RecipeResult {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  diets: string[];
  dishTypes: string[];
}

interface Props {
  recipe: RecipeResult;
  onClick: () => void;
}

export default function RecipeCard({ recipe, onClick }: Props) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={onClick}>
      <div className="relative h-36 bg-muted">
        {recipe.image ? (
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-2xl">🍽️</div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {recipe.diets.slice(0, 2).map(d => (
            <Badge key={d} variant="secondary" className="text-[10px] bg-background/80 backdrop-blur-sm">{d}</Badge>
          ))}
        </div>
      </div>
      <CardContent className="p-3 space-y-2">
        <h4 className="font-semibold text-sm line-clamp-2 leading-tight">{recipe.title}</h4>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{recipe.readyInMinutes}m</span>
          <span className="flex items-center gap-1"><Flame className="h-3 w-3" />{recipe.calories} kcal</span>
          <span className="flex items-center gap-1"><Beef className="h-3 w-3" />{recipe.protein_g}g</span>
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <span>C: {recipe.carbs_g}g</span>
          <span>F: {recipe.fat_g}g</span>
          <span>Servings: {recipe.servings}</span>
        </div>
      </CardContent>
    </Card>
  );
}
