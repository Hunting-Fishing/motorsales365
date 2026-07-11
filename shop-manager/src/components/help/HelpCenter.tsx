import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, GraduationCap, MessageSquare, Star, TrendingUp, Download, Settings, Lightbulb } from 'lucide-react';
import { FAQSection } from './FAQSection';
import { LearningPathViewer } from './LearningPathViewer';
import { UserProgressDashboard } from './UserProgressDashboard';
import ResourcesLibrary from './ResourcesLibrary';
import FeatureRequests from './FeatureRequests';

const HelpCenter: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const featuredArticles = [
    {
      title: "Getting Started with Work Orders",
      description: "Learn the basics of creating and managing work orders",
      readTime: "5 min read",
      category: "Getting Started",
      featured: true
    },
    {
      title: "Customer Communication Best Practices",
      description: "Build stronger relationships with effective communication strategies",
      readTime: "8 min read",
      category: "Customer Service",
      featured: true
    },
    {
      title: "Inventory Management Essentials",
      description: "Optimize your parts inventory for maximum efficiency",
      readTime: "12 min read",
      category: "Advanced Features",
      featured: true
    }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Help Center</h1>
        <p className="text-muted-foreground">
          Find answers, learn new skills, and get the most out of your shop management system
        </p>
      </div>

      <Tabs defaultValue="articles" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="articles" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Articles
          </TabsTrigger>
          <TabsTrigger value="learning" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Learning
          </TabsTrigger>
          <TabsTrigger value="faq" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Progress
          </TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featuredArticles.map((article, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{article.category}</Badge>
                    {article.featured && (
                      <Badge variant="outline" className="text-yellow-600">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  <CardDescription>{article.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{article.readTime}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="learning" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Learning Paths
              </CardTitle>
              <CardDescription>
                Structured learning journeys to master different aspects of shop management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LearningPathViewer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faq" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Frequently Asked Questions
              </CardTitle>
              <CardDescription>
                Quick answers to common questions about using the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FAQSection />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Resources Library
              </CardTitle>
              <CardDescription>
                Templates, guides, and tools to help you manage your shop more effectively
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResourcesLibrary />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Feature Requests
              </CardTitle>
              <CardDescription>
                Vote on upcoming features and submit your own ideas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FeatureRequests />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Your Learning Progress
              </CardTitle>
              <CardDescription>
                Track your learning journey and achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserProgressDashboard />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HelpCenter;