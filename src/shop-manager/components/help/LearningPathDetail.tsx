import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Clock, 
  Trophy, 
  Users, 
  Play, 
  CheckCircle, 
  Lock, 
  ArrowLeft,
  Target,
  Award,
  ChevronRight,
  Circle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Article {
  id: string;
  title: string;
  order: number;
  estimated_read_time: number;
  difficulty_level: string;
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  estimated_duration: string;
  target_role: string;
  prerequisites: any;
  learning_objectives?: any;
  completion_reward?: string;
  articles: any;
  is_active: boolean;
}

interface UserProgress {
  user_id: string;
  learning_path_id?: string;
  article_id?: string;
  progress_type: string;
  status: string;
  started_at?: string;
  completed_at?: string;
}

export const LearningPathDetail: React.FC = () => {
  const { pathId } = useParams<{ pathId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    if (pathId) {
      fetchLearningPath();
      fetchUserProgress();
    }
  }, [pathId]);

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchLearningPath = async () => {
    try {
      const { data, error } = await supabase
        .from('help_learning_paths')
        .select('*')
        .eq('id', pathId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      setLearningPath(data as any);
    } catch (error) {
      console.error('Error fetching learning path:', error);
      toast({
        title: "Error",
        description: "Failed to load learning path",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProgress = async () => {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', currentUser.id);

      if (error) throw error;
      setUserProgress((data as any) || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const startLearningPath = async () => {
    if (!currentUser || !learningPath) return;

    try {
      const { error } = await supabase
        .from('user_progress')
        .insert({
          user_id: currentUser.id,
          progress_type: 'learning_path',
          content_id: learningPath.id,
          status: 'in_progress',
          started_at: new Date().toISOString()
        });

      if (error) throw error;

      // Start with first article
      if (learningPath.articles && learningPath.articles.length > 0) {
        const firstArticle = learningPath.articles.sort((a, b) => a.order - b.order)[0];
        navigate(`/help?id=${firstArticle.id}`);
      }

      toast({
        title: "Learning Path Started",
        description: "You've begun your learning journey!",
      });

      fetchUserProgress();
    } catch (error) {
      console.error('Error starting learning path:', error);
      toast({
        title: "Error",
        description: "Failed to start learning path",
        variant: "destructive",
      });
    }
  };

  const getArticleProgress = (articleId: string) => {
    return userProgress.find(p => 
      p.progress_type === 'article' && 
      p.article_id === articleId
    );
  };

  const getCompletionPercentage = () => {
    if (!learningPath?.articles) return 0;
    const completed = learningPath.articles.filter(article => 
      getArticleProgress(article.id)?.status === 'completed'
    ).length;
    return Math.round((completed / learningPath.articles.length) * 100);
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPathStatus = () => {
    const hasStarted = userProgress.some(p => p.learning_path_id === pathId);
    const completionPercentage = getCompletionPercentage();
    
    if (completionPercentage === 100) return 'completed';
    if (hasStarted || completionPercentage > 0) return 'in_progress';
    return 'not_started';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!learningPath) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Learning Path Not Found</h3>
            <p className="text-muted-foreground mb-4">
              The learning path you're looking for doesn't exist or has been removed.
            </p>
            <Button onClick={() => navigate('/help')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Help Center
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completionPercentage = getCompletionPercentage();
  const pathStatus = getPathStatus();
  const sortedArticles = learningPath.articles?.sort((a, b) => a.order - b.order) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/help')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Help Center
        </Button>
      </div>

      {/* Path Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge className={getDifficultyColor(learningPath.difficulty_level)}>
                  {learningPath.difficulty_level}
                </Badge>
                <Badge variant="outline">
                  <Users className="h-3 w-3 mr-1" />
                  {learningPath.target_role}
                </Badge>
              </div>
              <CardTitle className="text-2xl mb-2">{learningPath.title}</CardTitle>
              <p className="text-muted-foreground">{learningPath.description}</p>
            </div>
            <div className="ml-6">
              {pathStatus === 'completed' ? (
                <div className="text-center">
                  <Trophy className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
                  <Badge variant="secondary" className="text-yellow-700 bg-yellow-50">
                    Completed
                  </Badge>
                </div>
              ) : (
                <Button 
                  onClick={startLearningPath} 
                  size="lg"
                  disabled={pathStatus === 'in_progress'}
                >
                  {pathStatus === 'not_started' ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Learning
                    </>
                  ) : (
                    <>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Continue
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{sortedArticles.filter(a => getArticleProgress(a.id)?.status === 'completed').length} of {sortedArticles.length} articles completed</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{learningPath.estimated_duration}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Learning Objectives */}
          {learningPath.learning_objectives && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Learning Objectives
              </h4>
              <ul className="space-y-2">
                {(Array.isArray(learningPath.learning_objectives) ? learningPath.learning_objectives : []).map((objective, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                    {objective}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {learningPath.prerequisites && Array.isArray(learningPath.prerequisites) && learningPath.prerequisites.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Prerequisites</h4>
              <ul className="space-y-1">
                {learningPath.prerequisites.map((prereq, index) => (
                  <li key={index} className="text-sm text-muted-foreground">
                    • {prereq}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Completion Reward */}
          {learningPath.completion_reward && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-5 w-5 text-yellow-600" />
                <h4 className="font-semibold text-yellow-800">Completion Reward</h4>
              </div>
              <p className="text-sm text-yellow-700">{learningPath.completion_reward}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle>Learning Path Articles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedArticles.map((article, index) => {
              const progress = getArticleProgress(article.id);
              const isCompleted = progress?.status === 'completed';
              const isAccessible = index === 0 || sortedArticles.slice(0, index).every(prev => 
                getArticleProgress(prev.id)?.status === 'completed'
              );

              return (
                <div key={article.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : isAccessible ? (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    ) : (
                      <Lock className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h5 className="font-medium">{article.title}</h5>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>Article {article.order}</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{article.estimated_read_time} min</span>
                      </div>
                      <Badge variant="outline">
                        {article.difficulty_level}
                      </Badge>
                    </div>
                  </div>

                  <Button
                    variant={isCompleted ? "outline" : "default"}
                    size="sm"
                    disabled={!isAccessible}
                    onClick={() => navigate(`/help?id=${article.id}`)}
                  >
                    {isCompleted ? 'Review' : 'Read'}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};