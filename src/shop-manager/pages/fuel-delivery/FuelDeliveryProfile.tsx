import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Shield, Mail, Key, LogOut, Save, ArrowLeft } from 'lucide-react';
import { ChangePasswordDialog } from '@/components/profile/ChangePasswordDialog';
import { ChangeEmailDialog } from '@/components/profile/ChangeEmailDialog';

export default function FuelDeliveryProfile() {
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
        navigate('/login');
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => navigate('/fuel-delivery')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-2xl font-bold">
          {formData.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {formData.firstName && formData.lastName 
              ? `${formData.firstName} ${formData.lastName}`
              : 'Your Profile'}
          </h1>
          <p className="text-muted-foreground">Fuel Delivery Manager</p>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-orange-500" />
            <CardTitle>Personal Information</CardTitle>
          </div>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                placeholder="Enter job title"
              />
            </div>
          </div>
          <Button onClick={handleSaveProfile} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Account Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            <CardTitle>Account Security</CardTitle>
          </div>
          <CardDescription>Manage your email and password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Address</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowEmailDialog(true)}>
              Change Email
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-4">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Password</p>
                <p className="text-sm text-muted-foreground">••••••••</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => setShowPasswordDialog(true)}>
              Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/50">
            <div className="flex items-center gap-4">
              <LogOut className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Sign Out</p>
                <p className="text-sm text-muted-foreground">Sign out of your account</p>
              </div>
            </div>
            <Button variant="destructive" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Role */}
      <Card>
        <CardHeader>
          <CardTitle>Your Role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
            <Shield className="h-4 w-4" />
            <span className="capitalize font-medium">
              {typeof userRole === 'string' ? userRole : userRole?.name || 'User'}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ChangePasswordDialog 
        open={showPasswordDialog} 
        onOpenChange={setShowPasswordDialog} 
      />
      <ChangeEmailDialog 
        open={showEmailDialog} 
        onOpenChange={setShowEmailDialog}
        currentEmail={user?.email || ''}
        userId={user?.id || ''}
      />
    </div>
  );
}
