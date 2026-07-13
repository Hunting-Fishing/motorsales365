import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, MessageSquare, Search, Lightbulb, Zap, TrendingUp, Bell, BarChart3, CheckCircle } from 'lucide-react';
import { AIChat, AIRecommendations, AISearch, AIInsights, SmartNotifications } from '@/components/ai';

const AIHub = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI & Automation Hub</h1>
          <p className="text-muted-foreground">Intelligent tools to enhance your business operations</p>
        </div>
        <Badge variant="secondary" className="bg-gradient-primary text-white">
          <Brain className="w-4 h-4 mr-2" />
          AI Powered
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Recommendations
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* AI Chat Assistant */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setActiveTab('chat')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  Smart Chat
                </CardTitle>
                <CardDescription>
                  AI-powered customer support and assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Start Chat Session</Button>
              </CardContent>
            </Card>

            {/* Semantic Search */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setActiveTab('search')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-primary" />
                  AI Search
                </CardTitle>
                <CardDescription>
                  Natural language search across all your data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Open Search</Button>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setActiveTab('recommendations')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Smart Recommendations
                </CardTitle>
                <CardDescription>
                  AI-generated product and service suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">View Recommendations</Button>
              </CardContent>
            </Card>

            {/* Predictive Analytics */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Predictive Analytics
                </CardTitle>
                <CardDescription>
                  Forecast demand, prices, and maintenance needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">View Analytics</Button>
              </CardContent>
            </Card>

            {/* Workflow Automation */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  Automation
                </CardTitle>
                <CardDescription>
                  Automate repetitive tasks and workflows
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">Manage Workflows</Button>
              </CardContent>
            </Card>

            {/* AI Insights */}
            <Card 
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setActiveTab('insights')}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-primary" />
                  Business Insights
                </CardTitle>
                <CardDescription>
                  AI-generated trends and opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">View Insights</Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent AI Activity</CardTitle>
                <CardDescription>Latest AI-powered actions and recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-green-100 rounded-full">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Generated 5 new product recommendations</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Processed 12 customer chat sessions</p>
                      <p className="text-xs text-muted-foreground">4 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <div className="p-2 bg-yellow-100 rounded-full">
                      <TrendingUp className="w-4 h-4 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Detected new business trend</p>
                      <p className="text-xs text-muted-foreground">6 hours ago</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Performance Metrics</CardTitle>
                <CardDescription>Key performance indicators for AI features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Chat Response Accuracy</span>
                    <Badge variant="secondary">94%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Recommendation Relevance</span>
                    <Badge variant="secondary">87%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Search Success Rate</span>
                    <Badge variant="secondary">91%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Automation Success</span>
                    <Badge variant="secondary">98%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="chat">
          <AIChat />
        </TabsContent>

        <TabsContent value="search">
          <AISearch />
        </TabsContent>

        <TabsContent value="recommendations">
          <AIRecommendations />
        </TabsContent>

        <TabsContent value="insights">
          <AIInsights />
        </TabsContent>

        <TabsContent value="notifications">
          <SmartNotifications />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIHub;