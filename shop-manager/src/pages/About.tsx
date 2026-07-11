import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Users, Wrench, Target } from 'lucide-react';
import ab365Logo from '@/assets/ab365-logo.png';
import { PublicLayout } from '@/components/layout/PublicLayout';

export default function About() {
  return (
    <PublicLayout activeLink="about">
      <div className="p-4">
        <div className="max-w-4xl mx-auto space-y-8 py-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6">
              <img src={ab365Logo} alt="All Business 365" className="w-20 h-20 object-contain" />
            </div>
            <h1 className="text-4xl font-heading gradient-text">About All Business 365</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              The complete solution for professional service management
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-8 md:grid-cols-2">
            <Card className="modern-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Target className="w-6 h-6 text-primary" />
                  Our Mission
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  We empower automotive service businesses to streamline operations, 
                  improve customer satisfaction, and grow their business through 
                  innovative technology and user-friendly solutions.
                </p>
              </CardContent>
            </Card>

            <Card className="modern-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="w-6 h-6 text-primary" />
                  Who We Serve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  From independent mechanics to large service centers, we provide 
                  scalable solutions for businesses of all sizes looking to 
                  modernize their operations and enhance customer experience.
                </p>
              </CardContent>
            </Card>

            <Card className="modern-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-primary" />
                  Security & Trust
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Your data security is our priority. We use enterprise-grade 
                  encryption and follow industry best practices to protect your 
                  business information and customer data.
                </p>
              </CardContent>
            </Card>

            <Card className="modern-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Wrench className="w-6 h-6 text-primary" />
                  Key Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>• Work Order Management</li>
                  <li>• Customer Portal</li>
                  <li>• Inventory Tracking</li>
                  <li>• Equipment Maintenance</li>
                  <li>• Analytics & Reports</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info */}
          <Card className="modern-card-elevated">
            <CardHeader>
              <CardTitle>Get in Touch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Have questions or need support? We're here to help your business succeed.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="text-sm">
                  <strong>Email:</strong> support@autoshoppro.com
                </div>
                <div className="text-sm">
                  <strong>Phone:</strong> 1-800-AUTO-PRO
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PublicLayout>
  );
}
