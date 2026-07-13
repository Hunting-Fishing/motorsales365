import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Building2, Shield, Mail, Key, LogOut, Save } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { ChangeEmailDialog } from '@/components/profile/ChangeEmailDialog';
import { BusinessInformationCard } from '@/components/profile/BusinessInformationCard';

export default function Profile() {
  const { user } = useAuthUser();
  const { userProfile, loading, updateProfile } = useUserProfile();
  const { userRole, isLoading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    phone: '',
    jobTitle: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        firstName: userProfile.firstName || '',
        middleName: userProfile.middleName || '',
        lastName: userProfile.lastName || '',
        phone: userProfile.phone || '',
        jobTitle: userProfile.jobTitle || ''
      });
    }
  }, [userProfile]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error(error.message);
      } else {
        toast.success('Signed out successfully');
        navigate('/auth');
      }
    } catch (error) {
      toast.error('An error occurred while signing out');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const result = await updateProfile(formData);
      if (result.success) {
        toast.success('Profile updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-2xl font-bold">
          {formData.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {formData.firstName && formData.lastName 
              ? `${formData.firstName} ${formData.lastName}`
              : 'Your Profile'}
          </h1>
          <p className="text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="personal" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="business" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Business</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="middleName">Middle Name</Label>
                  <Input
                    id="middleName"
                    value={formData.middleName}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    placeholder="Enter middle name"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Email can be changed in the Security tab
                </p>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    value={formData.jobTitle}
                    onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                    placeholder="e.g. Manager"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={userRole?.displayName || 'User'}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">
                  Role is managed by administrators
                </p>
              </div>

              <div className="pt-4 border-t">
                <Button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Tab */}
        <TabsContent value="business" className="mt-6">
          <BusinessInformationCard />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="mt-6">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Security & Account</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Button 
                  variant="outline" 
                  className="w-full justify-start h-14 px-4"
                  onClick={() => setShowEmailDialog(true)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Change Email Address</p>
                      <p className="text-sm text-muted-foreground">Update your account email</p>
                    </div>
                  </div>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start h-14 px-4"
                  onClick={() => setShowPasswordDialog(true)}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Key className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Change Password</p>
                      <p className="text-sm text-muted-foreground">Update your account password</p>
                    </div>
                  </div>
                </Button>

                <div className="pt-4 border-t">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start h-14 px-4 border-red-200 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950"
                    onClick={handleSignOut}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-red-600 dark:text-red-400">Sign Out</p>
                        <p className="text-sm text-muted-foreground">Log out of your account</p>
                      </div>
                    </div>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
      />
      
      <ChangeEmailDialog
        open={showEmailDialog}
        onOpenChange={setShowEmailDialog}
        currentEmail={userProfile?.email || ''}
        userId={user?.id || ''}
      />
    </div>
  );
}
