import React from 'react';
import { Sparkles, Heart, Clock, Shield, Zap, Users, TrendingUp, Headphones, CheckCircle } from 'lucide-react';
import { LANDING_MODULES, LANDING_COMING_SOON } from '@/config/landingModules';

const benefits = [
  {
    icon: Heart,
    title: 'Built for You',
    description: 'Designed for real service businesses, not generic software.',
  },
  {
    icon: Clock,
    title: 'Save Time',
    description: 'Automate scheduling, invoicing, and customer follow-ups.',
  },
  {
    icon: Shield,
    title: 'Reliable & Secure',
    description: 'Your data is protected and always accessible.',
  },
  {
    icon: Sparkles,
    title: 'Easy to Start',
    description: 'No setup fees, no long contracts. Start in minutes.',
  },
  {
    icon: Zap,
    title: 'Fast & Responsive',
    description: 'Lightning-quick performance on any device.',
  },
  {
    icon: TrendingUp,
    title: 'Grow Your Business',
    description: 'Tools to help you scale and reach more customers.',
  },
];

const steps = [
  {
    number: '1',
    title: 'Browse Industries',
    description: 'Explore our modules organized by industry to find your perfect fit.',
  },
  {
    number: '2',
    title: 'Try It Free',
    description: 'Start with a free trial — no credit card required.',
  },
  {
    number: '3',
    title: 'Go Live',
    description: 'Launch your business management system in minutes.',
  },
];

// Calculate exact counts from config
const liveModulesCount = LANDING_MODULES.filter(m => m.available).length;
const comingSoonCount = LANDING_COMING_SOON.length;
const totalModulesCount = liveModulesCount + comingSoonCount;

const stats = [
  { value: String(liveModulesCount), label: 'Live Modules' },
  { value: String(comingSoonCount), label: 'Coming Soon' },
  { value: '99.9%', label: 'Uptime Guaranteed' },
  { value: 'Free', label: 'To Get Started' },
];

export function WelcomeSection() {
  return (
    <section id="explore" className="py-12 md:py-20 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Main Heading */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">
            Find What's Right for Your Business
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto mb-8">
            Browse our industry solutions below. Each one is tailored to help you 
            run your business smoothly — pick what fits, skip what doesn't.
          </p>
          
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-xs md:text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-12 md:mb-16">
          <h3 className="text-lg md:text-2xl font-semibold text-center mb-6 md:mb-8">
            Getting Started is Simple
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
            {steps.map((step, index) => (
              <div key={step.number} className="relative flex flex-col items-center text-center p-4 md:p-6">
                {/* Connector line for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-primary/50 to-primary/20" />
                )}
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl md:text-2xl font-bold mb-3 md:mb-4 relative z-10">
                  {step.number}
                </div>
                <h4 className="font-semibold text-sm md:text-base mb-1">{step.title}</h4>
                <p className="text-xs md:text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Benefits Grid */}
        <div className="mb-10 md:mb-16">
          <h3 className="text-lg md:text-2xl font-semibold text-center mb-6 md:mb-8">
            Why Choose All Business 365?
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 max-w-5xl mx-auto">
            {benefits.map((benefit) => (
              <div 
                key={benefit.title} 
                className="text-center p-3 md:p-5 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
                  <benefit.icon className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-xs md:text-sm mb-1">{benefit.title}</h4>
                <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Trust Statement */}
        <div className="text-center bg-primary/5 rounded-2xl p-6 md:p-10 max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <span className="font-semibold text-sm md:text-base">Trusted by Service Professionals</span>
          </div>
          <p className="text-muted-foreground text-sm md:text-base mb-4">
            From auto shops to pet groomers, from farms to salons — businesses across dozens of industries 
            rely on All Business 365 to manage their daily operations.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs md:text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Headphones className="h-4 w-4" /> Friendly Support
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> Active Community
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}