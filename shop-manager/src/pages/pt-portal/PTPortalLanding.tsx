import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dumbbell, Calendar, Activity, Shield, UserPlus, LogIn } from 'lucide-react';

export default function PTPortalLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <Dumbbell className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold">Fitness Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/pt-portal/login"><Button variant="ghost" size="sm"><LogIn className="h-4 w-4 mr-2" />Sign In</Button></Link>
            <Link to="/pt-portal/register">
              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-red-600 text-white"><UserPlus className="h-4 w-4 mr-2" />Register</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Your Fitness<span className="text-orange-500"> Client Portal</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            View your workout programs, track progress, book sessions, and manage your fitness journey.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/pt-portal/register">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-600 text-white"><UserPlus className="h-5 w-5 mr-2" />Create Your Account</Button>
            </Link>
            <Link to="/pt-portal/login">
              <Button size="lg" variant="outline"><LogIn className="h-5 w-5 mr-2" />Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Dumbbell, title: 'Workout Programs', desc: 'Access your personalized workout programs and exercise plans.' },
            { icon: Calendar, title: 'Session Booking', desc: 'View upcoming sessions, book new ones, and manage your schedule.' },
            { icon: Activity, title: 'Progress Tracking', desc: 'Track your body metrics, measurements, and fitness progress over time.' },
            { icon: Shield, title: 'Secure Account', desc: 'Your health data is protected with enterprise-grade security.' },
          ].map((f) => (
            <Card key={f.title} className="bg-card/50 border-border/50">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2">
                  <f.icon className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">{f.desc}</p></CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
