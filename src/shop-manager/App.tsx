import React, { lazy, Suspense, useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from '@sm/components/ui/toaster';
import { Toaster as SonnerToaster } from '@sm/components/ui/sonner';
import { Layout } from '@sm/components/layout/Layout';
import { ProtectedRoute } from '@sm/components/auth/ProtectedRoute';
import { AuthGate } from '@sm/components/AuthGate';
import { authMonitor } from '@sm/utils/authMonitoring';
import { GlobalUX } from '@sm/components/ux/GlobalUX';
import { AuthenticatedProviders } from '@sm/components/auth/AuthenticatedProviders';
import ab365Logo from '@sm/assets/ab365-logo.png';

// Chunk-aware error boundary that auto-recovers from stale chunk failures
const CHUNK_RETRY_KEY = '__ab365_chunk_reload_once__';

function isChunkError(error: Error): boolean {
  const msg = error?.message || '';
  return (
    error?.name === 'ChunkLoadError' ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('ChunkLoadError')
  );
}

interface ChunkErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ChunkErrorBoundary extends Component<{ children: ReactNode }, ChunkErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ChunkErrorBoundary caught:', error.message);
    // Do NOT reload here — main.tsx global listeners handle that.
    // This boundary only shows fallback UI if global reload already failed.
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="max-w-sm w-full text-center space-y-4">
            <img src={ab365Logo} alt="365 Motor Sales" className="h-12 mx-auto" />
            <h2 className="text-lg font-semibold text-foreground">Page failed to load</h2>
            <p className="text-sm text-muted-foreground">
              A new version may be available. Please reload to continue.
            </p>
            <button
              onClick={() => {
                try { sessionStorage.removeItem(CHUNK_RETRY_KEY); } catch {}
                window.location.reload();
              }}
              className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Branded page loader with timeout fallback
const PageLoader = () => {
  const [showReloadHint, setShowReloadHint] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowReloadHint(true), 10000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center space-y-4">
      <img src={ab365Logo} alt="Loading" className="h-10 opacity-80" />
      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      <p className="text-sm text-muted-foreground">Loading the latest version…</p>
      {showReloadHint && (
        <button
          onClick={() => window.location.reload()}
          className="text-xs text-muted-foreground hover:text-primary underline"
        >
          Taking too long? Click to reload
        </button>
      )}
    </div>
  );
};

// ============================================================
// ALL page imports are lazy-loaded for code-splitting
// ============================================================

// Core Pages
const Dashboard = lazy(() => import('@sm/pages/Dashboard'));
const ModuleHub = lazy(() => import('@sm/pages/ModuleHub'));
const Shopping = lazy(() => import('@sm/pages/Shopping'));
const ProductDetail = lazy(() => import('@sm/pages/ProductDetail'));
const CustomerPortal = lazy(() => import('@sm/pages/CustomerPortal'));
const WorkOrders = lazy(() => import('@sm/pages/WorkOrders'));
const Customers = lazy(() => import('@sm/pages/Customers'));
const Inventory = lazy(() => import('@sm/pages/Inventory'));
const InventoryAnalytics = lazy(() => import('@sm/pages/InventoryAnalytics'));
const InventoryManager = lazy(() => import('@sm/pages/InventoryManager'));
const InventoryAdd = lazy(() => import('@sm/pages/InventoryAdd'));
const ServicePackages = lazy(() => import('@sm/pages/ServicePackages'));
const AssetUsageTracking = lazy(() => import('@sm/pages/AssetUsageTracking'));
const ConsumptionTracking = lazy(() => import('@sm/pages/ConsumptionTracking'));
const MobileInventory = lazy(() => import('@sm/pages/MobileInventory'));
const MaintenancePlanning = lazy(() => import('@sm/pages/MaintenancePlanning'));
const Analytics = lazy(() => import('@sm/pages/Analytics'));
const Settings = lazy(() => import('@sm/pages/Settings'));
const Calendar = lazy(() => import('@sm/pages/Calendar'));
const Team = lazy(() => import('@sm/pages/Team'));
const CustomerComms = lazy(() => import('@sm/pages/CustomerComms'));
const CallLogger = lazy(() => import('@sm/pages/CallLogger'));
const Help = lazy(() => import('@sm/pages/Help'));
const ServiceReminders = lazy(() => import('@sm/pages/ServiceReminders'));
const Quotes = lazy(() => import('@sm/pages/Quotes'));
const Invoices = lazy(() => import('@sm/pages/Invoices'));
const ServiceBoard = lazy(() => import('@sm/pages/ServiceBoard'));
const Payments = lazy(() => import('@sm/pages/Payments'));
const CompanyProfile = lazy(() => import('@sm/pages/CompanyProfile'));
const Documents = lazy(() => import('@sm/pages/Documents'));
const Contacts = lazy(() => import('@sm/pages/Contacts'));
const ServiceCatalog = lazy(() => import('@sm/pages/ServiceCatalog'));
const RepairPlans = lazy(() => import('@sm/pages/RepairPlans'));
const Login = lazy(() => import('@sm/pages/Login'));
const StaffLogin = lazy(() => import('@sm/pages/StaffLogin'));
const Signup = lazy(() => import('@sm/pages/Signup'));
const About = lazy(() => import('@sm/pages/About'));
const Pricing = lazy(() => import('@sm/pages/Pricing'));
const ArticleViewer = lazy(() => import('@sm/components/help/ArticleViewer').then(m => ({ default: m.ArticleViewer })));
const LearningPathDetail = lazy(() => import('@sm/components/help/LearningPathDetail').then(m => ({ default: m.LearningPathDetail })));
const ServiceManagementPage = lazy(() => import('@sm/pages/developer/ServiceManagementPage').then(m => ({ default: m.ServiceManagementPage })));
const InvoiceDetails = lazy(() => import('@sm/pages/InvoiceDetails'));
const SignatureDemo = lazy(() => import('@sm/pages/SignatureDemo'));
const EquipmentManagement = lazy(() => import('@sm/pages/EquipmentManagement'));
const Equipment = lazy(() => import('@sm/pages/Equipment'));
const EquipmentDetails = lazy(() => import('@sm/pages/EquipmentDetails'));
const EquipmentDashboard = lazy(() => import('@sm/pages/EquipmentDashboard'));
const FleetManagement = lazy(() => import('@sm/pages/FleetManagement'));
const SafetyEquipment = lazy(() => import('@sm/pages/SafetyEquipment'));
const MaintenanceRequests = lazy(() => import('@sm/pages/MaintenanceRequests'));
const ShoppingCartPage = lazy(() => import('@sm/pages/ShoppingCart'));
const WishlistPage = lazy(() => import('@sm/pages/WishlistPage'));
const Orders = lazy(() => import('@sm/pages/Orders'));
const Security = lazy(() => import('@sm/pages/Security'));
const Profile = lazy(() => import('@sm/pages/Profile'));
const Notifications = lazy(() => import('@sm/pages/Notifications'));
const Reports = lazy(() => import('@sm/pages/Reports'));
const Projects = lazy(() => import('@sm/pages/Projects'));
const ProjectDetails = lazy(() => import('@sm/pages/ProjectDetails'));
const Forms = lazy(() => import('@sm/pages/Forms'));
const FormSubmissions = lazy(() => import('@sm/pages/FormSubmissions'));
const QuoteDetails = lazy(() => import('@sm/pages/QuoteDetails'));
const WorkOrderDetails = lazy(() => import('@sm/pages/WorkOrderDetails'));
const RepairPlanDetails = lazy(() => import('@sm/pages/RepairPlanDetails'));
const AIHub = lazy(() => import('@sm/pages/AIHub'));
const Chat = lazy(() => import('@sm/pages/Chat'));
const EmailCampaigns = lazy(() => import('@sm/pages/EmailCampaigns'));
const EmailSequences = lazy(() => import('@sm/pages/EmailSequences'));
const EmailTemplates = lazy(() => import('@sm/pages/EmailTemplates'));
const Feedback = lazy(() => import('@sm/pages/Feedback'));
const FeedbackFormsPage = lazy(() => import('@sm/pages/feedback/FeedbackFormsPage'));
const FeedbackFormEditorPage = lazy(() => import('@sm/pages/feedback/FeedbackFormEditorPage'));
const FeedbackAnalyticsPage = lazy(() => import('@sm/pages/feedback/FeedbackAnalyticsPage'));
const SystemAdmin = lazy(() => import('@sm/pages/SystemAdmin'));
const AutomotiveDeveloper = lazy(() => import('@sm/pages/automotive/AutomotiveDeveloper'));
const MarineDeveloper = lazy(() => import('@sm/pages/marine/MarineDeveloper'));
const FuelDeliveryDeveloper = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryDeveloper'));
const SmsManagement = lazy(() => import('@sm/pages/SmsManagement'));
const SmsTemplates = lazy(() => import('@sm/pages/SmsTemplates'));
const Timesheet = lazy(() => import('@sm/pages/Timesheet'));
const FeatureRequests = lazy(() => import('@sm/pages/FeatureRequests'));
const EquipmentTracking = lazy(() => import('@sm/pages/EquipmentTracking'));
const EmployeeScheduling = lazy(() => import('@sm/pages/EmployeeScheduling'));
const TrainingOverview = lazy(() => import('@sm/pages/TrainingOverview'));
const DailyLogs = lazy(() => import('@sm/pages/DailyLogs'));
const Insurance = lazy(() => import('@sm/pages/Insurance'));
const FuelManagement = lazy(() => import('@sm/pages/FuelManagement'));
const Warranties = lazy(() => import('@sm/pages/Warranties'));
const DriverManagement = lazy(() => import('@sm/pages/DriverManagement'));
const TireManagement = lazy(() => import('@sm/pages/TireManagement'));
const AccountingIntegration = lazy(() => import('@sm/pages/AccountingIntegration'));
const Safety = lazy(() => import('@sm/pages/Safety'));
const SafetyIncidents = lazy(() => import('@sm/pages/SafetyIncidents'));
const SafetyIncidentNew = lazy(() => import('@sm/pages/SafetyIncidentNew'));
const SafetyIncidentDetails = lazy(() => import('@sm/pages/SafetyIncidentDetails'));
const SafetyInspections = lazy(() => import('@sm/pages/SafetyInspections'));
const SafetyInspectionNew = lazy(() => import('@sm/pages/SafetyInspectionNew'));
const SafetyDVIR = lazy(() => import('@sm/pages/SafetyDVIR'));
const SafetyDVIRNew = lazy(() => import('@sm/pages/SafetyDVIRNew'));
const SafetyDVIRDetails = lazy(() => import('@sm/pages/SafetyDVIRDetails'));
const SafetyLiftInspections = lazy(() => import('@sm/pages/SafetyLiftInspections'));
const ForkliftInspection = lazy(() => import('@sm/pages/ForkliftInspection'));
const VesselInspection = lazy(() => import('@sm/pages/VesselInspection'));
const VesselInspectionHistoryPage = lazy(() => import('@sm/pages/VesselInspectionHistoryPage'));
const InspectionAnalytics = lazy(() => import('@sm/pages/InspectionAnalytics'));
const SafetyLiftInspectionNew = lazy(() => import('@sm/pages/SafetyLiftInspectionNew'));
const SafetyDocuments = lazy(() => import('@sm/pages/SafetyDocuments'));
const SafetyCertifications = lazy(() => import('@sm/pages/SafetyCertifications'));
const SafetySchedules = lazy(() => import('@sm/pages/SafetySchedules'));
const SafetyReports = lazy(() => import('@sm/pages/SafetyReports'));
const SafetyCorrectiveActions = lazy(() => import('@sm/pages/SafetyCorrectiveActions'));
const SafetyNearMiss = lazy(() => import('@sm/pages/SafetyNearMiss'));
const SafetyTraining = lazy(() => import('@sm/pages/SafetyTraining'));
const SafetyMeetings = lazy(() => import('@sm/pages/SafetyMeetings'));
const SafetyJSA = lazy(() => import('@sm/pages/SafetyJSA'));
const SafetyPPE = lazy(() => import('@sm/pages/SafetyPPE'));
const SafetyContractors = lazy(() => import('@sm/pages/SafetyContractors'));
const SafetyGamification = lazy(() => import('@sm/pages/SafetyGamification'));
const TechnicianPortal = lazy(() => import('@sm/pages/TechnicianPortal'));
const SetupBrianAuth = lazy(() => import('@sm/pages/SetupBrianAuth'));
const Onboarding = lazy(() => import('@sm/pages/Onboarding'));
const ShopSetup = lazy(() => import('@sm/pages/ShopSetup'));
const SecurityAudit = lazy(() => import('@sm/pages/SecurityAudit'));
const ResetPassword = lazy(() => import('@sm/pages/ResetPassword'));
const Planner = lazy(() => import('@sm/pages/Planner'));
const Payroll = lazy(() => import('@sm/pages/Payroll'));
const AdvancedAnalytics = lazy(() => import('@sm/pages/AdvancedAnalytics'));
const AffiliateTool = lazy(() => import('@sm/pages/AffiliateTool'));
const AffiliateVerification = lazy(() => import('@sm/pages/AffiliateVerification'));
const Store = lazy(() => import('@sm/pages/Store'));
const BoatInspection = lazy(() => import('@sm/pages/BoatInspection'));
const Checkout = lazy(() => import('@sm/pages/Checkout'));
const ClientBooking = lazy(() => import('@sm/pages/ClientBooking'));
const BookingManagement = lazy(() => import('@sm/pages/BookingManagement'));
const CustomerAnalytics = lazy(() => import('@sm/pages/CustomerAnalytics'));
const CustomerExperience = lazy(() => import('@sm/pages/CustomerExperience'));
const CustomerFollowUps = lazy(() => import('@sm/pages/CustomerFollowUps'));
const CustomerPortalLoginOld = lazy(() => import('@sm/pages/CustomerPortalLogin'));
const CustomerPortalAuthLogin = lazy(() => import('@sm/pages/customer-portal/CustomerPortalLogin'));
const CustomerPortalRegister = lazy(() => import('@sm/pages/customer-portal/CustomerPortalRegister'));
const CustomerPortalDashboard = lazy(() => import('@sm/pages/customer-portal/CustomerPortalDashboard'));
const CustomerPortalLanding = lazy(() => import('@sm/pages/customer-portal/CustomerPortalLanding'));
const BusinessLanding = lazy(() => import('@sm/pages/customer-portal/BusinessLanding'));
const CustomerServiceHistory = lazy(() => import('@sm/pages/CustomerServiceHistory'));
const EmailCampaignAnalytics = lazy(() => import('@sm/pages/EmailCampaignAnalytics'));
const EmailSequenceDetails = lazy(() => import('@sm/pages/EmailSequenceDetails'));
const Enterprise = lazy(() => import('@sm/pages/Enterprise'));
const EnterpriseAdmin = lazy(() => import('@sm/pages/EnterpriseAdmin'));
const InventoryAutomation = lazy(() => import('@sm/pages/InventoryAutomation'));
const InventoryCategories = lazy(() => import('@sm/pages/InventoryCategories'));
const InventoryLocations = lazy(() => import('@sm/pages/InventoryLocations'));
const InventoryOrders = lazy(() => import('@sm/pages/InventoryOrders'));
const InventorySuppliers = lazy(() => import('@sm/pages/InventorySuppliers'));
const InvoiceCreate = lazy(() => import('@sm/pages/InvoiceCreate'));
const InvoiceScan = lazy(() => import('@sm/pages/InvoiceScan'));
const MaintenanceDashboard = lazy(() => import('@sm/pages/MaintenanceDashboard'));
const NotFound = lazy(() => import('@sm/pages/NotFound'));
const OrderConfirmation = lazy(() => import('@sm/pages/OrderConfirmation'));
const PartsTracking = lazy(() => import('@sm/pages/PartsTracking'));
const PurchaseOrders = lazy(() => import('@sm/pages/PurchaseOrders'));
const StockControl = lazy(() => import('@sm/pages/StockControl'));
const TeamMemberProfile = lazy(() => import('@sm/pages/TeamMemberProfile'));
const TeamRoles = lazy(() => import('@sm/pages/TeamRoles'));
const Unauthorized = lazy(() => import('@sm/pages/Unauthorized'));
const VehicleDetails = lazy(() => import('@sm/pages/VehicleDetails'));
const VehicleInspectionForm = lazy(() => import('@sm/pages/VehicleInspectionForm'));
const TermsOfService = lazy(() => import('@sm/pages/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@sm/pages/legal/PrivacyPolicy'));

// Gunsmith

// Automotive
const AutomotiveDashboard = lazy(() => import('@sm/pages/automotive/AutomotiveDashboard'));
const AutomotiveVehicleHistory = lazy(() => import('@sm/pages/automotive/AutomotiveVehicleHistory'));
const AutomotiveDiagnostics = lazy(() => import('@sm/pages/automotive/AutomotiveDiagnostics'));
const AutomotiveLaborRates = lazy(() => import('@sm/pages/automotive/AutomotiveLaborRates'));
const AutomotiveRecalls = lazy(() => import('@sm/pages/automotive/AutomotiveRecalls'));
const AutomotiveStore = lazy(() => import('@sm/pages/automotive/AutomotiveStore'));

// Marine
const MarineDashboard = lazy(() => import('@sm/pages/marine/MarineDashboard'));
const MarineStore = lazy(() => import('@sm/pages/marine/MarineStore'));

// Fuel Delivery
const FuelDeliveryDashboard = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryDashboard'));
const FuelDeliveryOrders = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryOrders'));
const FuelDeliveryOrderForm = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryOrderForm'));
const FuelDeliveryCustomers = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryCustomers'));
const FuelDeliveryLocations = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryLocations'));
const FuelDeliveryProducts = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryProducts'));
const FuelDeliveryTrucks = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryTrucks'));
const FuelDeliveryDrivers = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryDrivers'));
const FuelDeliveryRoutes = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryRoutes'));
const FuelDeliveryCompletions = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryCompletions'));
const FuelDeliveryInventory = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryInventory'));
const FuelDeliveryInvoices = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryInvoices'));
const FuelDeliveryDriverApp = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryDriverApp'));
const FuelDeliveryPricing = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryPricing'));
const FuelDeliveryTanks = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryTanks'));
const FuelDeliveryTidyTanks = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryTidyTanks'));
const FuelDeliveryTankFills = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryTankFills'));
const FuelDeliveryEquipment = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryEquipment'));
const FuelDeliveryEquipmentFilters = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryEquipmentFilters'));
const FuelDeliveryQuotes = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryQuotes'));
const FuelDeliveryProfile = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryProfile'));
const FuelDeliverySettings = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliverySettings'));
const FuelDeliveryPurchases = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryPurchases'));
const FuelDeliveryStore = lazy(() => import('@sm/pages/fuel-delivery/FuelDeliveryStore'));
const FuelDeliveryLayout = lazy(() => import('@sm/components/fuel-delivery').then(m => ({ default: m.FuelDeliveryLayout })));

// Fuel Delivery Portal
const FuelDeliveryPortalLanding = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalLanding'));
const FuelDeliveryPortalRegister = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalRegister'));
const FuelDeliveryPortalLogin = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalLogin'));
const FuelDeliveryPortalDashboard = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalDashboard'));
const FuelDeliveryPortalRequest = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalRequest'));
const FuelDeliveryPortalOrders = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalOrders'));
const FuelDeliveryPortalLocations = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalLocations'));
const FuelDeliveryPortalAccount = lazy(() => import('@sm/pages/fuel-delivery-portal/FuelDeliveryPortalAccount'));

// Septic Portal

// Automotive Portal
const AutomotivePortalLanding = lazy(() => import('@sm/pages/automotive-portal/AutomotivePortalLanding'));
const AutomotivePortalLogin = lazy(() => import('@sm/pages/automotive-portal/AutomotivePortalLogin'));
const AutomotivePortalRegister = lazy(() => import('@sm/pages/automotive-portal/AutomotivePortalRegister'));
const AutomotivePortalDashboard = lazy(() => import('@sm/pages/automotive-portal/AutomotivePortalDashboard'));

// Water Delivery Portal

// Marine Portal
const MarinePortalLanding = lazy(() => import('@sm/pages/marine-portal/MarinePortalLanding'));
const MarinePortalLogin = lazy(() => import('@sm/pages/marine-portal/MarinePortalLogin'));
const MarinePortalRegister = lazy(() => import('@sm/pages/marine-portal/MarinePortalRegister'));
const MarinePortalDashboard = lazy(() => import('@sm/pages/marine-portal/MarinePortalDashboard'));

// Water Delivery

// Personal Trainer

// Game Development Module

// Welding Module
const WeldingAdminOverview = lazy(() => import('@sm/pages/welding/WeldingAdminOverview'));
const WeldingAdminQuotes = lazy(() => import('@sm/pages/welding/WeldingAdminQuotes'));
const WeldingAdminInvoices = lazy(() => import('@sm/pages/welding/WeldingAdminInvoices'));
const WeldingAdminInventory = lazy(() => import('@sm/pages/welding/WeldingAdminInventory'));
const WeldingAdminCustomers = lazy(() => import('@sm/pages/welding/WeldingAdminCustomers'));
const WeldingAdminPaymentsDue = lazy(() => import('@sm/pages/welding/WeldingAdminPaymentsDue'));
const WeldingAdminAccountsPayable = lazy(() => import('@sm/pages/welding/WeldingAdminAccountsPayable'));
const WeldingAdminPurchaseOrders = lazy(() => import('@sm/pages/welding/WeldingAdminPurchaseOrders'));
const WeldingAdminMessages = lazy(() => import('@sm/pages/welding/WeldingAdminMessages'));
const WeldingAdminCalendar = lazy(() => import('@sm/pages/welding/WeldingAdminCalendar'));
const WeldingAdminSales = lazy(() => import('@sm/pages/welding/WeldingAdminSales'));
const WeldingAdminLinks = lazy(() => import('@sm/pages/welding/WeldingAdminLinks'));
const WeldingAdminGallery = lazy(() => import('@sm/pages/welding/WeldingAdminGallery'));
const WeldingAdminSettings = lazy(() => import('@sm/pages/welding/WeldingAdminSettings'));
const WeldingSettingsProvider = lazy(() => import('@sm/contexts/WeldingSettingsContext').then(m => ({ default: m.WeldingSettingsProvider })));

// Personal Trainer Portal

// Septic Services

// Export Company

function App() {
  const { pathname } = useLocation();
  const removedModulePrefixes = [
    '/power-washing',
    '/gunsmith',
    '/water-delivery',
    '/water-delivery-portal',
    '/septic',
    '/septic-portal',
    '/export',
    '/personal-trainer',
    '/pt-portal',
    '/game-development',
  ];

  if (removedModulePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return <Navigate to="/module-hub" replace />;
  }

  return (
    <>
      <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes - no auth required */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/index" element={<Navigate to="/login" replace />} />
        <Route path="/index.html" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/setup-brian" element={<SetupBrianAuth />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/shop-setup" element={<ShopSetup />} />
        <Route path="/affiliate-verify" element={<AffiliateVerification />} />
        <Route path="/customer-portal-login" element={<CustomerPortalLoginOld />} />
        <Route path="/customer-portal" element={<CustomerPortalLanding />} />
        <Route path="/customer-portal/login" element={<CustomerPortalAuthLogin />} />
        <Route path="/customer-portal/register" element={<CustomerPortalRegister />} />
        
        {/* Fuel Delivery Customer Portal - Public routes */}
        <Route path="/fuel-delivery-portal" element={<FuelDeliveryPortalLanding />} />
        <Route path="/fuel-delivery-portal/register" element={<FuelDeliveryPortalRegister />} />
        <Route path="/fuel-delivery-portal/login" element={<FuelDeliveryPortalLogin />} />
        <Route path="/fuel-delivery-portal/dashboard" element={<FuelDeliveryPortalDashboard />} />
        <Route path="/fuel-delivery-portal/request" element={<FuelDeliveryPortalRequest />} />
        <Route path="/fuel-delivery-portal/orders" element={<FuelDeliveryPortalOrders />} />
        <Route path="/fuel-delivery-portal/locations" element={<FuelDeliveryPortalLocations />} />
        <Route path="/fuel-delivery-portal/account" element={<FuelDeliveryPortalAccount />} />
        
        
        {/* Automotive Customer Portal - Public routes */}
        <Route path="/automotive-portal" element={<AutomotivePortalLanding />} />
        <Route path="/automotive-portal/login" element={<AutomotivePortalLogin />} />
        <Route path="/automotive-portal/register" element={<AutomotivePortalRegister />} />
        <Route path="/automotive-portal/dashboard" element={<AutomotivePortalDashboard />} />
        
        
        {/* Marine Customer Portal - Public routes */}
        <Route path="/marine-portal" element={<MarinePortalLanding />} />
        <Route path="/marine-portal/login" element={<MarinePortalLogin />} />
        <Route path="/marine-portal/register" element={<MarinePortalRegister />} />
        <Route path="/marine-portal/dashboard" element={<MarinePortalDashboard />} />
        
        <Route path="/customer-portal/dashboard" element={<CustomerPortalDashboard />} />
        <Route path="/b/:slug" element={<BusinessLanding />} />
        <Route path="/staff-login" element={<StaffLogin />} />
        
        {/* Protected routes */}
        <Route
          path="/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <Layout>
                <Routes>
                  <Route path="/module-hub" element={<ModuleHub />} />
                  <Route path="/dashboard" element={<Navigate to="/module-hub" replace />} />
                  <Route path="/repair-shop-dashboard" element={<Dashboard />} />
                  {/* Automotive Module */}
                  <Route path="/automotive" element={<AutomotiveDashboard />} />
                  <Route path="/automotive/vehicle-history" element={<AutomotiveVehicleHistory />} />
                  <Route path="/automotive/diagnostics" element={<AutomotiveDiagnostics />} />
                  <Route path="/automotive/labor-rates" element={<AutomotiveLaborRates />} />
                  <Route path="/automotive/recalls" element={<AutomotiveRecalls />} />
                  <Route path="/automotive/store" element={<AutomotiveStore />} />
                  
                  {/* Marine Module */}
                  <Route path="/marine-services" element={<MarineDashboard />} />
                  <Route path="/marine-services/store" element={<MarineStore />} />
                  <Route path="/marine-services/developer" element={<MarineDeveloper />} />
                  
                  {/* Store */}
                  <Route path="/store" element={<Store />} />
                  <Route path="/shopping" element={<Shopping />} />
                  <Route path="/shopping/:id" element={<ProductDetail />} />
                  {/* CustomerPortal is accessible via /customer-portal public route */}
                  
                  {/* Work Management */}
                  <Route path="/work-orders" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <WorkOrders />
                    </ProtectedRoute>
                  } />
                  <Route path="/work-orders/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <WorkOrderDetails />
                    </ProtectedRoute>
                  } />
                  
                  {/* Customer Management */}
                  <Route path="/customers/*" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Customers />
                    </ProtectedRoute>
                  } />
                  
                   {/* Inventory */}
                   <Route path="/inventory/*" element={
                     <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'inventory_manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                       <Inventory />
                     </ProtectedRoute>
                   } />
                   
                   {/* Inventory Analytics */}
                   <Route path="/inventory-analytics" element={
                     <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                       <InventoryAnalytics />
                     </ProtectedRoute>
                   } />
                   
                   {/* Inventory Manager */}
                   <Route path="/inventory-manager" element={
                     <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                       <InventoryManager />
                     </ProtectedRoute>
                   } />
                   
                    {/* Service Packages */}
                    <Route path="/service-packages" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                        <ServicePackages />
                      </ProtectedRoute>
                    } />
                    
                    {/* Asset Usage Tracking */}
                    <Route path="/asset-usage" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                        <AssetUsageTracking />
                      </ProtectedRoute>
                    } />
                    
                    {/* Consumption Tracking */}
                    <Route path="/consumption-tracking" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                        <ConsumptionTracking />
                      </ProtectedRoute>
                    } />

                    {/* Mobile Inventory Scanner */}
                    <Route path="/mobile-inventory" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                        <MobileInventory />
                      </ProtectedRoute>
                    } />

                    {/* Maintenance Planning */}
                    <Route path="/maintenance-planning" element={
                      <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                        <MaintenancePlanning />
                      </ProtectedRoute>
                    } />
                  
                  {/* Analytics */}
                  <Route path="/analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Analytics />
                    </ProtectedRoute>
                  } />
                  
                  {/* Settings */}
                  <Route path="/settings/*" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  
                  {/* Security Audit - Admin Only */}
                  <Route path="/security-audit" element={
                    <ProtectedRoute allowedRoles={['admin', 'owner']}>
                      <SecurityAudit />
                    </ProtectedRoute>
                  } />
                  
                  {/* Calendar */}
                  <Route path="/calendar" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Calendar />
                    </ProtectedRoute>
                  } />
                  
                  {/* Booking Management */}
                  <Route path="/booking-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'owner']}>
                      <BookingManagement />
                    </ProtectedRoute>
                  } />
                  
                  {/* Planner */}
                  <Route path="/planner" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Planner />
                    </ProtectedRoute>
                  } />
                  
                  {/* Service Reminders */}
                  <Route path="/service-reminders" element={<ServiceReminders />} />
                  
                  {/* Customer Communications */}
                  <Route path="/customer-comms" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'owner']}>
                      <CustomerComms />
                    </ProtectedRoute>
                  } />
                  
                  {/* Call Logger */}
                  <Route path="/call-logger" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'owner']}>
                      <CallLogger />
                    </ProtectedRoute>
                  } />
                  
                  {/* Team Chat */}
                  <Route path="/chat" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Chat />
                    </ProtectedRoute>
                  } />
                  
                  {/* Email Marketing */}
                  <Route path="/email-campaigns" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <EmailCampaigns />
                    </ProtectedRoute>
                  } />
                  <Route path="/email-sequences" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <EmailSequences />
                    </ProtectedRoute>
                  } />
                  <Route path="/email-templates" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <EmailTemplates />
                    </ProtectedRoute>
                  } />
                  
                  {/* SMS Communications */}
                  <Route path="/sms-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <SmsManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/sms-templates" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <SmsTemplates />
                    </ProtectedRoute>
                  } />
                  
                  {/* Operations */}
                  <Route path="/quotes" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Quotes />
                    </ProtectedRoute>
                  } />
                  <Route path="/quotes/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <QuoteDetails />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/invoices" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Invoices />
                    </ProtectedRoute>
                  } />
                  <Route path="/invoices/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <InvoiceDetails />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/service-board" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <ServiceBoard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/payments" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Payments />
                    </ProtectedRoute>
                  } />
                  
                  {/* Project Budgets */}
                  <Route path="/projects" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Projects />
                    </ProtectedRoute>
                  } />
                  <Route path="/projects/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <ProjectDetails />
                    </ProtectedRoute>
                  } />
                  
                  {/* Company */}
                  <Route path="/company-profile" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <CompanyProfile />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/vehicles" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Equipment />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/documents" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Documents />
                    </ProtectedRoute>
                  } />
                  
                  {/* Contacts & Resources */}
                  <Route path="/contacts" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'reception', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Contacts />
                    </ProtectedRoute>
                  } />
                  
                  {/* Team Management */}
                  <Route path="/team/*" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Team />
                    </ProtectedRoute>
                  } />
                  
                  {/* Training Overview */}
                  <Route path="/training-overview" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <TrainingOverview />
                    </ProtectedRoute>
                  } />
                  
                  {/* Timesheet */}
                  <Route path="/timesheet" element={
                    <ProtectedRoute>
                      <Timesheet />
                    </ProtectedRoute>
                  } />
                  
                  {/* Payroll & Time Tracking */}
                  <Route path="/payroll" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <Payroll />
                    </ProtectedRoute>
                  } />
                  
                  {/* Technician Portal */}
                  <Route path="/technician-portal" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <TechnicianPortal />
                    </ProtectedRoute>
                  } />
                  
                  {/* Services */}
                  <Route path="/services" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <ServiceCatalog />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/service-editor/*" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <ServiceManagementPage />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/repair-plans" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <RepairPlans />
                    </ProtectedRoute>
                  } />
                  <Route path="/repair-plans/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <RepairPlanDetails />
                    </ProtectedRoute>
                  } />
                  
                  {/* Help & Support */}
                  <Route path="/help" element={<Help />} />
                  <Route path="/help/article/:articleId" element={<ArticleViewer />} />
                  <Route path="/help/path/:pathId" element={<LearningPathDetail />} />
                  
                  {/* Signature Demo */}
                  <Route path="/signature-demo" element={<SignatureDemo />} />
                  
                  {/* Equipment & Tools */}
                  <Route path="/equipment-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <EquipmentManagement />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/equipment" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Equipment />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/equipment/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <EquipmentDetails />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/fleet-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <FleetManagement />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/equipment/dashboard" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <EquipmentDashboard />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/maintenance-requests" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <MaintenanceRequests />
                    </ProtectedRoute>
                  } />
                  
                  <Route path="/safety-equipment" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyEquipment />
                    </ProtectedRoute>
                  } />
                  
                  {/* Daily Logs */}
                  <Route path="/daily-logs" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <DailyLogs />
                    </ProtectedRoute>
                  } />
                  
                  {/* Shopping Cart & Orders */}
                  <Route path="/shopping/cart" element={<ShoppingCartPage />} />
                  <Route path="/wishlist" element={<WishlistPage />} />
                  <Route path="/orders" element={<Orders />} />
                  
                  {/* Security */}
                  <Route path="/security" element={<Security />} />
                  
                  {/* User Pages */}
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/notifications" element={<Notifications />} />
                  
                  {/* Reports & Forms */}
                  <Route path="/reports" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Reports />
                    </ProtectedRoute>
                  } />
                  <Route path="/forms" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Forms />
                    </ProtectedRoute>
                  } />
                  <Route path="/form-submissions" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <FormSubmissions />
                    </ProtectedRoute>
                  } />
                  
                  {/* AI & Automation */}
                  <Route path="/ai-hub" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <AIHub />
                    </ProtectedRoute>
                  } />
                  
                  {/* Customer Feedback */}
                  <Route path="/feedback" element={<Feedback />} />
                  <Route path="/feedback/forms" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <FeedbackFormsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/feedback/forms/new" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <FeedbackFormEditorPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/feedback/forms/:formId/edit" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <FeedbackFormEditorPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/feedback/forms/:formId/analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <FeedbackAnalyticsPage />
                    </ProtectedRoute>
                  } />
                  
                  {/* Feature Requests */}
                  <Route path="/feature-requests" element={<FeatureRequests />} />
                  
                  {/* Equipment Tracking */}
                  <Route path="/equipment-tracking" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'deckhand', 'captain', 'mate', 'chief_engineer', 'marine_engineer', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <EquipmentTracking />
                    </ProtectedRoute>
                  } />
                  
                  {/* Insurance Management */}
                  <Route path="/insurance" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Insurance />
                    </ProtectedRoute>
                  } />
                  
                  {/* Fleet Operations */}
                  <Route path="/fuel-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <FuelManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/warranties" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Warranties />
                    </ProtectedRoute>
                  } />
                  <Route path="/driver-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <DriverManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/tire-management" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <TireManagement />
                    </ProtectedRoute>
                  } />
                  <Route path="/accounting-integration" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <AccountingIntegration />
                    </ProtectedRoute>
                  } />
                  
                  {/* Safety & Compliance */}
                  <Route path="/safety" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <Safety />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/incidents" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyIncidents />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/incidents/new" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyIncidentNew />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/incidents/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyIncidentDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/inspections" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyInspections />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/inspections/new" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyInspectionNew />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/dvir" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyDVIR />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/dvir/new" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyDVIRNew />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/dvir/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyDVIRDetails />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/equipment" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyLiftInspections />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/equipment/inspect" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyLiftInspectionNew />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/equipment/forklift" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <ForkliftInspection />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/vessels" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'boat_manager', 'mechanic_manager', 'owner']}>
                      <VesselInspection />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/vessels/:vesselId/history" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'boat_manager', 'mechanic_manager', 'owner']}>
                      <VesselInspectionHistoryPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'boat_manager', 'mechanic_manager', 'owner']}>
                      <InspectionAnalytics />
                    </ProtectedRoute>
                  } />
                  {/* Redirect old scheduling route to consolidated schedules page */}
                  <Route path="/safety/scheduling" element={<Navigate to="/safety/schedules" replace />} />
                  <Route path="/safety/documents" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyDocuments />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/certifications" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyCertifications />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/schedules" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetySchedules />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/reports" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyReports />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/corrective-actions" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyCorrectiveActions />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/near-miss" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyNearMiss />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/training" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyTraining />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/meetings" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyMeetings />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/jsa" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyJSA />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/ppe" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyPPE />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/contractors" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyContractors />
                    </ProtectedRoute>
                  } />
                  <Route path="/safety/rewards" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <SafetyGamification />
                    </ProtectedRoute>
                  } />
                  
                  {/* Employee Scheduling */}
                  <Route path="/scheduling" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <EmployeeScheduling />
                    </ProtectedRoute>
                  } />
                  
                  {/* System Admin (formerly Developer Portal) */}
                  <Route path="/system-admin/*" element={
                    <ProtectedRoute requireAdmin={true}>
                      <SystemAdmin />
                    </ProtectedRoute>
                  } />
                  
                  {/* Module Developer Pages */}
                  <Route path="/automotive/developer" element={<AutomotiveDeveloper />} />
                  <Route path="/marine-services/developer" element={<MarineDeveloper />} />
                  <Route path="/fuel-delivery/developer" element={<FuelDeliveryDeveloper />} />
                  
                  {/* Advanced Analytics */}
                  <Route path="/advanced-analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <AdvancedAnalytics />
                    </ProtectedRoute>
                  } />
                  
                  {/* Affiliate Tool */}
                  <Route path="/affiliate-tool" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <AffiliateTool />
                    </ProtectedRoute>
                  } />
                  
                  {/* Boat Inspection */}
                  <Route path="/boat-inspection" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'boat_manager', 'mechanic_manager', 'owner']}>
                      <BoatInspection />
                    </ProtectedRoute>
                  } />
                  
                  {/* Checkout */}
                  <Route path="/checkout" element={<Checkout />} />
                  
                  {/* Client Booking */}
                  <Route path="/booking" element={<ClientBooking />} />
                  
                  {/* Customer Analytics */}
                  <Route path="/customer-analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <CustomerAnalytics />
                    </ProtectedRoute>
                  } />
                  
                  {/* Customer Experience */}
                  <Route path="/customer-experience" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <CustomerExperience />
                    </ProtectedRoute>
                  } />
                  
                  {/* Customer Follow-ups */}
                  <Route path="/customer-followups" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <CustomerFollowUps />
                    </ProtectedRoute>
                  } />
                  
                  {/* Customer Portal Login - redirects to new portal */}
                  <Route path="/customer-portal-login" element={<Navigate to="/customer-portal/login" replace />} />
                  
                  {/* Customer Service History */}
                  <Route path="/customer-service-history/:customerId" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'technician', 'owner']}>
                      <CustomerServiceHistory />
                    </ProtectedRoute>
                  } />
                  
                  {/* Email Campaign Analytics */}
                  <Route path="/email-campaigns/:id/analytics" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <EmailCampaignAnalytics />
                    </ProtectedRoute>
                  } />
                  
                  {/* Email Sequence Details */}
                  <Route path="/email-sequences/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <EmailSequenceDetails />
                    </ProtectedRoute>
                  } />
                  
                  {/* Enterprise */}
                  <Route path="/enterprise" element={
                    <ProtectedRoute allowedRoles={['admin', 'owner']}>
                      <Enterprise />
                    </ProtectedRoute>
                  } />
                  
                  {/* Enterprise Admin */}
                  <Route path="/enterprise-admin" element={
                    <ProtectedRoute allowedRoles={['admin', 'owner']}>
                      <EnterpriseAdmin />
                    </ProtectedRoute>
                  } />
                  
                  {/* Inventory Automation */}
                  <Route path="/inventory-automation" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <InventoryAutomation />
                    </ProtectedRoute>
                  } />
                  
                  {/* Inventory Categories */}
                  <Route path="/inventory-categories" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <InventoryCategories />
                    </ProtectedRoute>
                  } />
                  
                  {/* Inventory Locations */}
                  <Route path="/inventory-locations" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <InventoryLocations />
                    </ProtectedRoute>
                  } />
                  
                  {/* Inventory Orders */}
                  <Route path="/inventory-orders" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <InventoryOrders />
                    </ProtectedRoute>
                  } />
                  
                  {/* Inventory Suppliers */}
                  <Route path="/inventory-suppliers" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <InventorySuppliers />
                    </ProtectedRoute>
                  } />
                  
                  {/* Invoice Create */}
                  <Route path="/invoices/create" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <InvoiceCreate />
                    </ProtectedRoute>
                  } />
                  
                  {/* Invoice Scan */}
                  <Route path="/invoice-scan" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'service_advisor', 'owner']}>
                      <InvoiceScan />
                    </ProtectedRoute>
                  } />
                  
                  {/* Maintenance Dashboard */}
                  <Route path="/maintenance-dashboard" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <MaintenanceDashboard />
                    </ProtectedRoute>
                  } />
                  
                  {/* Order Confirmation */}
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />
                  
                  {/* Parts Tracking */}
                  <Route path="/parts-tracking" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'inventory_manager', 'owner']}>
                      <PartsTracking />
                    </ProtectedRoute>
                  } />
                  
                  {/* Purchase Orders */}
                  <Route path="/purchase-orders" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <PurchaseOrders />
                    </ProtectedRoute>
                  } />
                  
                  {/* Stock Control */}
                  <Route path="/stock-control" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'inventory_manager', 'owner']}>
                      <StockControl />
                    </ProtectedRoute>
                  } />
                  
                  {/* Team Member Profile */}
                  <Route path="/team/member/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <TeamMemberProfile />
                    </ProtectedRoute>
                  } />
                  
                  {/* Team Roles */}
                  <Route path="/team/roles" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'owner']}>
                      <TeamRoles />
                    </ProtectedRoute>
                  } />
                  
                  {/* Vehicle Details */}
                  <Route path="/vehicles/:id" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'service_advisor', 'owner']}>
                      <VehicleDetails />
                    </ProtectedRoute>
                  } />
                  
                  {/* Vehicle Inspection Form */}
                  <Route path="/vehicle-inspection/:vehicleId" element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'yard_manager', 'mechanic_manager', 'owner']}>
                      <VehicleInspectionForm />
                    </ProtectedRoute>
                  } />
                  
                  {/* Unauthorized */}
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  
                  {/* Not Found - Catch all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />
        
        {/* Fuel Delivery Module - Separate Layout */}
        <Route
          path="/fuel-delivery/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <FuelDeliveryLayout>
                <Routes>
                  <Route path="/" element={<FuelDeliveryDashboard />} />
                  <Route path="/orders" element={<FuelDeliveryOrders />} />
                  <Route path="/orders/new" element={<FuelDeliveryOrderForm />} />
                  <Route path="/orders/:id" element={<FuelDeliveryOrders />} />
                  <Route path="/customers" element={<FuelDeliveryCustomers />} />
                  <Route path="/locations" element={<FuelDeliveryLocations />} />
                  <Route path="/products" element={<FuelDeliveryProducts />} />
                  <Route path="/trucks" element={<FuelDeliveryTrucks />} />
                  <Route path="/drivers" element={<FuelDeliveryDrivers />} />
                  <Route path="/routes" element={<FuelDeliveryRoutes />} />
                  <Route path="/routes/new" element={<FuelDeliveryRoutes />} />
                  <Route path="/deliveries" element={<FuelDeliveryCompletions />} />
                  <Route path="/inventory" element={<FuelDeliveryInventory />} />
                  <Route path="/purchases" element={<FuelDeliveryPurchases />} />
                  <Route path="/invoices" element={<FuelDeliveryInvoices />} />
                  <Route path="/invoices/new" element={<FuelDeliveryInvoices />} />
                  <Route path="/driver-app" element={<FuelDeliveryDriverApp />} />
                  <Route path="/pricing" element={<FuelDeliveryPricing />} />
                  <Route path="/tanks" element={<FuelDeliveryTanks />} />
                  <Route path="/tidy-tanks" element={<FuelDeliveryTidyTanks />} />
                  <Route path="/tank-fills" element={<FuelDeliveryTankFills />} />
                  <Route path="/equipment" element={<FuelDeliveryEquipment />} />
                  <Route path="/equipment-filters" element={<FuelDeliveryEquipmentFilters />} />
                  <Route path="/quotes" element={<FuelDeliveryQuotes />} />
                  <Route path="/profile" element={<FuelDeliveryProfile />} />
                  <Route path="/settings" element={<FuelDeliverySettings />} />
                  <Route path="/store" element={<FuelDeliveryStore />} />
                </Routes>
              </FuelDeliveryLayout>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />
        
        {/* Welding Module */}
        <Route
          path="/welding/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <WeldingSettingsProvider>
                <Routes>
                  <Route path="/" element={<WeldingAdminOverview />} />
                  <Route path="/quotes" element={<WeldingAdminQuotes />} />
                  <Route path="/invoices" element={<WeldingAdminInvoices />} />
                  <Route path="/inventory" element={<WeldingAdminInventory />} />
                  <Route path="/customers" element={<WeldingAdminCustomers />} />
                  <Route path="/payments-due" element={<WeldingAdminPaymentsDue />} />
                  <Route path="/accounts-payable" element={<WeldingAdminAccountsPayable />} />
                  <Route path="/purchase-orders" element={<WeldingAdminPurchaseOrders />} />
                  <Route path="/messages" element={<WeldingAdminMessages />} />
                  <Route path="/calendar" element={<WeldingAdminCalendar />} />
                  <Route path="/sales" element={<WeldingAdminSales />} />
                  <Route path="/links" element={<WeldingAdminLinks />} />
                  <Route path="/gallery" element={<WeldingAdminGallery />} />
                  <Route path="/settings" element={<WeldingAdminSettings />} />
                </Routes>
              </WeldingSettingsProvider>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />
      </Routes>
      </Suspense>
      </ChunkErrorBoundary>
      <Toaster />
      <SonnerToaster />
      {/* Global UX enhancements */}
      <GlobalUX />
    </>
  );
}

export default App;
