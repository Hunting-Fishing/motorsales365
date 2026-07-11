import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, BookOpen, Code, Settings } from 'lucide-react';
import { toast } from 'sonner';

const apiEndpoints = [
  {
    method: 'GET',
    path: '/api/customers',
    description: 'Retrieve all customers',
    category: 'Customers',
    response: `{
  "data": [
    {
      "id": "uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "+1234567890"
    }
  ]
}`
  },
  {
    method: 'POST',
    path: '/api/customers',
    description: 'Create a new customer',
    category: 'Customers',
    request: `{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890"
}`,
    response: `{
  "id": "uuid",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "+1234567890"
}`
  },
  {
    method: 'GET',
    path: '/api/work-orders',
    description: 'Retrieve all work orders',
    category: 'Work Orders',
    response: `{
  "data": [
    {
      "id": "uuid",
      "customer_id": "uuid",
      "status": "in_progress",
      "description": "Oil change and inspection",
      "created_at": "2024-01-01T12:00:00Z"
    }
  ]
}`
  },
  {
    method: 'POST',
    path: '/api/webhooks',
    description: 'Register a webhook endpoint',
    category: 'Webhooks',
    request: `{
  "url": "https://your-app.com/webhook",
  "events": ["work_order.completed", "customer.created"]
}`,
    response: `{
  "id": "uuid",
  "url": "https://your-app.com/webhook",
  "events": ["work_order.completed", "customer.created"],
  "secret": "webhook_secret_key"
}`
  }
];

const sdkExamples = {
  javascript: `// Install: npm install @autoshop-pro/sdk
import { AutoShopAPI } from '@autoshop-pro/sdk';

const client = new AutoShopAPI({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.autoshop-pro.com'
});

// Get customers
const customers = await client.customers.list();

// Create work order
const workOrder = await client.workOrders.create({
  customer_id: 'customer-uuid',
  description: 'Oil change'
});`,
  python: `# Install: pip install autoshop-pro-sdk
from autoshop_pro import AutoShopAPI

client = AutoShopAPI(
    api_key='your-api-key',
    base_url='https://api.autoshop-pro.com'
)

# Get customers
customers = client.customers.list()

# Create work order
work_order = client.work_orders.create({
    'customer_id': 'customer-uuid',
    'description': 'Oil change'
})`,
  curl: `# Get customers
curl -X GET "https://api.autoshop-pro.com/api/customers" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json"

# Create work order
curl -X POST "https://api.autoshop-pro.com/api/work-orders" \\
  -H "Authorization: Bearer your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_id": "customer-uuid",
    "description": "Oil change"
  }'`
};

export function ApiDocumentationPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const categories = ['all', ...new Set(apiEndpoints.map(endpoint => endpoint.category))];
  const filteredEndpoints = selectedCategory === 'all' 
    ? apiEndpoints 
    : apiEndpoints.filter(endpoint => endpoint.category === selectedCategory);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800 border-green-200';
      case 'POST': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PUT': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'DELETE': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-muted-foreground">
            Complete API reference and integration guides
          </p>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="space-y-6">
        <TabsList>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="sdks">SDKs & Examples</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="grid gap-4">
            {filteredEndpoints.map((endpoint, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={getMethodColor(endpoint.method)}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-mono">{endpoint.path}</code>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(endpoint.path)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardDescription>{endpoint.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {endpoint.request && (
                    <div>
                      <h4 className="font-semibold mb-2">Request Body</h4>
                      <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                        <code>{endpoint.request}</code>
                      </pre>
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold mb-2">Response</h4>
                    <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                      <code>{endpoint.response}</code>
                    </pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sdks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Official SDKs</CardTitle>
              <CardDescription>
                Use our official SDKs to integrate with your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {Object.keys(sdkExamples).map(lang => (
                  <Button
                    key={lang}
                    variant={selectedLanguage === lang ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedLanguage(lang)}
                    className="capitalize"
                  >
                    {lang === 'curl' ? 'cURL' : lang}
                  </Button>
                ))}
              </div>
              <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
                <code>{sdkExamples[selectedLanguage as keyof typeof sdkExamples]}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                Receive real-time notifications when events occur
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Available Events</h4>
                <div className="grid gap-2">
                  {[
                    'work_order.created',
                    'work_order.updated',
                    'work_order.completed',
                    'customer.created',
                    'customer.updated',
                    'invoice.paid',
                    'appointment.scheduled'
                  ].map(event => (
                    <Badge key={event} variant="secondary">
                      {event}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Webhook Payload Example</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{`{
  "event": "work_order.completed",
  "data": {
    "id": "uuid",
    "customer_id": "uuid",
    "status": "completed",
    "description": "Oil change and inspection",
    "completed_at": "2024-01-01T12:00:00Z"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>
                Secure your API requests with proper authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">API Key Authentication</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Include your API key in the Authorization header of all requests:
                </p>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>Authorization: Bearer your-api-key</code>
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Rate Limits</h4>
                <p className="text-sm text-muted-foreground">
                  API requests are limited to 1000 requests per hour per API key.
                  Rate limit information is included in response headers.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Error Handling</h4>
                <pre className="bg-muted p-3 rounded-md text-sm overflow-x-auto">
                  <code>{`{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}