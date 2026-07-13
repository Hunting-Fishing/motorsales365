import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fuel, Truck, Clock, Shield, UserPlus, LogIn } from 'lucide-react';

export default function FuelDeliveryPortalLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Fuel className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Fuel Delivery Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/fuel-delivery-portal/login">
              <Button variant="ghost" size="sm">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
            <Link to="/fuel-delivery-portal/register">
              <Button size="sm" className="bg-primary hover:bg-primary/90">
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
            Fuel Delivery
            <span className="text-primary"> Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground">
            Request fuel deliveries, manage your locations, track your orders, 
            and never run out of fuel again.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/fuel-delivery-portal/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <UserPlus className="h-5 w-5 mr-2" />
                Create Your Account
              </Button>
            </Link>
            <Link to="/fuel-delivery-portal/login">
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
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Fuel className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Easy Ordering</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Request fuel deliveries with just a few clicks. Choose your fuel type, 
                quantity, and preferred delivery time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Track Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor your delivery status in real-time. Know exactly when 
                your fuel will arrive.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Access your complete delivery history. View past orders, 
                invoices, and fuel consumption trends.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-lg">Secure Account</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Manage your delivery locations, vehicles, and account 
                settings all in one secure place.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
              Create your account today and start managing your fuel deliveries 
              with ease. It only takes a minute to register.
            </p>
            <Link to="/fuel-delivery-portal/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90">
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
          <p>© {new Date().getFullYear()} Fuel Delivery Portal. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
