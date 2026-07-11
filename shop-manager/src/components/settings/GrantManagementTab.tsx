import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, DollarSign, FileText, Clock, AlertTriangle } from 'lucide-react';

export const GrantManagementTab = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Grant Management</h2>
          <p className="text-muted-foreground">Track grant applications, deadlines, and reporting requirements</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Grant Application
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Grants</p>
                <p className="text-2xl font-bold text-foreground">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Funded</p>
                <p className="text-2xl font-bold text-foreground">$125K</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Reports</p>
                <p className="text-2xl font-bold text-foreground">3</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Soon</p>
                <p className="text-2xl font-bold text-foreground">2</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Grant Applications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Active Grant Applications
          </CardTitle>
          <CardDescription>
            Track your current grant applications and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Grant Application Item */}
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <h4 className="font-medium text-foreground">Community Foundation Youth Programs</h4>
                  <p className="text-sm text-muted-foreground">$50,000 • Applied: March 15, 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">Under Review</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Decision: May 1
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <h4 className="font-medium text-foreground">State Workforce Development Grant</h4>
                  <p className="text-sm text-muted-foreground">$75,000 • Applied: February 28, 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-green-500/10 text-green-700 hover:bg-green-500/20">Approved</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Start: June 1
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div className="flex items-center gap-4">
                <div>
                  <h4 className="font-medium text-foreground">Environmental Restoration Initiative</h4>
                  <p className="text-sm text-muted-foreground">$25,000 • Applied: April 10, 2024</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline">Draft</Badge>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Due: April 30
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reporting Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Upcoming Reporting Requirements
          </CardTitle>
          <CardDescription>
            Stay on top of grant reporting deadlines and requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Q1 Progress Report - Youth Programs</h4>
                <p className="text-sm text-muted-foreground">Community Foundation Grant</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-500/10 text-red-700 hover:bg-red-500/20">Due in 5 days</Badge>
                <Button size="sm" variant="outline">
                  Start Report
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Annual Impact Report</h4>
                <p className="text-sm text-muted-foreground">State Workforce Development</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-yellow-500/10 text-yellow-700 hover:bg-yellow-500/20">Due in 15 days</Badge>
                <Button size="sm" variant="outline">
                  Start Report
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grant Search & Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Grant Opportunities
          </CardTitle>
          <CardDescription>
            Discover new funding opportunities and track application deadlines
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Connect to grant databases to discover new opportunities</p>
            <Button variant="outline">
              Browse Grant Databases
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};