
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, Save, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

const OrganizationDetails: React.FC = () => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: ''
  });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching organization:', error);
        toast.error(`Failed to load organization: ${error.message || 'Database connection error'}`);
        setLoading(false);
        return;
      }

      if (data) {
        setOrganization(data);
        setFormData({ name: data.name });
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Database connection error';
      toast.error(`Failed to load organization: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (organization) {
        // Update existing organization
        const { error } = await supabase
          .from('organizations')
          .update({
            name: formData.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', organization.id);

        if (error) throw error;
      } else {
        // Create new organization
        const { data, error } = await supabase
          .from('organizations')
          .insert({
            name: formData.name
          })
          .select()
          .single();

        if (error) throw error;
        setOrganization(data);
      }

      toast.success('Organization details saved successfully');
      setIsEditing(false);
      fetchOrganization();
    } catch (error) {
      console.error('Error saving organization:', error);
      toast.error('Failed to save organization details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-white shadow-md rounded-xl border border-gray-100">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-md rounded-xl border border-gray-100">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5 text-teal-600" />
            Organization Details
          </CardTitle>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="organizationName">Organization Name</Label>
            {isEditing ? (
              <Input
                id="organizationName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
              />
            ) : (
              <div className="mt-1 text-sm text-gray-900">
                {organization?.name || 'No organization name set'}
              </div>
            )}
          </div>

          {organization && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Created</Label>
                <div className="text-gray-600">
                  {new Date(organization.created_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <Label>Last Updated</Label>
                <div className="text-gray-600">
                  {new Date(organization.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name.trim()}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditing(false);
                setFormData({ name: organization?.name || '' });
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrganizationDetails;
