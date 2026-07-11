import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Pill, Clock, CheckCircle2, XCircle, Apple, AlertTriangle, BookOpen, Droplets } from 'lucide-react';
import { AmazonBuyButton } from './AmazonBuyButton';
import { NutritionFactsPanel } from './NutritionFactsPanel';
import { cn } from '@/lib/utils';

interface SupplementDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplement: any;
  affiliateTag?: string;
}

export function SupplementDetailDialog({ open, onOpenChange, supplement, affiliateTag }: SupplementDetailDialogProps) {
  if (!supplement) return null;

  const s = supplement;
  const isOil = s.product_type === 'essential_oil' || s.product_type === 'blend';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isOil ? <Droplets className="h-5 w-5 text-primary" /> : <Pill className="h-5 w-5 text-primary" />}
            {s.name}
          </DialogTitle>
          {s.pt_supplement_brands?.name && (
            <p className="text-sm text-muted-foreground">by {s.pt_supplement_brands.name}</p>
          )}
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-2">
          <TabsList className="w-full grid grid-cols-4 text-xs">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="timing" className="text-xs">Timing</TabsTrigger>
            <TabsTrigger value="interactions" className="text-xs">Interactions</TabsTrigger>
            <TabsTrigger value="nutrition" className="text-xs">Nutrition</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3 mt-3">
            {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
            {s.health_guide && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex gap-2">
                    <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">{s.health_guide}</p>
                  </div>
                </CardContent>
              </Card>
            )}
            {s.recommended_dose && (
              <div className="text-sm">
                <span className="text-muted-foreground">Recommended Dose: </span>
                <span className="font-medium">{s.recommended_dose}</span>
              </div>
            )}
            {s.benefits && s.benefits.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">Benefits</p>
                <div className="flex flex-wrap gap-1">
                  {s.benefits.map((b: string) => (
                    <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>
                  ))}
                </div>
              </div>
            )}
            {s.amazon_asin && (
              <AmazonBuyButton asin={s.amazon_asin} affiliateTag={affiliateTag} supplementName={s.name} size="default" className="w-full" />
            )}
          </TabsContent>

          <TabsContent value="timing" className="space-y-3 mt-3">
            {s.best_time_to_take ? (
              <Card>
                <CardContent className="p-4 flex items-start gap-3">
                  <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Best Time to Take</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.best_time_to_take}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No timing data available yet.</p>
            )}
          </TabsContent>

          <TabsContent value="interactions" className="space-y-3 mt-3">
            {s.take_with && s.take_with.length > 0 && (
              <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Take With</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.take_with.map((item: string) => (
                      <Badge key={item} className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">{item}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {s.avoid_with && s.avoid_with.length > 0 && (
              <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-400">Avoid With</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.avoid_with.map((item: string) => (
                      <Badge key={item} className="bg-red-100 text-red-700 border-red-200 text-xs">{item}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {(!s.take_with || s.take_with.length === 0) && (!s.avoid_with || s.avoid_with.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No interaction data available yet.</p>
            )}
          </TabsContent>

          <TabsContent value="nutrition" className="space-y-3 mt-3">
            {s.nutrition_facts && Object.keys(s.nutrition_facts).length > 0 && (
              <NutritionFactsPanel nutritionFacts={s.nutrition_facts} servingSize={s.serving_size} />
            )}
            {s.food_sources && s.food_sources.length > 0 && (
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Apple className="h-4 w-4 text-green-600" />
                    <p className="text-sm font-medium">Natural Food Sources</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.food_sources.map((f: string) => (
                      <Badge key={f} variant="outline" className="text-xs">{f}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {s.deficiency_signs && s.deficiency_signs.length > 0 && (
              <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Signs of Deficiency</p>
                  </div>
                  <ul className="space-y-1">
                    {s.deficiency_signs.map((sign: string) => (
                      <li key={sign} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                        {sign}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {(!s.nutrition_facts || Object.keys(s.nutrition_facts).length === 0) && (!s.food_sources || s.food_sources.length === 0) && (!s.deficiency_signs || s.deficiency_signs.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-6">No nutrition data available yet.</p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
