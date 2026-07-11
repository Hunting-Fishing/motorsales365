
import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MessageSquare, Calendar, Bug, BookOpen, BarChart3, Settings, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContactSupportModal } from '@/components/help/ContactSupportModal';
import { ScheduleDemoModal } from '@/components/help/ScheduleDemoModal';
import { FeatureRequestModal } from '@/components/help/FeatureRequestModal';
import { FeatureRequestBoard } from '@/components/help/FeatureRequestBoard';
import { HelpSearchEngine } from '@/components/help/HelpSearchEngine';
import { HelpContentLibrary } from '@/components/help/HelpContentLibrary';
import { HelpAnalytics } from '@/components/help/HelpAnalytics';
import { HelpArticleViewer } from '@/components/help/HelpArticleViewer';
import { SupportTicketManager } from '@/components/help/SupportTicketManager';
import { FAQSection } from '@/components/help/FAQSection';
import { SystemStatusWidget } from '@/components/help/SystemStatusWidget';
import { LearningPathViewer } from '@/components/help/LearningPathViewer';
import { ResourceLibrary } from '@/components/help/ResourceLibrary';
import { EnhancedSupportTicketManager } from '@/components/help/EnhancedSupportTicketManager';
import { HelpSearch } from '@/components/help/HelpSearch';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { CategoryArticlesList } from '@/components/help/CategoryArticlesList';
import { ArticleViewer } from '@/components/help/ArticleViewer';
import { useTrackAnalytics } from '@/hooks/useHelpAnalytics';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  variant: 'default' | 'outline';
}

const Help: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isFeatureRequestModalOpen, setIsFeatureRequestModalOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  
  const trackAnalytics = useTrackAnalytics();

  // Track page view
  React.useEffect(() => {
    trackAnalytics.mutate({ eventType: 'page_view' });
  }, []);

  const articleId = searchParams.get('id');

  // If viewing a specific article, show the article viewer
  if (articleId || selectedArticleId) {
    return (
      <ArticleViewer 
        articleId={articleId || selectedArticleId || undefined}
        onClose={() => setSelectedArticleId(null)}
      />
    );
  }

  const quickActions: QuickAction[] = [
    {
      id: 'contact',
      title: 'Contact Support',
      description: 'Get help from our support team',
      icon: <MessageSquare className="h-5 w-5" />,
      action: () => setIsContactModalOpen(true),
      variant: 'default'
    },
    {
      id: 'demo',
      title: 'Schedule Demo',
      description: 'Book a personalized walkthrough',
      icon: <Calendar className="h-5 w-5" />,
      action: () => setIsScheduleModalOpen(true),
      variant: 'outline'
    },
    {
      id: 'feature',
      title: 'Request Feature',
      description: 'Suggest new functionality',
      icon: <Bug className="h-5 w-5" />,
      action: () => setIsFeatureRequestModalOpen(true),
      variant: 'outline'
    }
  ];

  // Removed hardcoded system status - now using real database data

  const handleSearchResult = (result: any) => {
    // Navigate to article by updating the URL
    window.location.href = result.url;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Help Center</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Find answers, tutorials, and get support for your business management needs
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {quickActions.map((action) => (
            <Card key={action.id} className="cursor-pointer transition-colors hover:bg-muted/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {action.icon}
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </div>
                  </div>
                  <Button variant={action.variant} onClick={action.action}>
                    Get Started
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* System Status */}
        <div className="mb-8">
          <SystemStatusWidget />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="articles" className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="articles" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="learning" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Learning
            </TabsTrigger>
            <TabsTrigger value="resources" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Resources
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Support
            </TabsTrigger>
            <TabsTrigger value="faq" className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="articles" className="space-y-6">
            <CategoryArticlesList onArticleSelect={setSelectedArticleId} />
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            <LearningPathViewer />
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            <ResourceLibrary />
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <FeatureRequestBoard onRequestFeature={() => setIsFeatureRequestModalOpen(true)} />
          </TabsContent>

          <TabsContent value="support" className="space-y-6">
            <EnhancedSupportTicketManager />
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frequently Asked Questions</CardTitle>
                <CardDescription>
                  Quick answers to the most common questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FAQSection />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ContactSupportModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
      />
      <ScheduleDemoModal 
        isOpen={isScheduleModalOpen} 
        onClose={() => setIsScheduleModalOpen(false)} 
      />
      <FeatureRequestModal 
        isOpen={isFeatureRequestModalOpen} 
        onClose={() => setIsFeatureRequestModalOpen(false)} 
      />
    </div>
  );
};

export default Help;
