import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Wrench } from 'lucide-react';
import heroBanner from '@/assets/hero-banner.jpg';

export function HeroSection() {
  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src={heroBanner} 
          alt="Service professionals working together" 
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-2xl">
          {/* Welcome Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-primary text-sm font-medium">Welcome to All Business 365</span>
          </div>
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 md:mb-6 text-foreground">
            Your Business,{' '}
            <span className="text-primary">Made Simple.</span>
          </h1>
          
          <p className="text-base md:text-xl text-muted-foreground mb-8 leading-relaxed">
            We help service professionals like you manage customers, schedules, and invoices 
            — all in one friendly place. Pick what fits your business and get started today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Link to="/staff-login">
              <Button size="lg" className="gap-2 text-base md:text-lg px-6 md:px-8 w-full sm:w-auto">
                <Wrench className="h-4 w-4 md:h-5 md:w-5" />
                Get Started Free
                <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
            </Link>
            <a href="#explore">
              <Button size="lg" variant="outline" className="text-base md:text-lg px-6 md:px-8 w-full sm:w-auto bg-background/50 backdrop-blur">
                See What We Offer
              </Button>
            </a>
          </div>
          
          {/* Social proof */}
          <div className="mt-8 pt-8 border-t border-border/50">
            <p className="text-sm text-muted-foreground mb-2">Trusted by service professionals everywhere</p>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i} 
                    className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center"
                  >
                    <Users className="h-3 w-3 text-primary" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                Join 1,000+ businesses
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
