import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { ModuleSelectionStep } from '@/components/onboarding/ModuleSelectionStep';
import { CompanySetupStep } from '@/components/onboarding/CompanySetupStep';
import { Home, LayoutDashboard, User } from 'lucide-react';

const STEPS = ['Select Modules', 'Company Setup'];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Get current user info
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || null);
        setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || null);
      }
    };
    getUser();
  }, []);

  const handleModuleToggle = (slug: string) => {
    setSelectedModules(prev => 
      prev.includes(slug) 
        ? prev.filter(s => s !== slug)
        : [...prev, slug]
    );
  };

  const handleCreateCompany = async (companyName: string) => {
    setIsLoading(true);
    try {
      // Use the transactional RPC to create workspace
      const { data, error } = await supabase.rpc('create_workspace', {
        company_name: companyName,
        selected_module_slugs: selectedModules
      });

      if (error) throw error;

      toast({
        title: "Welcome to your workspace!",
        description: `${companyName} is ready. Your 14-day trial has started.`
      });

      navigate('/module-hub');
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating company:', error);
      toast({
        title: "Error creating company",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-secondary/10">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          </div>
          
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{userName || 'User'}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <Avatar className="h-8 w-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {userName?.charAt(0)?.toUpperCase() || userEmail?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <OnboardingProgress 
          currentStep={currentStep} 
          totalSteps={STEPS.length} 
          steps={STEPS} 
        />
        
        <Card className="w-full max-w-lg backdrop-blur-sm bg-card/95 border-border/50 shadow-lg">
          <CardContent className="p-6">
            {currentStep === 1 && (
              <ModuleSelectionStep
                selectedModules={selectedModules}
                onModuleToggle={handleModuleToggle}
                onContinue={() => setCurrentStep(2)}
              />
            )}
            
            {currentStep === 2 && (
              <CompanySetupStep
                onSubmit={handleCreateCompany}
                onBack={() => setCurrentStep(1)}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
        
        <Button 
          variant="ghost" 
          className="mt-6 text-muted-foreground hover:text-foreground" 
          onClick={handleLogout}
          disabled={isLoading}
        >
          Sign Out
        </Button>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
              <span className="hidden sm:inline">•</span>
              <Link to="/help" className="hover:text-foreground transition-colors">Help & Support</Link>
              <span className="hidden sm:inline">•</span>
              <Link to="/settings" className="hover:text-foreground transition-colors">Settings</Link>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} All Business 365. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
