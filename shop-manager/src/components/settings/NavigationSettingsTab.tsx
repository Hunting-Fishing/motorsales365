import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LayoutList, Save, ChevronDown, ChevronRight, ShieldX } from 'lucide-react';
import { navigation } from '@/components/layout/sidebar/navigation';
import { useSidebarVisibilitySettings, useUpdateSidebarVisibility, SidebarVisibilitySettings } from '@/hooks/useSidebarVisibility';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { AccountMenuSettingsCard } from '@/components/settings/AccountMenuSettingsCard';

const AVAILABLE_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Administrator' },
  { value: 'manager', label: 'Manager' },
  { value: 'service_advisor', label: 'Service Advisor' },
  { value: 'technician', label: 'Technician' },
  { value: 'reception', label: 'Reception' },
  { value: 'inventory_manager', label: 'Inventory Manager' },
  { value: 'parts_manager', label: 'Parts Manager' },
];

const ALWAYS_VISIBLE_SECTIONS = ['Dashboard', 'Settings', 'Support'];

export function NavigationSettingsTab() {
  return (
    <RoleGuard 
      allowedRoles={['owner', 'manager']}
      fallback={
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <ShieldX className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">Access Restricted</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Only Managers and Owners can configure navigation settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      }
    >
      <NavigationSettingsContent />
    </RoleGuard>
  );
}

function NavigationSettingsContent() {
  const { data: settings, isLoading } = useSidebarVisibilitySettings();
  const updateMutation = useUpdateSidebarVisibility();
  const [hiddenSections, setHiddenSections] = useState<string[]>([]);
  const [sectionRoles, setSectionRoles] = useState<Record<string, string[]>>({});
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
      setHiddenSections(settings.hidden_sections || []);
      setSectionRoles(settings.section_roles || {});
    }
  }, [settings]);

  const handleToggleSection = (sectionTitle: string) => {
    setHiddenSections(prev => {
      if (prev.includes(sectionTitle)) {
        return prev.filter(s => s !== sectionTitle);
      } else {
        return [...prev, sectionTitle];
      }
    });
  };

  const handleToggleRole = (sectionTitle: string, role: string) => {
    setSectionRoles(prev => {
      const currentRoles = prev[sectionTitle] || [];
      const newRoles = currentRoles.includes(role)
        ? currentRoles.filter(r => r !== role)
        : [...currentRoles, role];
      
      return {
        ...prev,
        [sectionTitle]: newRoles,
      };
    });
  };

  const handleSave = async () => {
    const newSettings: SidebarVisibilitySettings = {
      hidden_sections: hiddenSections,
      section_roles: sectionRoles,
    };

    try {
      await updateMutation.mutateAsync(newSettings);
      toast.success('Navigation settings saved successfully');
    } catch (error) {
      console.error('Error saving navigation settings:', error);
      toast.error('Failed to save navigation settings');
    }
  };

  const toggleSectionExpanded = (sectionTitle: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionTitle)
        ? prev.filter(s => s !== sectionTitle)
        : [...prev, sectionTitle]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading navigation settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AccountMenuSettingsCard />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutList className="h-5 w-5" />
            <CardTitle>Sidebar Navigation Settings</CardTitle>
          </div>
          <CardDescription>
            Control which sections appear in the sidebar and who can see them
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Section Visibility */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Section Visibility</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Toggle which sections appear in the sidebar for all users
              </p>
            </div>

            <div className="space-y-3">
              {navigation.map((section) => {
                const isAlwaysVisible = ALWAYS_VISIBLE_SECTIONS.includes(section.title);
                const isHidden = hiddenSections.includes(section.title);
                const SectionIcon = section.items[0]?.icon;

                return (
                  <div
                    key={section.title}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {SectionIcon && <SectionIcon className="h-4 w-4 text-muted-foreground" />}
                      <Label
                        htmlFor={`section-${section.title}`}
                        className={`font-medium ${isAlwaysVisible ? 'text-muted-foreground' : ''}`}
                      >
                        {section.title}
                        {isAlwaysVisible && (
                          <span className="ml-2 text-xs text-muted-foreground">(always visible)</span>
                        )}
                      </Label>
                    </div>
                    <Switch
                      id={`section-${section.title}`}
                      checked={!isHidden}
                      onCheckedChange={() => handleToggleSection(section.title)}
                      disabled={isAlwaysVisible}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Role-Based Access */}
          <div className="space-y-4 pt-6 border-t">
            <div>
              <h3 className="text-lg font-semibold mb-2">Role-Based Access</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Control which roles can see each section. Leave all unchecked to allow all roles.
              </p>
            </div>

            <div className="space-y-2">
              {navigation
                .filter(section => !hiddenSections.includes(section.title))
                .map((section) => {
                  const isExpanded = expandedSections.includes(section.title);
                  const currentRoles = sectionRoles[section.title] || [];
                  const SectionIcon = section.items[0]?.icon;

                  return (
                    <Collapsible
                      key={section.title}
                      open={isExpanded}
                      onOpenChange={() => toggleSectionExpanded(section.title)}
                    >
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-between p-3 h-auto hover:bg-accent"
                        >
                          <div className="flex items-center gap-3">
                            {SectionIcon && <SectionIcon className="h-4 w-4 text-muted-foreground" />}
                            <span className="font-medium">{section.title}</span>
                            {currentRoles.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                ({currentRoles.length} role{currentRoles.length !== 1 ? 's' : ''})
                              </span>
                            )}
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-4 py-3 space-y-3 border-l-2 ml-6">
                        <div className="grid grid-cols-2 gap-3">
                          {AVAILABLE_ROLES.map((role) => (
                            <div key={role.value} className="flex items-center space-x-2">
                              <Checkbox
                                id={`${section.title}-${role.value}`}
                                checked={currentRoles.includes(role.value)}
                                onCheckedChange={() => handleToggleRole(section.title, role.value)}
                              />
                              <Label
                                htmlFor={`${section.title}-${role.value}`}
                                className="text-sm cursor-pointer"
                              >
                                {role.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        {currentRoles.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">
                            All roles can access this section
                          </p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-6 border-t flex justify-end">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
