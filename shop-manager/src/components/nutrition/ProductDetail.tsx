import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useScoreFood } from '@/hooks/useNutrition';

interface Props {
  product: any;
  clientId?: string;
  shopId?: string;
  onBack: () => void;
  onLogFood?: (product: any) => void;
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{Math.round(value)}/100</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function ProductDetail({ product, clientId, shopId, onBack, onLogFood }: Props) {
  const scoreMutation = useScoreFood();
  const [scores, setScores] = React.useState<any>(null);

  React.useEffect(() => {
    if (product?.id && clientId && shopId) {
      scoreMutation.mutateAsync({ productId: product.id, clientId, shopId }).then(setScores);
    }
  }, [product?.id]);

  const nutrients = product?.nt_food_product_nutrients || [];
  const ingredients = product?.nt_food_product_ingredients || [];
  const existingScores = product?.nt_food_quality_scores?.[0];
  const displayScores = scores || existingScores;

  const macroNutrients = ['calories', 'protein', 'carbohydrates', 'fat', 'fiber', 'sugar', 'sodium', 'saturated_fat'];

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Search
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            {product.image_url && <img src={product.image_url} alt={product.name} className="h-20 w-20 rounded-xl object-cover" />}
            <div className="flex-1">
              <CardTitle className="text-lg">{product.name}</CardTitle>
              {product.brand && <p className="text-sm text-muted-foreground mt-0.5">{product.brand}</p>}
              <div className="flex gap-2 mt-2">
                {product.nutriscore_grade && (
                  <Badge className={`uppercase font-bold ${product.nutriscore_grade <= 'b' ? 'bg-green-500' : product.nutriscore_grade <= 'c' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                    Nutri-Score {product.nutriscore_grade}
                  </Badge>
                )}
                {product.nova_group && (
                  <Badge variant="outline">NOVA {product.nova_group}</Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Nutrition Facts */}
      <Card>
        <CardHeader><CardTitle className="text-base">Nutrition Facts (per 100g)</CardTitle></CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {macroNutrients.map(name => {
              const n = nutrients.find((nt: any) => nt.nutrient_name === name);
              if (!n) return null;
              return (
                <div key={name} className="flex justify-between py-2 text-sm">
                  <span className="capitalize font-medium">{name.replace('_', ' ')}</span>
                  <span>{Math.round(n.amount * 10) / 10} {n.unit}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Score Breakdown */}
      {displayScores && (
        <Card>
          <CardHeader><CardTitle className="text-base">Quality Scores</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <ScoreBar label="Overall Score" value={displayScores.overall_score} />
            <ScoreBar label="Nutrition Density" value={displayScores.nutrition_density} />
            <ScoreBar label="Goal Fit" value={displayScores.goal_fit} />
            <ScoreBar label="Ingredient Quality" value={displayScores.ingredient_quality} />
          </CardContent>
        </Card>
      )}

      {/* Ingredients */}
      {ingredients.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ingredients</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {ingredients.sort((a: any, b: any) => a.position - b.position).map((ing: any, idx: number) => (
                <Badge key={idx} variant={ing.is_additive ? 'destructive' : 'outline'} className="text-xs">
                  {ing.is_additive && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {ing.ingredient_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {onLogFood && (
        <Button onClick={() => onLogFood(product)} className="w-full" size="lg">
          <Plus className="h-4 w-4 mr-2" /> Log This Food
        </Button>
      )}
    </div>
  );
}
