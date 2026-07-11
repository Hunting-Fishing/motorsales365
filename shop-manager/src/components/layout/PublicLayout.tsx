import React from 'react';
import { Link } from 'react-router-dom';
import ab365Logo from '@/assets/ab365-logo.png';

interface PublicLayoutProps {
  children: React.ReactNode;
  activeLink?: 'home' | 'about' | 'pricing' | 'login' | 'signup';
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children, activeLink }) => {
  const navLinks = [
    { id: 'home', label: 'Home', path: '/' },
    { id: 'about', label: 'About', path: '/about' },
    { id: 'pricing', label: 'Pricing', path: '/pricing' },
  ];

  const getLinkClasses = (linkId: string) => {
    const isActive = activeLink === linkId;
    return `text-sm font-medium transition-colors ${
      isActive 
        ? 'text-foreground' 
        : 'text-muted-foreground hover:text-foreground'
    }`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/10 flex flex-col relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={ab365Logo} alt="All Business 365" className="h-10 w-auto object-contain" />
            <span className="text-xl font-heading font-bold text-foreground">All Business 365</span>
          </Link>
          
          <nav className="hidden sm:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link key={link.id} to={link.path} className={getLinkClasses(link.id)}>
                {link.label}
              </Link>
            ))}
            <Link 
              to="/signup" 
              className="btn-gradient-primary px-4 py-2 rounded-lg text-sm font-medium text-primary-foreground hover:shadow-md transition-shadow"
            >
              Get Started
            </Link>
          </nav>
          
          {/* Mobile Menu */}
          <div className="sm:hidden flex items-center gap-3">
            <Link to="/signup" className="btn-gradient-primary px-3 py-1.5 rounded-lg text-xs font-medium text-primary-foreground">
              Sign Up
            </Link>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-1 relative">
        {children}
      </main>
      
      {/* Page Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/80 backdrop-blur-sm py-6">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={ab365Logo} alt="All Business 365" className="h-6 w-auto object-contain" />
              <span className="text-sm font-medium text-foreground">All Business 365</span>
            </div>
            
            <nav className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link 
                  key={link.id} 
                  to={link.path} 
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Login
              </Link>
            </nav>
            
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} All Business 365. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
