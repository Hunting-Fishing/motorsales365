import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function SetupBrianAuth() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const setupAuth = async () => {
    setStatus('loading');
    setMessage('Creating auth account for Brian...');

    try {
      const { data, error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          email: 'brian@wainwrightmarine.com',
          firstName: 'Brian',
          lastName: '1',
          profileId: '386db180-5c4b-4983-8327-e7a3c5dbfa12',
          roleId: '53afdfdc-beab-4678-bfc0-5fdca363bb94',
          shopId: 'ec0d4aad-982a-42b2-9d71-04ba405e265d',
          password: '123456'
        }
      });

      console.log('Response:', { data, error });

      if (error) {
        throw error;
      }

      setStatus('success');
      setMessage('✅ Auth account created successfully! Brian can now log in with:\nEmail: brian@wainwrightmarine.com\nPassword: 123456');
    } catch (error: any) {
      console.error('Error:', error);
      setStatus('error');
      setMessage(`❌ Error: ${error.message || 'Failed to create auth account'}`);
    }
  };

  useEffect(() => {
    setupAuth();
  }, []);

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Setup Brian's Auth Account</CardTitle>
          <CardDescription>
            This will create a Supabase auth account for Brian (brian@wainwrightmarine.com) with password "123456"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 whitespace-pre-line">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="border-red-500 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800 whitespace-pre-line">
                {message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/team')}>
              Back to Team
            </Button>
            {status !== 'idle' && (
              <Button variant="outline" onClick={() => navigate('/login')}>
                Go to Login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
