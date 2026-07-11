import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, Mail, Plus } from 'lucide-react';

export function CustomerCommunications() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Communication History</CardTitle>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Communication
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Communication Center</h3>
            <p className="mb-4">
              All customer communications are stored in your live database and will appear here.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
              <Button variant="outline" size="sm">
                <Phone className="h-4 w-4 mr-2" />
                Calls
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Emails
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}