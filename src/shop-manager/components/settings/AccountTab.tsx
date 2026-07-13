
import React, { useState, useEffect } from "react";
import { ProfileForm } from "./profile/ProfileForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Theme functionality temporarily disabled
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Palette, Building } from "lucide-react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { BrandingTab } from "./BrandingTab";
import { CompanyTab } from "./CompanyTab";

export function AccountTab() {
  // Theme functionality temporarily disabled
  const theme = 'light';
  const setTheme = () => {};
  const resolvedTheme = 'light';
  const [activeTab, setActiveTab] = useState("profile");
  const { toast } = useToast();
  
  const {
    userProfile,
    loading,
    error,
    updateProfile
  } = useUserProfile();
  
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: ""
  });

  const [savingProfile, setSavingProfile] = useState(false);

  // Handle profile data loading
  useEffect(() => {
    if (userProfile && !loading) {
      setFormData({
        firstName: userProfile.firstName || "",
        middleName: userProfile.middleName || "",
        lastName: userProfile.lastName || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        jobTitle: userProfile.jobTitle || ""
      });
      console.log("Form data updated from userProfile:", userProfile);
    }
  }, [userProfile]);

  // Check URL parameters for tab selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam && ['profile', 'branding', 'company'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, []);

  const isDarkModeEnabled = false; // Theme temporarily disabled

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSavingProfile(true);
      
      await updateProfile({
        firstName: formData.firstName,
        middleName: formData.middleName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        jobTitle: formData.jobTitle
      });
      
      toast({
        title: "Profile updated",
        description: "Your profile information has been saved.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id === 'company-firstName' ? 'firstName' :
       id === 'company-middleName' ? 'middleName' :
       id === 'company-lastName' ? 'lastName' : 
       id === 'company-email' ? 'email' : 
       id === 'company-phone' ? 'phone' : 
       id === 'company-jobTitle' ? 'jobTitle' : id]: value
    }));
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span>Branding</span>
          </TabsTrigger>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>Company</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ProfileForm 
              formData={formData} 
              onChange={handleInputChange}
              onSubmit={handleSubmit}
              isSaving={savingProfile}
            />
          )}
        </TabsContent>

        <TabsContent value="branding" className="mt-4">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <CompanyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
