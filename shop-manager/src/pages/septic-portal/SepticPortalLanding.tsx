import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Container, ClipboardCheck, Calendar, Shield, UserPlus, LogIn } from 'lucide-react';

export default function SepticPortalLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-stone-700 rounded-lg flex items-center justify-center">
              <Container className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Septic Services Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/septic-portal/login">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
            <Link to="/septic-portal/register">
              <Button size="sm" className="bg-stone-700 hover:bg-stone-800 text-white">
                <UserPlus className="h-4 w-4 mr-2" />
                Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Septic Services
            <span className="text-stone-600"> Customer Portal</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Track your septic system maintenance, view service history, 
            schedule pump-outs, and stay on top of inspections.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/septic-portal/register">
              <Button size="lg" className="bg-stone-700 hover:bg-stone-800 text-white">
                <UserPlus className="h-5 w-5 mr-2" />
                Create Your Account
              </Button>
            </Link>
            <Link to="/septic-portal/login">
              <Button size="lg" variant="outline">
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-2">
                <Container className="h-6 w-6 text-stone-700" />
              </div>
              <CardTitle className="text-lg">Tank Management</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View your registered septic tanks, system status, 
                and upcoming pump-out schedules.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-2">
                <Calendar className="h-6 w-6 text-stone-700" />
              </div>
              <CardTitle className="text-lg">Service History</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access your complete service history including pump-outs, 
                repairs, and maintenance records.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-2">
                <ClipboardCheck className="h-6 w-6 text-stone-700" />
              </div>
              <CardTitle className="text-lg">Inspections</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                View inspection reports and compliance status 
                for your septic systems.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-stone-100 rounded-lg flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-stone-700" />
              </div>
              <CardTitle className="text-lg">Secure Account</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage your account, view invoices, and track 
                payments all in one secure place.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-stone-50 border-stone-200 dark:bg-stone-900/20 dark:border-stone-700/30">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Create your account today and start tracking your septic system 
              maintenance. It only takes a minute to register.
            </p>
            <Link to="/septic-portal/register">
              <Button size="lg" className="bg-stone-700 hover:bg-stone-800 text-white">
                <UserPlus className="h-5 w-5 mr-2" />
                Register Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Septic Services Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
