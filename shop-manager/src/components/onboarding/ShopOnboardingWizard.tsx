import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useShopData } from '@/hooks/useShopData';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { BusinessDetailsStep } from './steps/BusinessDetailsStep';
import { BusinessHoursStep } from './steps/BusinessHoursStep';
import { SampleDataStep } from './steps/SampleDataStep';
import { 
  Building2, 
  Briefcase, 
  Clock, 
  Database, 
  CheckCircle2,
  ChevronRight,
  Loader2,
  Home,
  LayoutDashboard,
  User
} from 'lucide-react';

interface OnboardingData {
  basicInfo: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  businessDetails: {
    taxId?: string;
    businessType?: string;
    industry?: string;
    otherIndustry?: string;
  };
  businessHours: any[];
  sampleData: {
    importCustomers?: boolean;
    importInventory?: boolean;
    importServices?: boolean;
  };
}

const STEPS = [
  { id: 'basic', title: 'Basic Information', icon: Building2, description: 'Shop name, contact & address' },
  { id: 'business', title: 'Business Details', icon: Briefcase, description: 'Industry & business type' },
  { id: 'hours', title: 'Business Hours', icon: Clock, description: 'Operating schedule' },
  { id: 'data', title: 'Sample Data', icon: Database, description: 'Optional demo data' },
];

export function ShopOnboardingWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shopData, refresh } = useShopData();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    basicInfo: {},
    businessDetails: {},
    businessHours: [],
    sampleData: {}
  });

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

  // Load saved progress from database
  useEffect(() => {
    if (shopData?.setup_step !== undefined) {
      setCurrentStep(shopData.setup_step);
    }
    if (shopData?.onboarding_data && typeof shopData.onboarding_data === 'object') {
      setOnboardingData(prev => ({
        ...prev,
        ...(shopData.onboarding_data as Partial<OnboardingData>)
      }));
    }
  }, [shopData?.setup_step, shopData?.onboarding_data]);

  const updateStepProgress = async (step: number, data?: Partial<OnboardingData>) => {
    if (!shopData?.id) return;
    
    try {
      const updatePayload: any = { setup_step: step };
      if (data) {
        updatePayload.onboarding_data = { ...onboardingData, ...data };
      }
      
      await supabase
        .from('shops')
        .update(updatePayload)
        .eq('id', shopData.id);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    await updateStepProgress(nextStep, onboardingData);
  };

  const handlePrevious = () => {
    const prevStep = Math.max(0, currentStep - 1);
    setCurrentStep(prevStep);
    updateStepProgress(prevStep);
  };

  const updateData = (stepKey: keyof OnboardingData, data: any) => {
    setOnboardingData(prev => ({
      ...prev,
      [stepKey]: { ...prev[stepKey], ...data }
    }));
  };

  const completeOnboarding = async () => {
    if (!shopData?.id) return;
    
    setIsCompleting(true);
    try {
      await supabase
        .from('shops')
        .update({ 
          onboarding_completed: true,
          setup_step: STEPS.length,
          onboarding_data: onboardingData as Record<string, any>
        })
        .eq('id', shopData.id);

      toast({
        title: "Setup Complete!",
        description: "Your shop is ready to use. Welcome aboard!",
      });

      refresh();
      navigate('/');
    } catch (error: any) {
      console.error('Failed to complete onboarding:', error);
      toast({
        title: "Error completing setup",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const renderStepContent = () => {
    const stepProps = {
      onNext: handleNext,
      onPrevious: handlePrevious,
      loading: isLoading
    };

    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep 
            {...stepProps}
            data={onboardingData.basicInfo}
            updateData={(data) => updateData('basicInfo', data)}
          />
        );
      case 1:
        return (
          <BusinessDetailsStep 
            {...stepProps}
            data={onboardingData.businessDetails}
            updateData={(data) => updateData('businessDetails', data)}
          />
        );
      case 2:
        return (
          <BusinessHoursStep 
            {...stepProps}
            data={onboardingData.businessHours}
            updateData={(data) => updateData('businessHours', data)}
          />
        );
      case 3:
        return (
          <SampleDataStep 
            {...stepProps}
            data={onboardingData}
            updateData={(data) => setOnboardingData(prev => ({ ...prev, ...data }))}
            onNext={completeOnboarding}
          />
        );
      default:
        return null;
    }
  };

  // Show completion screen if already onboarded
  if (shopData?.onboarding_completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Setup Already Complete!</CardTitle>
            <CardDescription>Your shop is ready to use.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <div className="border-b bg-card">
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
      </div>

      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Shop Setup</h1>
              <p className="text-sm text-muted-foreground">Complete these steps to get started</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</span>
              <span className="font-medium">{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </div>

      {/* Step Indicators */}
      <div className="border-b bg-card/50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => {
                      if (isCompleted) {
                        setCurrentStep(index);
                      }
                    }}
                    disabled={!isCompleted && !isActive}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : isCompleted 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 cursor-pointer hover:bg-green-200 dark:hover:bg-green-900/50' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                    <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                  </button>
                  {index < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(STEPS[currentStep].icon, { className: "h-5 w-5" })}
              {STEPS[currentStep].title}
            </CardTitle>
            <CardDescription>{STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isCompleting ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Finalizing your setup...</p>
              </div>
            ) : (
              renderStepContent()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
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
