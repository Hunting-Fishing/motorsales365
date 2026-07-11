import React, { useEffect, useState } from 'react';
import { Trophy, Star, Award, Target, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface UserStats {
  totalPoints: number;
  articlesCompleted: number;
  pathsCompleted: number;
  currentStreak: number;
  levelName: string;
  timeSpentMinutes: number;
}

interface Achievement {
  id: string;
  achievement_name: string;
  achievement_description: string;
  points_awarded: number;
  icon_name: string;
  earned_at: string;
}

export const UserProgressDashboard: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProgress();
  }, []);

  const fetchUserProgress = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Initialize user points if they don't exist
      await supabase.rpc('initialize_user_points', { user_uuid: user.id });

      // Fetch user stats
      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (pointsData) {
        setStats({
          totalPoints: pointsData.total_points,
          articlesCompleted: pointsData.articles_completed,
          pathsCompleted: pointsData.paths_completed,
          currentStreak: pointsData.current_streak,
          levelName: pointsData.level_name,
          timeSpentMinutes: pointsData.time_spent_total_minutes
        });
      }

      // Fetch achievements
      const { data: achievementsData } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (achievementsData) {
        setAchievements(achievementsData);
      }
    } catch (error) {
      console.error('Error fetching user progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'trophy': return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 'star': return <Star className="h-6 w-6 text-blue-500" />;
      case 'award': return <Award className="h-6 w-6 text-purple-500" />;
      case 'target': return <Target className="h-6 w-6 text-green-500" />;
      default: return <Trophy className="h-6 w-6 text-gray-500" />;
    }
  };

  const getLevelProgress = (points: number) => {
    const levels = [
      { name: 'Beginner', minPoints: 0, maxPoints: 49 },
      { name: 'Learner', minPoints: 50, maxPoints: 149 },
      { name: 'Explorer', minPoints: 150, maxPoints: 299 },
      { name: 'Expert', minPoints: 300, maxPoints: 499 },
      { name: 'Master', minPoints: 500, maxPoints: 999 },
      { name: 'Guru', minPoints: 1000, maxPoints: 9999 }
    ];

    const currentLevel = levels.find(level => points >= level.minPoints && points <= level.maxPoints) || levels[0];
    const nextLevel = levels.find(level => level.minPoints > points);
    
    if (!nextLevel) return { progress: 100, current: currentLevel.name, next: null, pointsToNext: 0 };
    
    const progressInLevel = points - currentLevel.minPoints;
    const levelRange = nextLevel.minPoints - currentLevel.minPoints;
    const progress = (progressInLevel / levelRange) * 100;
    
    return {
      progress,
      current: currentLevel.name,
      next: nextLevel.name,
      pointsToNext: nextLevel.minPoints - points
    };
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Unable to load progress data</p>
        </CardContent>
      </Card>
    );
  }

  const levelInfo = getLevelProgress(stats.totalPoints);

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                <p className="text-2xl font-bold text-primary">{stats.totalPoints}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Articles Read</p>
                <p className="text-2xl font-bold">{stats.articlesCompleted}</p>
              </div>
              <Trophy className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Paths Completed</p>
                <p className="text-2xl font-bold">{stats.pathsCompleted}</p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{stats.currentStreak} days</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Level Progress */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Level Progress</span>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {levelInfo.current}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={levelInfo.progress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{stats.totalPoints} points</span>
              {levelInfo.next && (
                <span>{levelInfo.pointsToNext} points to {levelInfo.next}</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
        <CardHeader>
          <CardTitle>Recent Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {achievements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Complete your first article to earn achievements!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {achievements.slice(0, 5).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getIconComponent(achievement.icon_name)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{achievement.achievement_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {achievement.achievement_description}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">
                      +{achievement.points_awarded} pts
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(achievement.earned_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Spent */}
      {stats.timeSpentMinutes > 0 && (
        <Card className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle>Learning Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {Math.floor(stats.timeSpentMinutes / 60)}h {stats.timeSpentMinutes % 60}m
              </p>
              <p className="text-muted-foreground">Total time spent learning</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};