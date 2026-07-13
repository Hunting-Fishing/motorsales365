import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Trophy, Users, Play, CheckCircle, Lock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LearningPathDetail } from './LearningPathDetail';

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  estimated_duration: string;
  target_role: string;
  prerequisites: any;
  learning_objectives: any;
  completion_reward: string;
  articles: any;
  is_active: boolean;
}

export const LearningPathViewer: React.FC = () => {
  const navigate = useNavigate();
  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [selectedPath, setSelectedPath] = useState<LearningPath | null>(null);
  const [userProgress, setUserProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchLearningPaths();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      fetchUserProgress(user.id);
    }
  };

  const fetchUserProgress = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setUserProgress(data || []);
    } catch (error) {
      console.error('Error fetching user progress:', error);
    }
  };

  const fetchLearningPaths = async () => {
    try {
      const { data, error } = await supabase
        .from('help_learning_paths')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLearningPaths((data as any) || []);
    } catch (error) {
      console.error('Error fetching learning paths:', error);
      toast({
        title: "Error",
        description: "Failed to load learning paths",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPathProgress = (pathId: string) => {
    if (!currentUser) return { completed: 0, total: 0, percentage: 0 };
    
    const pathProgress = userProgress.filter(p => p.learning_path_id === pathId);
    const articleProgress = userProgress.filter(p => p.progress_type === 'article');
    
    // Get articles for this path
    const path = learningPaths.find(p => p.id === pathId);
    const pathArticles = path?.articles || [];
    const totalArticles = Array.isArray(pathArticles) ? pathArticles.length : 0;
    
    if (totalArticles === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completedArticles = pathArticles.filter((article: any) => 
      articleProgress.some(p => p.article_id === article.id && p.status === 'completed')
    ).length;
    
    return {
      completed: completedArticles,
      total: totalArticles,
      percentage: Math.round((completedArticles / totalArticles) * 100)
    };
  };

  const startLearningPath = (pathId: string) => {
    // Navigate to detailed learning path view
    window.location.href = `/help/path/${pathId}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Learning Paths</h2>
            <p className="text-muted-foreground">Structured learning journeys</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-20 mb-2"></div>
                <div className="h-6 bg-muted rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted rounded mb-4"></div>
                <div className="h-4 bg-muted rounded w-24 mb-4"></div>
                <div className="h-2 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Learning Paths</h2>
          <p className="text-muted-foreground">Structured learning journeys</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learningPaths.map((path) => {
          const progress = getPathProgress(path.id);
          const hasStarted = progress.percentage > 0;
          
          return (
            <Card key={path.id} className="cursor-pointer hover:shadow-lg transition-shadow group">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getDifficultyColor(path.difficulty_level)}>
                    {path.difficulty_level}
                  </Badge>
                  {progress.percentage === 100 && (
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
                <CardTitle className="text-lg group-hover:text-primary transition-colors">
                  {path.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">{path.description}</p>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{path.estimated_duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>{path.target_role}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{progress.total} articles</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {progress.completed} of {progress.total} articles completed
                  </p>
                </div>

                <Button 
                  className="w-full group-hover:shadow-md transition-shadow"
                  onClick={(e) => {
                    e.stopPropagation();
                    startLearningPath(path.id);
                  }}
                  variant={hasStarted ? "outline" : "default"}
                >
                  {progress.percentage === 100 ? (
                    <>
                      <Trophy className="h-4 w-4 mr-2" />
                      Review
                    </>
                  ) : hasStarted ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Continue
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Start Learning
                    </>
                  )}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {learningPaths.length === 0 && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Learning Paths Available</h3>
            <p className="text-muted-foreground">Learning paths will appear here when available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};