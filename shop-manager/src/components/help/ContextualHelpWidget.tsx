import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, 
  X, 
  ChevronRight, 
  Search, 
  BookOpen,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface ContextualHelp {
  title: string;
  description: string;
  steps?: string[];
  links?: { label: string; href: string }[];
  tips?: string[];
}

const contextualHelpData: Record<string, ContextualHelp> = {
  '/dashboard': {
    title: 'Dashboard Overview',
    description: 'Your dashboard provides a comprehensive view of your shop\'s performance and activities.',
    steps: [
      'Review key metrics in the overview cards',
      'Check recent work orders and their status',
      'Monitor inventory levels and alerts',
      'Track customer activities and appointments'
    ],
    tips: [
      'Pin frequently used metrics to the top',
      'Use filters to customize your view',
      'Set up alerts for important thresholds'
    ]
  },
  '/work-orders': {
    title: 'Work Order Management',
    description: 'Efficiently manage all your work orders from creation to completion.',
    steps: [
      'Click "New Work Order" to create an order',
      'Select customer and vehicle information',
      'Add services and parts as needed',
      'Assign technicians and set schedules',
      'Track progress and update status'
    ],
    links: [
      { label: 'Work Order Best Practices', href: '/help?article=work-orders-best-practices' },
      { label: 'Status Management Guide', href: '/help?article=work-order-status' }
    ]
  },
  '/customers': {
    title: 'Customer Management',
    description: 'Manage your customer database and build stronger relationships.',
    steps: [
      'Add new customers with contact details',
      'Record vehicle information and history',
      'Track service history and preferences',
      'Set up communication preferences',
      'Manage loyalty programs and offers'
    ],
    tips: [
      'Keep customer information up to date',
      'Use tags to categorize customers',
      'Set reminders for follow-ups'
    ]
  },
  '/inventory': {
    title: 'Inventory Management',
    description: 'Keep track of parts, supplies, and stock levels efficiently.',
    steps: [
      'Add new parts with detailed information',
      'Set up suppliers and vendor relationships',
      'Configure low stock alerts',
      'Track part usage and costs',
      'Generate inventory reports'
    ],
    links: [
      { label: 'Inventory Setup Guide', href: '/help?article=inventory-setup' },
      { label: 'Supplier Management', href: '/help?article=supplier-management' }
    ]
  },
  '/shopping': {
    title: 'E-commerce Features',
    description: 'Manage your online store and sell parts to customers.',
    steps: [
      'Configure your online store settings',
      'Add products to your catalog',
      'Set up payment processing',
      'Manage orders and fulfillment',
      'Track sales and analytics'
    ],
    tips: [
      'Keep product descriptions detailed',
      'Use high-quality product images',
      'Set up automated inventory sync'
    ]
  },
  '/developer': {
    title: 'Developer Tools',
    description: 'Access advanced tools for system configuration and API management.',
    steps: [
      'Explore API documentation',
      'Test endpoints in the playground',
      'Manage API keys and webhooks',
      'Configure system settings',
      'Monitor analytics and performance'
    ],
    links: [
      { label: 'API Quick Start', href: '/help?article=api-quickstart' },
      { label: 'Integration Examples', href: '/help?article=integration-examples' }
    ]
  }
};

export function ContextualHelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const currentHelp = contextualHelpData[location.pathname] || contextualHelpData['/dashboard'];

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80">
      <Card className="shadow-2xl border-0 bg-background/95 backdrop-blur">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <HelpCircle className="h-4 w-4 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{currentHelp.title}</h3>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              {currentHelp.description}
            </p>

            {currentHelp.steps && (
              <div>
                <h4 className="font-medium text-sm mb-2">Quick Steps:</h4>
                <ol className="text-xs space-y-1">
                  {currentHelp.steps.map((step, index) => (
                    <li key={index} className="flex gap-2">
                      <Badge variant="outline" className="w-5 h-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {index + 1}
                      </Badge>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {currentHelp.tips && (
              <div>
                <h4 className="font-medium text-sm mb-2">💡 Pro Tips:</h4>
                <ul className="text-xs space-y-1">
                  {currentHelp.tips.map((tip, index) => (
                    <li key={index} className="text-muted-foreground">
                      • {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {currentHelp.links && (
              <div>
                <h4 className="font-medium text-sm mb-2">Helpful Links:</h4>
                <div className="space-y-1">
                  {currentHelp.links.map((link, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between h-8 px-2 text-xs"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-muted/30">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                <Search className="h-3 w-3 mr-1" />
                Search Help
              </Button>
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs">
                <MessageCircle className="h-3 w-3 mr-1" />
                Contact Support
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}