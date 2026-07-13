
import { useState, useEffect } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Building, MapPin, Clock, Globe, Plus, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCompanyInfo } from "@/hooks/useCompanyInfo";
import { useToast } from "@/hooks/use-toast";
import { TaxSettingsSection } from "./company/TaxSettingsSection";
import { TaxSystemStatusCard } from "@/components/tax/TaxSystemStatusCard";
import { CompanyValidationStatus } from "./company/CompanyValidationStatus";
import { supabase } from "@/integrations/supabase/client";

export function CompanyTab() {
  const { toast } = useToast();
  const [taxDataChanged, setTaxDataChanged] = useState(false);
  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [customIndustryName, setCustomIndustryName] = useState('');
  const [addingCustomIndustry, setAddingCustomIndustry] = useState(false);
  
  const {
    companyInfo,
    businessHours,
    loading,
    saving,
    uploadingLogo,
    businessTypes,
    businessIndustries,
    isLoadingConstants,
    initialized,
    saveComplete,
    dataChanged,
    handleInputChange,
    handleSelectChange,
    handleBusinessHoursChange,
    handleFileUpload,
    handleSave,
    loadCompanyInfo
  } = useCompanyInfo();

  // Get shopId from the company info hook
  const [shopId, setShopId] = useState<string>('');
  
  useEffect(() => {
    const getShopId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('shop_id')
            .or(`id.eq.${user.id},user_id.eq.${user.id}`)
            .maybeSingle();
          if (profile?.shop_id) {
            setShopId(profile.shop_id);
          }
        }
      } catch (error) {
        console.error('Error getting shop ID:', error);
      }
    };
    getShopId();
  }, []);

  const addCustomIndustry = async () => {
    if (!customIndustryName.trim()) return;

    try {
      setAddingCustomIndustry(true);

      const { data, error } = await supabase.rpc('addcustomindustry', {
        industry_name: customIndustryName.trim()
      });

      if (error) throw error;

      // Reload company info to get updated industries
      await loadCompanyInfo();
      
      // Select the new custom industry
      handleSelectChange('industry', customIndustryName.trim().toLowerCase().replace(/\s+/g, '_'));
      
      setCustomIndustryName('');
      setShowCustomIndustry(false);

      toast({
        title: 'Success',
        description: 'Custom industry added successfully',
      });
    } catch (error) {
      console.error('Error adding custom industry:', error);
      toast({
        title: 'Error',
        description: 'Failed to add custom industry',
        variant: 'destructive',
      });
    } finally {
      setAddingCustomIndustry(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Company Validation Status */}
      {initialized && <CompanyValidationStatus companyInfo={companyInfo} />}
      
      {/* Basic Company Information */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <Building className="h-5 w-5 text-primary" />
            <CardTitle>Company Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name</Label>
              <Input
                id="name"
                name="name"
                value={companyInfo.name || ''}
                onChange={handleInputChange}
                placeholder="Enter company name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tax_id">Tax ID / EIN</Label>
              <Input
                id="tax_id"
                name="tax_id"
                value={companyInfo.tax_id || ''}
                onChange={handleInputChange}
                placeholder="Enter tax ID or EIN"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="business_type">Business Type</Label>
              <Select 
                value={companyInfo.business_type || ''} 
                onValueChange={(value) => handleSelectChange('business_type', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <div className="flex gap-2">
                <Select 
                  value={companyInfo.industry || ''} 
                  onValueChange={(value) => handleSelectChange('industry', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {businessIndustries.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>
                        {industry.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Dialog open={showCustomIndustry} onOpenChange={setShowCustomIndustry}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" size="icon" title="Add Custom Industry">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Custom Industry</DialogTitle>
                      <DialogDescription>
                        Add a new industry that's not in the current list. This will be available for future use.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="custom-industry">Industry Name</Label>
                        <Input
                          id="custom-industry"
                          value={customIndustryName}
                          onChange={(e) => setCustomIndustryName(e.target.value)}
                          placeholder="e.g., Custom Manufacturing"
                          maxLength={100}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowCustomIndustry(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={addCustomIndustry}
                        disabled={addingCustomIndustry || !customIndustryName.trim()}
                      >
                        {addingCustomIndustry && (
                          <span className="animate-spin mr-2">⏳</span>
                        )}
                        Add Industry
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
          
          {companyInfo.industry === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="other_industry">Other Industry</Label>
              <Input
                id="other_industry"
                name="other_industry"
                value={companyInfo.other_industry || ''}
                onChange={handleInputChange}
                placeholder="Enter other industry"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Contact Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                value={companyInfo.phone || ''}
                onChange={handleInputChange}
                placeholder="Enter phone number"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={companyInfo.email || ''}
                onChange={handleInputChange}
                placeholder="Enter email address"
              />
            </div>
            
          </div>
          
          {/* Website Field */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Input
                id="website"
                name="website"
                type="url"
                value={companyInfo.website || ''}
                onChange={handleInputChange}
                placeholder="https://www.yourcompany.com"
                className="pr-10"
              />
              {companyInfo.website && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => window.open(companyInfo.website, '_blank')}
                  title="Open website"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                name="address"
                value={companyInfo.address || ''}
                onChange={handleInputChange}
                placeholder="Enter street address"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  name="city"
                  value={companyInfo.city || ''}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={companyInfo.state || ''}
                  onChange={handleInputChange}
                  placeholder="Enter state"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  name="zip"
                  value={companyInfo.zip || ''}
                  onChange={handleInputChange}
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Description */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>Company Description</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="description">About Your Company</Label>
            <Textarea
              id="description"
              name="description"
              value={companyInfo.description || ''}
              onChange={(e) => {
                const target = e.target as HTMLTextAreaElement;
                handleInputChange({
                  target: {
                    id: 'description',
                    value: target.value
                  }
                } as React.ChangeEvent<HTMLInputElement>);
              }}
              placeholder="Briefly describe your company, services, and what makes you unique..."
              className="min-h-[100px] resize-y"
              maxLength={500}
            />
            <p className="text-sm text-muted-foreground">
              {(companyInfo.description || '').length}/500 characters
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader className="flex flex-row items-center space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Business Hours</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {businessHours.map((hours) => {
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const dayName = dayNames[hours.day_of_week];
              
              return (
                <div key={hours.day_of_week} className="flex items-center space-x-4">
                  <div className="w-24 font-medium">
                    {dayName}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="time"
                      value={hours.open_time}
                      onChange={(e) => {
                        const updatedHours = businessHours.map(h => 
                          h.day_of_week === hours.day_of_week 
                            ? { ...h, open_time: e.target.value }
                            : h
                        );
                        handleBusinessHoursChange(updatedHours);
                      }}
                      className="w-32"
                      disabled={hours.is_closed}
                    />
                    <span>to</span>
                    <Input
                      type="time"
                      value={hours.close_time}
                      onChange={(e) => {
                        const updatedHours = businessHours.map(h => 
                          h.day_of_week === hours.day_of_week 
                            ? { ...h, close_time: e.target.value }
                            : h
                        );
                        handleBusinessHoursChange(updatedHours);
                      }}
                      className="w-32"
                      disabled={hours.is_closed}
                    />
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={hours.is_closed}
                        onChange={(e) => {
                          const updatedHours = businessHours.map(h => 
                            h.day_of_week === hours.day_of_week 
                              ? { ...h, is_closed: e.target.checked }
                              : h
                          );
                          handleBusinessHoursChange(updatedHours);
                        }}
                        className="rounded"
                      />
                      <span>Closed</span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tax Settings with System Status */}
      {shopId && (
        <div className="space-y-4">
          <TaxSystemStatusCard shopId={shopId} />
          <TaxSettingsSection 
            shopId={shopId} 
            onDataChange={setTaxDataChanged}
          />
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          disabled={saving || !dataChanged}
          className="min-w-32"
        >
          {saving ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {dataChanged ? "Save Changes" : "No Changes"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
