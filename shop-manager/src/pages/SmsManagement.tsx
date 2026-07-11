
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Customer } from '@/types/customer';
import { MessageSquare, Send, Trash, Check, X, Phone } from 'lucide-react';

export default function SmsManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch customers, templates and recent messages
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch customers
        const { data: customersData, error: customersError } = await supabase
          .from('customers')
          .select('*')
          .order('last_name', { ascending: true });
        
        if (customersError) {
          console.error('Error fetching customers:', customersError);
        } else {
          setCustomers(customersData || []);
        }
        
        // Fetch SMS templates
        const { data: templatesData, error: templatesError } = await supabase
          .from('sms_templates')
          .select('*');
          
        if (templatesError) {
          console.error('Error fetching SMS templates:', templatesError);
        } else {
          setTemplates(templatesData || []);
        }
        
        // Fetch recent messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('sms_logs')
          .select('*')
          .order('sent_at', { ascending: false })
          .limit(10);
          
        if (messagesError) {
          console.error('Error fetching SMS logs:', messagesError);
        } else {
          setRecentMessages(messagesData || []);
        }
        
      } catch (error) {
        console.error('Error in fetchData:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">SMS Management</h1>
        <Button>
          <MessageSquare className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Recent Messages</CardTitle>
            <CardDescription>
              History of recently sent SMS messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading recent messages...</p>
            ) : recentMessages.length === 0 ? (
              <div className="text-center py-12">
                <Phone className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mt-4 text-lg font-medium">No Messages Yet</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  You haven't sent any SMS messages yet. Send your first message to see it here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMessages.map((message) => (
                  <div key={message.id} className="flex items-start border-b pb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{message.phone_number}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          message.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          message.status === 'failed' ? 'bg-red-100 text-red-800' : 
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {message.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(message.sent_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {message.status === 'failed' && (
                        <Button size="sm" variant="outline">Retry</Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Message Templates</CardTitle>
            <CardDescription>
              Create and manage SMS templates
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-4 text-muted-foreground">Loading templates...</p>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No templates found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-md p-3">
                    <p className="font-medium">{template.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {template.content}
                    </p>
                    <div className="flex justify-end gap-2 mt-2">
                      <Button size="sm" variant="ghost">
                        <Trash className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        <Send className="h-4 w-4 mr-1" /> Use
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Create New Template
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
