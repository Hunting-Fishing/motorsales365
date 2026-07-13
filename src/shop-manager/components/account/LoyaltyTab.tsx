import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Star, Gift, Truck, Calendar, Percent } from 'lucide-react';
import { 
  getLoyaltyPointTransactions, 
  getTierBenefits 
} from '@/services/loyaltyService';
import { LoyaltyPoints, LoyaltyPointTransaction } from '@/types/phase3';

interface LoyaltyTabProps {
  loyaltyPoints: LoyaltyPoints | null;
  userId: string;
}

export const LoyaltyTab = ({ loyaltyPoints, userId }: LoyaltyTabProps) => {
  const [transactions, setTransactions] = useState<LoyaltyPointTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      loadTransactions();
    }
  }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await getLoyaltyPointTransactions(userId, 20);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading loyalty transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'platinum': return 'bg-gradient-to-r from-slate-900 to-slate-700 text-white';
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black';
      default: return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white';
    }
  };

  const getNextTierProgress = () => {
    if (!loyaltyPoints) return { nextTier: 'silver', pointsNeeded: 1000, progress: 0 };

    const tiers = {
      bronze: { next: 'silver', threshold: 1000 },
      silver: { next: 'gold', threshold: 5000 },
      gold: { next: 'platinum', threshold: 10000 },
      platinum: { next: null, threshold: 10000 }
    };

    const currentTier = tiers[loyaltyPoints.tier as keyof typeof tiers];
    if (!currentTier.next) {
      return { nextTier: null, pointsNeeded: 0, progress: 100 };
    }

    const pointsNeeded = currentTier.threshold - loyaltyPoints.points_earned;
    const progress = (loyaltyPoints.points_earned / currentTier.threshold) * 100;

    return {
      nextTier: currentTier.next,
      pointsNeeded: Math.max(0, pointsNeeded),
      progress: Math.min(100, progress)
    };
  };

  const tierProgress = getNextTierProgress();
  const benefits = loyaltyPoints ? getTierBenefits(loyaltyPoints.tier) : null;

  if (!loyaltyPoints) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Gift className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Welcome to our Loyalty Program!</h3>
          <p className="text-muted-foreground text-center">
            Start earning points with your first purchase
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loyalty Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Loyalty Status</CardTitle>
              <CardDescription>Earn points with every purchase and unlock exclusive benefits</CardDescription>
            </div>
            <Badge className={`px-4 py-2 text-sm font-semibold ${getTierColor(loyaltyPoints.tier)}`}>
              {loyaltyPoints.tier.toUpperCase()} MEMBER
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary">{loyaltyPoints.points_balance}</p>
              <p className="text-sm text-muted-foreground">Available Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{loyaltyPoints.points_earned}</p>
              <p className="text-sm text-muted-foreground">Total Earned</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{loyaltyPoints.points_spent}</p>
              <p className="text-sm text-muted-foreground">Total Spent</p>
            </div>
          </div>

          {tierProgress.nextTier && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to {tierProgress.nextTier} tier</span>
                <span>{tierProgress.pointsNeeded} points needed</span>
              </div>
              <Progress value={tierProgress.progress} className="h-3" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Benefits */}
      {benefits && (
        <Card>
          <CardHeader>
            <CardTitle>Your Current Benefits</CardTitle>
            <CardDescription>Enjoy these perks as a {loyaltyPoints.tier} member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <Star className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium">{benefits.pointsMultiplier}x Points Multiplier</p>
                  <p className="text-sm text-muted-foreground">Earn more on every purchase</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                <Truck className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Free Shipping</p>
                  <p className="text-sm text-muted-foreground">
                    On orders ${benefits.freeShippingThreshold}+
                  </p>
                </div>
              </div>
              {benefits.earlyAccess && (
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="font-medium">Early Access</p>
                    <p className="text-sm text-muted-foreground">To sales and new products</p>
                  </div>
                </div>
              )}
              {benefits.specialDiscounts > 0 && (
                <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                  <Percent className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="font-medium">{benefits.specialDiscounts}% Member Discount</p>
                    <p className="text-sm text-muted-foreground">On select items</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Points History */}
      <Card>
        <CardHeader>
          <CardTitle>Points History</CardTitle>
          <CardDescription>Track your recent points activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No point transactions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction, index) => (
                <div key={transaction.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-medium ${
                        transaction.transaction_type === 'earned' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'earned' ? '+' : ''}{transaction.points}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {transaction.transaction_type}
                      </p>
                    </div>
                  </div>
                  {index < transactions.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* How to Earn Points */}
      <Card>
        <CardHeader>
          <CardTitle>How to Earn Points</CardTitle>
          <CardDescription>Different ways to grow your points balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span>Make a purchase</span>
              <span className="font-medium">1 point per $1 spent</span>
            </div>
            <div className="flex justify-between">
              <span>Write a product review</span>
              <span className="font-medium">50 points</span>
            </div>
            <div className="flex justify-between">
              <span>Refer a friend</span>
              <span className="font-medium">500 points</span>
            </div>
            <div className="flex justify-between">
              <span>Birthday bonus</span>
              <span className="font-medium">100 points</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};