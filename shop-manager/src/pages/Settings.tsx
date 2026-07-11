import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { lazy, Suspense } from 'react';

// Lazy load settings pages - Account & Profile
const AccountSettings = lazy(() => import('./settings/AccountSettings'));
const AppearanceSettings = lazy(() => import('./settings/AppearanceSettings'));
const LanguageSettings = lazy(() => import('./settings/LanguageSettings'));

// Lazy load settings pages - Basic Settings
const CompanySettings = lazy(() => import('./settings/CompanySettings'));
const DashboardSettings = lazy(() => import('./settings/DashboardSettings'));
const TeamSettings = lazy(() => import('./settings/TeamSettings'));
const BrandingSettings = lazy(() => import('./settings/BrandingSettings'));
const NotificationSettings = lazy(() => import('./settings/NotificationSettings'));
const SecuritySettings = lazy(() => import('./settings/SecuritySettings'));
const NavigationSettings = lazy(() => import('@/components/settings/NavigationSettingsTab').then(m => ({ default: m.NavigationSettingsTab })));
const BusinessModulesSettings = lazy(() => import('./settings/BusinessModulesSettings'));

// Lazy load settings pages - Operations
const WorkOrdersSettings = lazy(() => import('./settings/WorkOrdersSettings'));
const InventorySettings = lazy(() => import('./settings/InventorySettings'));
const DIYBaySettings = lazy(() => import('./settings/DIYBaySettings'));
const LabourSettings = lazy(() => import('./settings/LabourSettings'));
const MarkupSettings = lazy(() => import('./settings/MarkupSettings'));
const LocationManagement = lazy(() => import('./settings/LocationManagement'));
const InspectionTemplateSettings = lazy(() => import('./settings/InspectionTemplateSettings'));

// Lazy load settings pages - Communications
const EmailSettings = lazy(() => import('./settings/EmailSettings'));
const EmailSchedulingSettings = lazy(() => import('./settings/EmailSchedulingSettings'));

// Lazy load settings pages - Non-Profit
const NonProfitSettings = lazy(() => import('./settings/NonProfitSettings'));
const ProgramSettings = lazy(() => import('./settings/ProgramSettings'));
const VolunteerSettings = lazy(() => import('./settings/VolunteerSettings'));
const TrainingSettings = lazy(() => import('./settings/TrainingSettings'));
const GrantSettings = lazy(() => import('./settings/GrantSettings'));
const AssetSettings = lazy(() => import('./settings/AssetSettings'));
const BoardMeetingSettings = lazy(() => import('./settings/BoardMeetingSettings'));
const ComplianceSettings = lazy(() => import('./settings/ComplianceSettings'));
const ImpactSettings = lazy(() => import('./settings/ImpactSettings'));
const RaffleSettings = lazy(() => import('./settings/RaffleSettings'));

// Lazy load settings pages - Finance & Billing
const FinancialSettings = lazy(() => import('./settings/FinancialSettings'));
const BudgetSettings = lazy(() => import('./settings/BudgetSettings'));
const BillingSettings = lazy(() => import('./settings/BillingSettings'));
const LoyaltySettings = lazy(() => import('./settings/LoyaltySettings'));
const UsageSettings = lazy(() => import('./settings/UsageSettings'));

// Lazy load settings pages - Integrations
const IntegrationsSettings = lazy(() => import('./settings/IntegrationsSettings'));
const DataExportSettings = lazy(() => import('./settings/DataExportSettings'));

// Lazy load settings pages - Access Control
const RolePermissionsSettings = lazy(() => import('./settings/RolePermissionsSettings'));
const UserPermissionsSettings = lazy(() => import('./settings/UserPermissionsSettings'));
const EmployeePermissions = lazy(() => import('./settings/EmployeePermissions'));
const SecurityAdvancedSettings = lazy(() => import('./settings/SecurityAdvancedSettings'));
const TeamHistorySettings = lazy(() => import('./settings/TeamHistorySettings'));

// Lazy load settings pages - Public Interface
const PublicPortalSettings = lazy(() => import('./settings/PublicPortalSettings'));
const SchedulingSettings = lazy(() => import('./settings/SchedulingSettings'));

export default function Settings() {
  usePageTitle('Settings');

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Routes>
        <Route index element={<SettingsLayout />} />
        
        {/* Account & Profile */}
        <Route path="account" element={<AccountSettings />} />
        <Route path="appearance" element={<AppearanceSettings />} />
        <Route path="language" element={<LanguageSettings />} />
        
        {/* Basic Settings */}
        <Route path="company" element={<CompanySettings />} />
        <Route path="dashboard" element={<DashboardSettings />} />
        <Route path="team" element={<TeamSettings />} />
        <Route path="branding" element={<BrandingSettings />} />
        <Route path="notifications" element={<NotificationSettings />} />
        <Route path="security" element={<SecuritySettings />} />
        <Route path="navigation" element={<NavigationSettings />} />
        <Route path="business-modules" element={<BusinessModulesSettings />} />
        
        {/* Operations */}
        <Route path="work-orders" element={<WorkOrdersSettings />} />
        <Route path="inventory" element={<InventorySettings />} />
        <Route path="diy-bays" element={<DIYBaySettings />} />
        <Route path="labour" element={<LabourSettings />} />
        <Route path="markup" element={<MarkupSettings />} />
        <Route path="locations" element={<LocationManagement />} />
        <Route path="inspection-templates" element={<InspectionTemplateSettings />} />
        
        {/* Communications */}
        <Route path="email" element={<EmailSettings />} />
        <Route path="email-scheduling" element={<EmailSchedulingSettings />} />
        
        {/* Non-Profit */}
        <Route path="nonprofit" element={<NonProfitSettings />} />
        <Route path="programs" element={<ProgramSettings />} />
        <Route path="volunteers" element={<VolunteerSettings />} />
        <Route path="training" element={<TrainingSettings />} />
        <Route path="grants" element={<GrantSettings />} />
        <Route path="asset-tracking" element={<AssetSettings />} />
        <Route path="board-meetings" element={<BoardMeetingSettings />} />
        <Route path="compliance" element={<ComplianceSettings />} />
        <Route path="impact" element={<ImpactSettings />} />
        <Route path="raffles" element={<RaffleSettings />} />
        
        {/* Finance & Billing */}
        <Route path="financial" element={<FinancialSettings />} />
        <Route path="budget-management" element={<BudgetSettings />} />
        <Route path="billing" element={<BillingSettings />} />
        <Route path="loyalty" element={<LoyaltySettings />} />
        <Route path="usage" element={<UsageSettings />} />
        
        {/* Integrations */}
        <Route path="integrations" element={<IntegrationsSettings />} />
        <Route path="data-export" element={<DataExportSettings />} />
        
        {/* Access Control */}
        <Route path="role-permissions" element={<RolePermissionsSettings />} />
        <Route path="user-permissions" element={<UserPermissionsSettings />} />
        <Route path="employee-permissions" element={<EmployeePermissions />} />
        <Route path="security-advanced" element={<SecurityAdvancedSettings />} />
        <Route path="team-history" element={<TeamHistorySettings />} />
        
        {/* Public Interface */}
        <Route path="public-portal" element={<PublicPortalSettings />} />
        <Route path="scheduling" element={<SchedulingSettings />} />
      </Routes>
    </Suspense>
  );
}
