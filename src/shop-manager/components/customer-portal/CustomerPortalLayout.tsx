import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, LogIn, UserPlus, Home, Sparkles } from 'lucide-react';
import customerPortalBg from '@/assets/customer-portal-bg.jpg';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { Particles } from '@/components/ui/magicui/particles';

interface CustomerPortalLayoutProps {
  children: React.ReactNode;
  showBackToPortal?: boolean;
}

export function CustomerPortalHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/customer-portal" className="group flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-primary to-accent shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-heading text-sm font-semibold text-foreground">Customer Portal</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">All Business 365</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1.5">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Home</span>
            </Link>
            <Link
              to="/customer-portal/login"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
            <Link
              to="/customer-portal/register"
              className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary to-accent px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:brightness-110 hover:shadow-md"
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Register</span>
            </Link>
            <div className="ml-1 border-l border-border/60 pl-1.5">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

export function CustomerPortalFooter() {
  return (
    <footer className="relative z-10 mt-auto border-t border-border/60 bg-card/70 backdrop-blur-md">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-md shadow-primary/20">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-semibold">Customer Portal</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Access your service history, book appointments, and manage your account with your service providers.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/customer-portal" className="transition-colors hover:text-foreground">Find a Business</Link></li>
              <li><Link to="/customer-portal/login" className="transition-colors hover:text-foreground">Sign In</Link></li>
              <li><Link to="/customer-portal/register" className="transition-colors hover:text-foreground">Create Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-foreground">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/" className="transition-colors hover:text-foreground">Back to Main Site</Link></li>
              <li><a href="#" className="transition-colors hover:text-foreground">Help Center</a></li>
              <li><a href="#" className="transition-colors hover:text-foreground">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} All Business 365. All rights reserved.</p>
          <p className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" /> Crafted for modern service businesses
          </p>
        </div>
      </div>
    </footer>
  );
}

export function CustomerPortalLayout({ children }: CustomerPortalLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* Background layer: photo + gradient + particles */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <img
          src={customerPortalBg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-40 dark:opacity-20"
        />
        {/* Cloud White wash (light) / Deep Slate wash (dark) */}
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-background/95" />
        {/* Brand gradient orbs */}
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <Particles className="absolute inset-0 opacity-50" quantity={50} />
      </div>

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <CustomerPortalHeader />
        <main className="flex-1">{children}</main>
        <CustomerPortalFooter />
      </div>
    </div>
  );
}
