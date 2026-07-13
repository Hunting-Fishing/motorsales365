import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trophy, Award, Star, Gift, Users, TrendingUp, Medal, Crown } from 'lucide-react';
import { useSafetyGamification } from '@/hooks/useSafetyGamification';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useShopId } from '@/hooks/useShopId';
import { format } from 'date-fns';

const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
const rankIcons = [Crown, Medal, Award];

export default function SafetyGamification() {
  const { config, ledger, rewards, leaderboard, isLoading, totalPointsAwarded, awardPoints, createReward } = useSafetyGamification();
  const { shopId } = useShopId();
  const [awardOpen, setAwardOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [awardData, setAwardData] = useState({ employee_id: '', action_type: '', description: '' });
  const [rewardData, setRewardData] = useState({ reward_name: '', points_required: 100, reward_type: 'badge' as const, description: '' });

  const employeesQuery = useQuery({
    queryKey: ['employees-for-points', shopId],
    queryFn: async () => {
      if (!shopId) return [];
      const { data } = await supabase.from('profiles').select('id, first_name, last_name').eq('shop_id', shopId);
      return data || [];
    },
    enabled: !!shopId,
  });

  const handleAward = () => {
    const pointsConfig = config.find(c => c.action_type === awardData.action_type);
    if (pointsConfig) {
      awardPoints.mutate({
        employee_id: awardData.employee_id,
        action_type: awardData.action_type,
        points: pointsConfig.points_value,
        description: awardData.description || pointsConfig.description || undefined,
      });
    }
    setAwardOpen(false);
    setAwardData({ employee_id: '', action_type: '', description: '' });
  };

  const handleCreateReward = () => {
    createReward.mutate(rewardData);
    setRewardOpen(false);
    setRewardData({ reward_name: '', points_required: 100, reward_type: 'badge', description: '' });
  };

  return (
    <>
      <Helmet>
        <title>Safety Rewards | Safety Management</title>
      </Helmet>

      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Safety Rewards
            </h1>
            <p className="text-muted-foreground mt-1">Gamify safety participation with points and rewards</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={awardOpen} onOpenChange={setAwardOpen}>
              <DialogTrigger asChild>
                <Button><Star className="h-4 w-4 mr-2" />Award Points</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Award Safety Points</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Employee</Label>
                    <Select value={awardData.employee_id} onValueChange={(v) => setAwardData({ ...awardData, employee_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employeesQuery.data?.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.first_name} {emp.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Action Type</Label>
                    <Select value={awardData.action_type} onValueChange={(v) => setAwardData({ ...awardData, action_type: v })}>
                      <SelectTrigger><SelectValue placeholder="Select action" /></SelectTrigger>
                      <SelectContent>
                        {config.filter(c => c.is_active).map(c => (
                          <SelectItem key={c.action_type} value={c.action_type}>
                            {c.description} (+{c.points_value} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description (optional)</Label>
                    <Input value={awardData.description} onChange={(e) => setAwardData({ ...awardData, description: e.target.value })} />
                  </div>
                  <Button onClick={handleAward} className="w-full" disabled={!awardData.employee_id || !awardData.action_type}>
                    Award Points
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={rewardOpen} onOpenChange={setRewardOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Gift className="h-4 w-4 mr-2" />Add Reward</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create Reward</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Reward Name</Label>
                    <Input value={rewardData.reward_name} onChange={(e) => setRewardData({ ...rewardData, reward_name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Points Required</Label>
                    <Input type="number" value={rewardData.points_required} onChange={(e) => setRewardData({ ...rewardData, points_required: parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={rewardData.reward_type} onValueChange={(v: any) => setRewardData({ ...rewardData, reward_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="badge">Badge</SelectItem>
                        <SelectItem value="prize">Prize</SelectItem>
                        <SelectItem value="recognition">Recognition</SelectItem>
                        <SelectItem value="time_off">Time Off</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={rewardData.description} onChange={(e) => setRewardData({ ...rewardData, description: e.target.value })} />
                  </div>
                  <Button onClick={handleCreateReward} className="w-full" disabled={!rewardData.reward_name}>
                    Create Reward
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points Awarded</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPointsAwarded.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{leaderboard.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rewards</CardTitle>
              <Gift className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rewards.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Point Actions</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{config.filter(c => c.is_active).length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-4">
          <TabsList>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            <TabsTrigger value="rewards">Rewards</TabsTrigger>
            <TabsTrigger value="config">Point Values</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard">
            <Card>
              <CardHeader><CardTitle>Safety Champions</CardTitle></CardHeader>
              <CardContent>
                {leaderboard.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No points awarded yet</p>
                ) : (
                  <div className="space-y-3">
                    {leaderboard.map((entry, index) => {
                      const RankIcon = rankIcons[index] || Award;
                      return (
                        <div key={entry.employee_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-3">
                            <div className={`text-2xl font-bold ${rankColors[index] || 'text-muted-foreground'}`}>
                              {index < 3 ? <RankIcon className="h-6 w-6" /> : `#${index + 1}`}
                            </div>
                            <div>
                              <p className="font-medium">{entry.employee_name || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-lg">{entry.total_points.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader><CardTitle>Recent Points Activity</CardTitle></CardHeader>
              <CardContent>
                {ledger.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No activity yet</p>
                ) : (
                  <div className="space-y-2">
                    {ledger.slice(0, 20).map(entry => (
                      <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="font-medium">
                            {entry.employee?.first_name} {entry.employee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">{entry.description || entry.action_type}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-500/10 text-green-600">+{entry.points} pts</Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(entry.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rewards.length === 0 ? (
                <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">No rewards created yet</CardContent></Card>
              ) : (
                rewards.map(reward => (
                  <Card key={reward.id}>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5 text-purple-500" />
                        <CardTitle className="text-base">{reward.reward_name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{reward.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{reward.reward_type}</Badge>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold">{reward.points_required}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="config">
            <Card>
              <CardHeader><CardTitle>Point Values by Action</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {config.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">{item.action_type}</p>
                      </div>
                      <Badge className="bg-primary/10 text-primary">+{item.points_value} pts</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
