
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/module-hub')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          All Modules
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>{description || `${title} functionality will be implemented here.`}</p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => navigate('/module-hub')}>
                All Modules
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
