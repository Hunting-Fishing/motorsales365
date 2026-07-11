import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ShoppingCart, Printer, ChefHat, Clock, Lightbulb } from 'lucide-react';
import { useMealPlans } from '@/hooks/useNutrition';
import { useState } from 'react';

interface Props {
  clientId: string;
  shopId: string;
}

const PREP_TIPS = [
  "Cook proteins in bulk on Sunday — portion into containers for the week",
  "Pre-chop vegetables and store in airtight containers for 3-4 days",
  "Cook grains like rice & quinoa in batches — they freeze well for 3 months",
  "Hard-boil eggs at the start of the week for quick snacks",
  "Marinate meats overnight for better flavor with minimal prep time",
  "Pre-portion snacks into bags to avoid overeating",
];

export default function GroceryList({ clientId, shopId }: Props) {
  const { data: plans = [] } = useMealPlans(clientId, shopId);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showTips, setShowTips] = useState(false);

  const activePlan = plans[0];
  const rawGroceryList = (activePlan?.grocery_list || []) as any[];
  const meals = (activePlan?.meals || []) as any[];

  // Build aggregated grocery list from all meals if no grocery_list exists
  const groceryList = useMemo(() => {
    if (rawGroceryList.length > 0) return rawGroceryList;
    // Aggregate from meals
    const items: Record<string, { item: string; category: string; meals: string[] }> = {};
    meals.forEach((meal: any) => {
      (meal.foods || []).forEach((food: string) => {
        const key = food.toLowerCase().trim();
        if (!items[key]) items[key] = { item: food, category: 'General', meals: [] };
        items[key].meals.push(meal.name || meal.meal_type);
      });
    });
    return Object.values(items);
  }, [rawGroceryList, meals]);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, any[]> = {};
    groceryList.forEach((item: any) => {
      const cat = item.category || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [groceryList]);

  const toggleItem = (itemName: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemName)) next.delete(itemName);
      else next.add(itemName);
      return next;
    });
  };

  const checkedCount = checkedItems.size;
  const totalCount = groceryList.length;

  const handlePrint = () => {
    const text = Object.entries(grouped).map(([cat, items]) =>
      `\n${cat}\n${'─'.repeat(20)}\n${items.map((item: any) => `${checkedItems.has(item.item) ? '✓' : '○'} ${item.item}${item.quantity ? ` — ${item.quantity}` : ''}`).join('\n')}`
    ).join('\n');
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<pre style="font-family: system-ui; font-size: 14px; padding: 20px;">🛒 Grocery List\n${text}</pre>`);
      w.print();
    }
  };

  if (groceryList.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Generate a meal plan first to see your grocery list</p>
          <p className="text-xs text-muted-foreground mt-1">Go to Meal Plans → AI Meal Plan → Generate</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            Grocery List
          </h3>
          <p className="text-xs text-muted-foreground">{checkedCount}/{totalCount} items checked</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowTips(!showTips)}>
            <Lightbulb className="h-3 w-3 mr-1" />Prep Tips
          </Button>
          <Button variant="outline" size="sm" className="text-xs" onClick={handlePrint}>
            <Printer className="h-3 w-3 mr-1" />Print
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: totalCount > 0 ? `${(checkedCount / totalCount) * 100}%` : '0%' }}
        />
      </div>

      {/* Meal Prep Tips */}
      {showTips && (
        <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-amber-600" />Meal Prep Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {PREP_TIPS.map((tip, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Grouped items */}
      {Object.entries(grouped).map(([category, items]) => (
        <Card key={category}>
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1">
              {items.map((item: any, idx: number) => {
                const isChecked = checkedItems.has(item.item);
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 py-1.5 px-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors ${isChecked ? 'opacity-50' : ''}`}
                    onClick={() => toggleItem(item.item)}
                  >
                    <Checkbox checked={isChecked} />
                    <span className={`text-sm flex-1 ${isChecked ? 'line-through text-muted-foreground' : ''}`}>
                      {item.item}
                    </span>
                    {item.quantity && (
                      <span className="text-xs text-muted-foreground">{item.quantity}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
