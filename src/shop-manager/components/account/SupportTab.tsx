
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Clock, MapPin, MessageCircle, HelpCircle } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useBusinessHours } from '@/hooks/useBusinessHours';

export function SupportTab() {
  const { companyName, contactInfo } = useCompany();
  const { businessHours, businessDaysOfWeek } = useBusinessHours();

  const formatBusinessHours = () => {
    if (!businessHours || businessHours.length === 0) {
      return "Contact us for availability";
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const workingDays = businessDaysOfWeek;
    
    if (workingDays.length === 0) return "By appointment only";
    
    // Group consecutive days with same hours
    const groupedHours = workingDays.map(dayIndex => {
      const dayHours = businessHours.find(h => h.day_of_week === dayIndex);
      return {
        day: dayNames[dayIndex],
        hours: dayHours ? `${dayHours.open_time} - ${dayHours.close_time}` : 'Closed'
      };
    });

    return groupedHours.map(({ day, hours }) => `${day}: ${hours}`).join('\n');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Support & Help</h2>
        <p className="text-muted-foreground">
          Get help with your {companyName} account, billing, and technical issues.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contactInfo.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Phone Support</p>
                  <p className="text-sm text-muted-foreground">{contactInfo.phone}</p>
                </div>
              </div>
            )}
            
            {contactInfo.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Support</p>
                  <p className="text-sm text-muted-foreground">{contactInfo.email}</p>
                </div>
              </div>
            )}
            
            {(contactInfo.address || contactInfo.city) && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">
                    {[contactInfo.address, contactInfo.city, contactInfo.state, contactInfo.zip]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Business Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm whitespace-pre-line text-muted-foreground">
              {formatBusinessHours()}
            </pre>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {contactInfo.email && (
              <Button 
                variant="outline" 
                className="justify-start gap-2"
                onClick={() => window.location.href = `mailto:${contactInfo.email}`}
              >
                <Mail className="h-4 w-4" />
                Send Email
              </Button>
            )}
            
            {contactInfo.phone && (
              <Button 
                variant="outline" 
                className="justify-start gap-2"
                onClick={() => window.location.href = `tel:${contactInfo.phone}`}
              >
                <Phone className="h-4 w-4" />
                Call Now
              </Button>
            )}
            
            <Button variant="outline" className="justify-start gap-2">
              <MessageCircle className="h-4 w-4" />
              Live Chat
            </Button>
            
            <Button variant="outline" className="justify-start gap-2">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Common Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <details className="group">
              <summary className="cursor-pointer font-medium">How do I reset my password?</summary>
              <p className="mt-2 text-sm text-muted-foreground">
                You can reset your password from the login page or contact our support team for assistance.
              </p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer font-medium">How do I update my account information?</summary>
              <p className="mt-2 text-sm text-muted-foreground">
                Account information can be updated in the Profile section of your settings.
              </p>
            </details>
            
            <details className="group">
              <summary className="cursor-pointer font-medium">Who can I contact for billing questions?</summary>
              <p className="mt-2 text-sm text-muted-foreground">
                For billing inquiries, please contact us at {contactInfo.email || 'our support email'} or call {contactInfo.phone || 'our support line'}.
              </p>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
