import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Wrench, FileText, Shield, UserPlus, LogIn } from 'lucide-react';

export default function AutomotivePortalLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-700 rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Automotive Service Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/automotive-portal/login">
              <Button variant="ghost" size="sm"><LogIn className="h-4 w-4 mr-2" />Sign In</Button>
            </Link>
            <Link to="/automotive-portal/register">
              <Button size="sm" className="bg-blue-700 hover:bg-blue-800 text-white">
                <UserPlus className="h-4 w-4 mr-2" />Register
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Automotive Service<span className="text-blue-600"> Customer Portal</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Track your vehicle repairs, view service history, monitor work orders, and manage invoices — all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/automotive-portal/register">
              <Button size="lg" className="bg-blue-700 hover:bg-blue-800 text-white">
                <UserPlus className="h-5 w-5 mr-2" />Create Your Account
              </Button>
            </Link>
            <Link to="/automotive-portal/login">
              <Button size="lg" variant="outline"><LogIn className="h-5 w-5 mr-2" />Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Car, title: 'Vehicle Tracking', desc: 'View all your registered vehicles, service history, and upcoming maintenance.' },
            { icon: Wrench, title: 'Work Orders', desc: 'Track active repairs, review completed jobs, and monitor repair progress in real-time.' },
            { icon: FileText, title: 'Invoices & Payments', desc: 'Access invoices, payment history, and manage your billing information.' },
            { icon: Shield, title: 'Secure Account', desc: 'Your data is protected with enterprise-grade security and encrypted connections.' },
          ].map((f) => (
            <Card key={f.title} className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2">
                  <f.icon className="h-6 w-6 text-blue-700" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent><CardDescription>{f.desc}</CardDescription></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700/30">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Create your account today and start tracking your vehicle service. It only takes a minute.
            </p>
            <Link to="/automotive-portal/register">
              <Button size="lg" className="bg-blue-700 hover:bg-blue-800 text-white">
                <UserPlus className="h-5 w-5 mr-2" />Register Now
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Automotive Service Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
