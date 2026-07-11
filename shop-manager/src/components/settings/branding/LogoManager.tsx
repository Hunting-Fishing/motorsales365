import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, Trash2, Eye, Download, Palette, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';

interface LogoManagerProps {
  currentLogoUrl?: string;
  onLogoUpdate: (logoUrl: string) => void;
}

export function LogoManager({ currentLogoUrl, onLogoUpdate }: LogoManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl || null);
  const { toast } = useToast();
  const { reloadCompanyInfo } = useCompany();

  useEffect(() => {
    setLogoPreview(currentLogoUrl || null);
  }, [currentLogoUrl]);

  const uploadLogo = async (file: File) => {
    try {
      setUploading(true);

      // Get current user's shop ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('Shop not found');

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.shop_id}/logo-${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      // Update company settings
      await supabase
        .from('company_settings')
        .upsert({
          shop_id: profile.shop_id,
          settings_key: 'company_info',
          settings_value: { logo_url: publicUrl },
        });

      setLogoPreview(publicUrl);
      onLogoUpdate(publicUrl);
      reloadCompanyInfo();

      toast({
        title: 'Success',
        description: 'Logo uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const removeLogo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('shop_id')
        .or(`id.eq.${user.id},user_id.eq.${user.id}`)
        .maybeSingle();

      if (!profile?.shop_id) throw new Error('Shop not found');

      // Update company settings to remove logo
      await supabase
        .from('company_settings')
        .upsert({
          shop_id: profile.shop_id,
          settings_key: 'company_info',
          settings_value: { logo_url: '' },
        });

      setLogoPreview(null);
      onLogoUpdate('');
      reloadCompanyInfo();

      toast({
        title: 'Success',
        description: 'Logo removed successfully',
      });
    } catch (error) {
      console.error('Error removing logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove logo',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Error',
        description: 'Please select a valid image file',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Error',
        description: 'File size must be less than 5MB',
        variant: 'destructive',
      });
      return;
    }

    uploadLogo(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Company Logo
        </CardTitle>
        <CardDescription>
          Upload and manage your company logo. This will appear across your application.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Preview */}
        <div className="flex items-center justify-center">
          <div className="relative">
            {logoPreview ? (
              <div className="relative group">
                <img
                  src={logoPreview}
                  alt="Company Logo"
                  className="h-32 w-auto max-w-64 object-contain border rounded-lg"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => window.open(logoPreview, '_blank')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={removeLogo}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="h-32 w-64 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No logo uploaded</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Controls */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="logo-upload">Upload New Logo</Label>
            <div className="mt-2">
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading}
                className="cursor-pointer"
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Supported formats: PNG, JPG, GIF. Max size: 5MB
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => document.getElementById('logo-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {logoPreview ? 'Replace Logo' : 'Upload Logo'}
                </>
              )}
            </Button>

            {logoPreview && (
              <Button variant="outline" onClick={removeLogo}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Logo
              </Button>
            )}
          </div>
        </div>

        {/* Logo Guidelines */}
        <div className="bg-blue-50 dark:bg-blue-950/50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            Logo Guidelines
          </h4>
          <ul className="text-sm text-blue-600 dark:text-blue-300 space-y-1">
            <li>• Use high-resolution images for best quality</li>
            <li>• Square or rectangular formats work best</li>
            <li>• Transparent backgrounds (PNG) recommended</li>
            <li>• Logo will be automatically resized for different contexts</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}