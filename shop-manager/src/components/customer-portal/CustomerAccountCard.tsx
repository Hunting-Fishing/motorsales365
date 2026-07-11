import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, MapPin, Car } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';

export function CustomerAccountCard() {
  const { userId } = useAuthUser();
  const [customerData, setCustomerData] = useState<{
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    id: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCustomerData() {
      if (!userId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (error) {
          console.error('Error fetching customer data:', error);
          setError('Could not load account information');
        } else {
          setCustomerData(data);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch customer data');
      } finally {
        setLoading(false);
      }
    }
    
    fetchCustomerData();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Loading account details...</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!customerData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <p>No account information available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Information</CardTitle>
        <CardDescription>Details about your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <User className="h-4 w-4 text-gray-500" />
          <h2 className="text-lg font-medium">{customerData.first_name} {customerData.last_name}</h2>
          <Badge className="bg-blue-100 text-blue-800 border border-blue-300">Customer</Badge>
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <p>{customerData.email}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Phone className="h-4 w-4 text-gray-500" />
            <p>{customerData.phone}</p>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-gray-500" />
            <p>
              {customerData.address}, {customerData.city}, {customerData.state} {customerData.postal_code}, {customerData.country}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
