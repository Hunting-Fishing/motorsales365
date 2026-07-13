
import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface WorkOrderPageLayoutProps {
  title: string;
  description?: string;
  backLink?: string;
  backLinkText?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function WorkOrderPageLayout({
  title,
  description,
  backLink,
  backLinkText = 'Back',
  actions,
  children
}: WorkOrderPageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full py-8 space-y-8 px-6">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {backLink && (
                <Button variant="ghost" asChild className="p-3 hover:bg-slate-100 rounded-lg transition-colors">
                  <Link to={backLink} className="flex items-center text-slate-600 hover:text-slate-900">
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    {backLinkText}
                  </Link>
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {title}
                </h1>
                {description && (
                  <p className="text-slate-600 mt-2 text-lg">{description}</p>
                )}
              </div>
            </div>
            
            {actions && (
              <div className="flex items-center gap-3">
                {actions}
              </div>
            )}
          </div>
        </div>
        
        {/* Content Section */}
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}
