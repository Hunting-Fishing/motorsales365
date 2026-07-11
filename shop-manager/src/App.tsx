import React, { lazy, Suspense, useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthGate } from '@/components/AuthGate';
import { authMonitor } from '@/utils/authMonitoring';
import { GlobalUX } from '@/components/ux/GlobalUX';
import { AuthenticatedProviders } from '@/components/auth/AuthenticatedProviders';
import ab365Logo from '@/assets/ab365-logo.png';

const Index = lazy(() => import('@/pages/Index'));

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
            <img src={ab365Logo} alt="All Business 365" className="h-12 mx-auto" />
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
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const ModuleHub = lazy(() => import('@/pages/ModuleHub'));
const UpcomingModules = lazy(() => import('@/pages/UpcomingModules'));
const Shopping = lazy(() => import('@/pages/Shopping'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const CustomerPortal = lazy(() => import('@/pages/CustomerPortal'));
const WorkOrders = lazy(() => import('@/pages/WorkOrders'));
const Customers = lazy(() => import('@/pages/Customers'));
const Inventory = lazy(() => import('@/pages/Inventory'));
const InventoryAnalytics = lazy(() => import('@/pages/InventoryAnalytics'));
const InventoryManager = lazy(() => import('@/pages/InventoryManager'));
const InventoryAdd = lazy(() => import('@/pages/InventoryAdd'));
const ServicePackages = lazy(() => import('@/pages/ServicePackages'));
const AssetUsageTracking = lazy(() => import('@/pages/AssetUsageTracking'));
const ConsumptionTracking = lazy(() => import('@/pages/ConsumptionTracking'));
const MobileInventory = lazy(() => import('@/pages/MobileInventory'));
const MaintenancePlanning = lazy(() => import('@/pages/MaintenancePlanning'));
const Analytics = lazy(() => import('@/pages/Analytics'));
const Settings = lazy(() => import('@/pages/Settings'));
const Calendar = lazy(() => import('@/pages/Calendar'));
const Team = lazy(() => import('@/pages/Team'));
const CustomerComms = lazy(() => import('@/pages/CustomerComms'));
const CallLogger = lazy(() => import('@/pages/CallLogger'));
const Help = lazy(() => import('@/pages/Help'));
const ServiceReminders = lazy(() => import('@/pages/ServiceReminders'));
const Quotes = lazy(() => import('@/pages/Quotes'));
const Invoices = lazy(() => import('@/pages/Invoices'));
const ServiceBoard = lazy(() => import('@/pages/ServiceBoard'));
const Payments = lazy(() => import('@/pages/Payments'));
const CompanyProfile = lazy(() => import('@/pages/CompanyProfile'));
const Documents = lazy(() => import('@/pages/Documents'));
const Contacts = lazy(() => import('@/pages/Contacts'));
const ServiceCatalog = lazy(() => import('@/pages/ServiceCatalog'));
const RepairPlans = lazy(() => import('@/pages/RepairPlans'));
const Login = lazy(() => import('@/pages/Login'));
const StaffLogin = lazy(() => import('@/pages/StaffLogin'));
const Signup = lazy(() => import('@/pages/Signup'));
const About = lazy(() => import('@/pages/About'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const ArticleViewer = lazy(() => import('@/components/help/ArticleViewer').then(m => ({ default: m.ArticleViewer })));
const LearningPathDetail = lazy(() => import('@/components/help/LearningPathDetail').then(m => ({ default: m.LearningPathDetail })));
const ServiceManagementPage = lazy(() => import('@/pages/developer/ServiceManagementPage').then(m => ({ default: m.ServiceManagementPage })));
const InvoiceDetails = lazy(() => import('@/pages/InvoiceDetails'));
const SignatureDemo = lazy(() => import('@/pages/SignatureDemo'));
const EquipmentManagement = lazy(() => import('@/pages/EquipmentManagement'));
const Equipment = lazy(() => import('@/pages/Equipment'));
const EquipmentDetails = lazy(() => import('@/pages/EquipmentDetails'));
const EquipmentDashboard = lazy(() => import('@/pages/EquipmentDashboard'));
const FleetManagement = lazy(() => import('@/pages/FleetManagement'));
const SafetyEquipment = lazy(() => import('@/pages/SafetyEquipment'));
const MaintenanceRequests = lazy(() => import('@/pages/MaintenanceRequests'));
const ShoppingCartPage = lazy(() => import('@/pages/ShoppingCart'));
const WishlistPage = lazy(() => import('@/pages/WishlistPage'));
const Orders = lazy(() => import('@/pages/Orders'));
const Security = lazy(() => import('@/pages/Security'));
const Profile = lazy(() => import('@/pages/Profile'));
const Notifications = lazy(() => import('@/pages/Notifications'));
const Reports = lazy(() => import('@/pages/Reports'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectDetails = lazy(() => import('@/pages/ProjectDetails'));
const Forms = lazy(() => import('@/pages/Forms'));
const FormSubmissions = lazy(() => import('@/pages/FormSubmissions'));
const QuoteDetails = lazy(() => import('@/pages/QuoteDetails'));
const WorkOrderDetails = lazy(() => import('@/pages/WorkOrderDetails'));
const RepairPlanDetails = lazy(() => import('@/pages/RepairPlanDetails'));
const AIHub = lazy(() => import('@/pages/AIHub'));
const Chat = lazy(() => import('@/pages/Chat'));
const EmailCampaigns = lazy(() => import('@/pages/EmailCampaigns'));
const EmailSequences = lazy(() => import('@/pages/EmailSequences'));
const EmailTemplates = lazy(() => import('@/pages/EmailTemplates'));
const Feedback = lazy(() => import('@/pages/Feedback'));
const FeedbackFormsPage = lazy(() => import('@/pages/feedback/FeedbackFormsPage'));
const FeedbackFormEditorPage = lazy(() => import('@/pages/feedback/FeedbackFormEditorPage'));
const FeedbackAnalyticsPage = lazy(() => import('@/pages/feedback/FeedbackAnalyticsPage'));
const SystemAdmin = lazy(() => import('@/pages/SystemAdmin'));
const WaterDeliveryDeveloper = lazy(() => import('@/pages/water-delivery/WaterDeliveryDeveloper'));
const AutomotiveDeveloper = lazy(() => import('@/pages/automotive/AutomotiveDeveloper'));
const GunsmithDeveloper = lazy(() => import('@/pages/gunsmith/GunsmithDeveloper'));
const MarineDeveloper = lazy(() => import('@/pages/marine/MarineDeveloper'));
const FuelDeliveryDeveloper = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryDeveloper'));
const PowerWashingDeveloper = lazy(() => import('@/pages/power-washing/PowerWashingDeveloper'));
const SmsManagement = lazy(() => import('@/pages/SmsManagement'));
const SmsTemplates = lazy(() => import('@/pages/SmsTemplates'));
const Timesheet = lazy(() => import('@/pages/Timesheet'));
const FeatureRequests = lazy(() => import('@/pages/FeatureRequests'));
const EquipmentTracking = lazy(() => import('@/pages/EquipmentTracking'));
const EmployeeScheduling = lazy(() => import('@/pages/EmployeeScheduling'));
const TrainingOverview = lazy(() => import('@/pages/TrainingOverview'));
const DailyLogs = lazy(() => import('@/pages/DailyLogs'));
const Insurance = lazy(() => import('@/pages/Insurance'));
const FuelManagement = lazy(() => import('@/pages/FuelManagement'));
const Warranties = lazy(() => import('@/pages/Warranties'));
const DriverManagement = lazy(() => import('@/pages/DriverManagement'));
const TireManagement = lazy(() => import('@/pages/TireManagement'));
const AccountingIntegration = lazy(() => import('@/pages/AccountingIntegration'));
const Safety = lazy(() => import('@/pages/Safety'));
const SafetyIncidents = lazy(() => import('@/pages/SafetyIncidents'));
const SafetyIncidentNew = lazy(() => import('@/pages/SafetyIncidentNew'));
const SafetyIncidentDetails = lazy(() => import('@/pages/SafetyIncidentDetails'));
const SafetyInspections = lazy(() => import('@/pages/SafetyInspections'));
const SafetyInspectionNew = lazy(() => import('@/pages/SafetyInspectionNew'));
const SafetyDVIR = lazy(() => import('@/pages/SafetyDVIR'));
const SafetyDVIRNew = lazy(() => import('@/pages/SafetyDVIRNew'));
const SafetyDVIRDetails = lazy(() => import('@/pages/SafetyDVIRDetails'));
const SafetyLiftInspections = lazy(() => import('@/pages/SafetyLiftInspections'));
const ForkliftInspection = lazy(() => import('@/pages/ForkliftInspection'));
const VesselInspection = lazy(() => import('@/pages/VesselInspection'));
const VesselInspectionHistoryPage = lazy(() => import('@/pages/VesselInspectionHistoryPage'));
const InspectionAnalytics = lazy(() => import('@/pages/InspectionAnalytics'));
const SafetyLiftInspectionNew = lazy(() => import('@/pages/SafetyLiftInspectionNew'));
const SafetyDocuments = lazy(() => import('@/pages/SafetyDocuments'));
const SafetyCertifications = lazy(() => import('@/pages/SafetyCertifications'));
const SafetySchedules = lazy(() => import('@/pages/SafetySchedules'));
const SafetyReports = lazy(() => import('@/pages/SafetyReports'));
const SafetyCorrectiveActions = lazy(() => import('@/pages/SafetyCorrectiveActions'));
const SafetyNearMiss = lazy(() => import('@/pages/SafetyNearMiss'));
const SafetyTraining = lazy(() => import('@/pages/SafetyTraining'));
const SafetyMeetings = lazy(() => import('@/pages/SafetyMeetings'));
const SafetyJSA = lazy(() => import('@/pages/SafetyJSA'));
const SafetyPPE = lazy(() => import('@/pages/SafetyPPE'));
const SafetyContractors = lazy(() => import('@/pages/SafetyContractors'));
const SafetyGamification = lazy(() => import('@/pages/SafetyGamification'));
const TechnicianPortal = lazy(() => import('@/pages/TechnicianPortal'));
const SetupBrianAuth = lazy(() => import('@/pages/SetupBrianAuth'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));
const ShopSetup = lazy(() => import('@/pages/ShopSetup'));
const SecurityAudit = lazy(() => import('@/pages/SecurityAudit'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Planner = lazy(() => import('@/pages/Planner'));
const Payroll = lazy(() => import('@/pages/Payroll'));
const AdvancedAnalytics = lazy(() => import('@/pages/AdvancedAnalytics'));
const AffiliateTool = lazy(() => import('@/pages/AffiliateTool'));
const AffiliateVerification = lazy(() => import('@/pages/AffiliateVerification'));
const Store = lazy(() => import('@/pages/Store'));
const BoatInspection = lazy(() => import('@/pages/BoatInspection'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const ClientBooking = lazy(() => import('@/pages/ClientBooking'));
const BookingManagement = lazy(() => import('@/pages/BookingManagement'));
const CustomerAnalytics = lazy(() => import('@/pages/CustomerAnalytics'));
const CustomerExperience = lazy(() => import('@/pages/CustomerExperience'));
const CustomerFollowUps = lazy(() => import('@/pages/CustomerFollowUps'));
const CustomerPortalLoginOld = lazy(() => import('@/pages/CustomerPortalLogin'));
const CustomerPortalAuthLogin = lazy(() => import('@/pages/customer-portal/CustomerPortalLogin'));
const CustomerPortalRegister = lazy(() => import('@/pages/customer-portal/CustomerPortalRegister'));
const CustomerPortalDashboard = lazy(() => import('@/pages/customer-portal/CustomerPortalDashboard'));
const CustomerPortalLanding = lazy(() => import('@/pages/customer-portal/CustomerPortalLanding'));
const BusinessLanding = lazy(() => import('@/pages/customer-portal/BusinessLanding'));
const CustomerServiceHistory = lazy(() => import('@/pages/CustomerServiceHistory'));
const EmailCampaignAnalytics = lazy(() => import('@/pages/EmailCampaignAnalytics'));
const EmailSequenceDetails = lazy(() => import('@/pages/EmailSequenceDetails'));
const Enterprise = lazy(() => import('@/pages/Enterprise'));
const EnterpriseAdmin = lazy(() => import('@/pages/EnterpriseAdmin'));
const InventoryAutomation = lazy(() => import('@/pages/InventoryAutomation'));
const InventoryCategories = lazy(() => import('@/pages/InventoryCategories'));
const InventoryLocations = lazy(() => import('@/pages/InventoryLocations'));
const InventoryOrders = lazy(() => import('@/pages/InventoryOrders'));
const InventorySuppliers = lazy(() => import('@/pages/InventorySuppliers'));
const InvoiceCreate = lazy(() => import('@/pages/InvoiceCreate'));
const InvoiceScan = lazy(() => import('@/pages/InvoiceScan'));
const MaintenanceDashboard = lazy(() => import('@/pages/MaintenanceDashboard'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const OrderConfirmation = lazy(() => import('@/pages/OrderConfirmation'));
const PartsTracking = lazy(() => import('@/pages/PartsTracking'));
const PurchaseOrders = lazy(() => import('@/pages/PurchaseOrders'));
const StockControl = lazy(() => import('@/pages/StockControl'));
const TeamMemberProfile = lazy(() => import('@/pages/TeamMemberProfile'));
const TeamRoles = lazy(() => import('@/pages/TeamRoles'));
const Unauthorized = lazy(() => import('@/pages/Unauthorized'));
const VehicleDetails = lazy(() => import('@/pages/VehicleDetails'));
const VehicleInspectionForm = lazy(() => import('@/pages/VehicleInspectionForm'));
const TermsOfService = lazy(() => import('@/pages/legal/TermsOfService'));
const PrivacyPolicy = lazy(() => import('@/pages/legal/PrivacyPolicy'));
const ModuleLearnMore = lazy(() => import('@/pages/ModuleLearnMore'));

// Power Washing
const PowerWashingDashboard = lazy(() => import('@/pages/power-washing/PowerWashingDashboard'));
const PowerWashingJobsList = lazy(() => import('@/pages/power-washing/PowerWashingJobsList'));
const PowerWashingJobCreate = lazy(() => import('@/pages/power-washing/PowerWashingJobCreate'));
const PowerWashingJobDetails = lazy(() => import('@/pages/power-washing/PowerWashingJobDetails'));
const PowerWashingJobEdit = lazy(() => import('@/pages/power-washing/PowerWashingJobEdit'));
const PowerWashingEquipment = lazy(() => import('@/pages/power-washing/PowerWashingEquipment'));
const PowerWashingEquipmentCreate = lazy(() => import('@/pages/power-washing/PowerWashingEquipmentCreate'));
const PowerWashingEquipmentDetail = lazy(() => import('@/pages/power-washing/PowerWashingEquipmentDetail'));
const PowerWashingChemicals = lazy(() => import('@/pages/power-washing/PowerWashingChemicals'));
const PowerWashingChemicalCreate = lazy(() => import('@/pages/power-washing/PowerWashingChemicalCreate'));
const PowerWashingInventory = lazy(() => import('@/pages/power-washing/PowerWashingInventory'));
const PowerWashingQuoteForm = lazy(() => import('@/pages/power-washing/PowerWashingQuoteForm'));
const PowerWashingQuotesList = lazy(() => import('@/pages/power-washing/PowerWashingQuotesList'));
const PowerWashingFormulas = lazy(() => import('@/pages/power-washing/PowerWashingFormulas'));
const BleachCalculator = lazy(() => import('@/pages/power-washing/BleachCalculator'));
const SurfaceMixCalculator = lazy(() => import('@/pages/power-washing/SurfaceMixCalculator'));
const PowerWashingRecurringSchedules = lazy(() => import('@/pages/power-washing/PowerWashingRecurringSchedules'));
const PowerWashingInvoices = lazy(() => import('@/pages/power-washing/PowerWashingInvoices'));
const PowerWashingInvoiceDetail = lazy(() => import('@/pages/power-washing/PowerWashingInvoiceDetail'));
const PowerWashingReports = lazy(() => import('@/pages/power-washing/PowerWashingReports'));
const PowerWashingRoutes = lazy(() => import('@/pages/power-washing/PowerWashingRoutes'));
const PowerWashingRouteDetail = lazy(() => import('@/pages/power-washing/PowerWashingRouteDetail'));
const PowerWashingReviews = lazy(() => import('@/pages/power-washing/PowerWashingReviews'));
const PowerWashingNotifications = lazy(() => import('@/pages/power-washing/PowerWashingNotifications'));
const PowerWashingFieldView = lazy(() => import('@/pages/power-washing/PowerWashingFieldView'));
const PowerWashingPriceBook = lazy(() => import('@/pages/power-washing/PowerWashingPriceBook'));
const PowerWashingAnalytics = lazy(() => import('@/pages/power-washing/PowerWashingAnalytics'));
const PowerWashingWeather = lazy(() => import('@/pages/power-washing/PowerWashingWeather'));
const PowerWashingPhotos = lazy(() => import('@/pages/power-washing/PowerWashingPhotos'));
const PowerWashingSubscriptions = lazy(() => import('@/pages/power-washing/PowerWashingSubscriptions'));
const PowerWashingCustomerPortal = lazy(() => import('@/pages/power-washing/PowerWashingCustomerPortal'));
const PowerWashingPayments = lazy(() => import('@/pages/power-washing/PowerWashingPayments'));
const PowerWashingSchedule = lazy(() => import('@/pages/power-washing/PowerWashingSchedule'));
const PowerWashingLeads = lazy(() => import('@/pages/power-washing/PowerWashingLeads'));
const PowerWashingFleet = lazy(() => import('@/pages/power-washing/PowerWashingFleet'));
const PowerWashingStore = lazy(() => import('@/pages/power-washing/PowerWashingStore'));
const PowerWashingCustomers = lazy(() => import('@/pages/power-washing/PowerWashingCustomers'));
const PowerWashingCustomerCreate = lazy(() => import('@/pages/power-washing/PowerWashingCustomerCreate'));
const PowerWashingCustomerDetail = lazy(() => import('@/pages/power-washing/PowerWashingCustomerDetail'));
const PowerWashingTeam = lazy(() => import('@/pages/power-washing/PowerWashingTeam'));
const PowerWashingRoles = lazy(() => import('@/pages/power-washing/PowerWashingRoles'));
const PowerWashingQuoteDetail = lazy(() => import('@/pages/power-washing/PowerWashingQuoteDetail'));
const PowerWashingSettings = lazy(() => import('@/pages/power-washing/PowerWashingSettings'));
const PowerWashingPricingFormulas = lazy(() => import('@/pages/power-washing/PowerWashingPricingFormulas'));

// Gunsmith
const GunsmithDashboard = lazy(() => import('@/pages/gunsmith/GunsmithDashboard'));
const GunsmithJobs = lazy(() => import('@/pages/gunsmith/GunsmithJobs'));
const GunsmithCustomers = lazy(() => import('@/pages/gunsmith/GunsmithCustomers'));
const GunsmithCustomerCreate = lazy(() => import('@/pages/gunsmith/GunsmithCustomerCreate'));
const GunsmithCustomerDetail = lazy(() => import('@/pages/gunsmith/GunsmithCustomerDetail'));
const GunsmithFirearms = lazy(() => import('@/pages/gunsmith/GunsmithFirearms'));
const GunsmithParts = lazy(() => import('@/pages/gunsmith/GunsmithParts'));
const GunsmithPartsOnOrder = lazy(() => import('@/pages/gunsmith/GunsmithPartsOnOrder'));
const GunsmithQuotes = lazy(() => import('@/pages/gunsmith/GunsmithQuotes'));
const GunsmithInvoices = lazy(() => import('@/pages/gunsmith/GunsmithInvoices'));
const GunsmithPayments = lazy(() => import('@/pages/gunsmith/GunsmithPayments'));
const GunsmithAppointments = lazy(() => import('@/pages/gunsmith/GunsmithAppointments'));
const GunsmithCompliance = lazy(() => import('@/pages/gunsmith/GunsmithCompliance'));
const GunsmithTransfers = lazy(() => import('@/pages/gunsmith/GunsmithTransfers'));
const GunsmithConsignments = lazy(() => import('@/pages/gunsmith/GunsmithConsignments'));
const GunsmithJobForm = lazy(() => import('@/pages/gunsmith/GunsmithJobForm'));
const GunsmithQuoteForm = lazy(() => import('@/pages/gunsmith/GunsmithQuoteForm'));
const GunsmithJobDetail = lazy(() => import('@/pages/gunsmith/GunsmithJobDetail'));
const GunsmithQuoteDetail = lazy(() => import('@/pages/gunsmith/GunsmithQuoteDetail'));
const GunsmithFirearmForm = lazy(() => import('@/pages/gunsmith/GunsmithFirearmForm'));
const GunsmithPartForm = lazy(() => import('@/pages/gunsmith/GunsmithPartForm'));
const GunsmithAppointmentForm = lazy(() => import('@/pages/gunsmith/GunsmithAppointmentForm'));
const GunsmithInvoiceForm = lazy(() => import('@/pages/gunsmith/GunsmithInvoiceForm'));
const GunsmithTransferForm = lazy(() => import('@/pages/gunsmith/GunsmithTransferForm'));
const GunsmithConsignmentForm = lazy(() => import('@/pages/gunsmith/GunsmithConsignmentForm'));
const GunsmithFirearmEdit = lazy(() => import('@/pages/gunsmith/GunsmithFirearmEdit'));
const GunsmithPartEdit = lazy(() => import('@/pages/gunsmith/GunsmithPartEdit'));
const GunsmithInventory = lazy(() => import('@/pages/gunsmith/GunsmithInventory'));
const GunsmithStockAdjust = lazy(() => import('@/pages/gunsmith/GunsmithStockAdjust'));
const GunsmithPurchaseOrderForm = lazy(() => import('@/pages/gunsmith/GunsmithPurchaseOrderForm'));
const GunsmithSerializedForm = lazy(() => import('@/pages/gunsmith/GunsmithSerializedForm'));
const GunsmithUsefulLinks = lazy(() => import('@/pages/gunsmith/GunsmithUsefulLinks'));
const GunsmithChangeLog = lazy(() => import('@/pages/gunsmith/GunsmithChangeLog'));
const GunsmithSettings = lazy(() => import('@/pages/gunsmith/GunsmithSettings'));
const GunsmithTeam = lazy(() => import('@/pages/gunsmith/GunsmithTeam'));
const GunsmithRoles = lazy(() => import('@/pages/gunsmith/GunsmithRoles'));
const GunsmithStore = lazy(() => import('@/pages/gunsmith/GunsmithStore'));

// Automotive
const AutomotiveDashboard = lazy(() => import('@/pages/automotive/AutomotiveDashboard'));
const AutomotiveVehicleHistory = lazy(() => import('@/pages/automotive/AutomotiveVehicleHistory'));
const AutomotiveDiagnostics = lazy(() => import('@/pages/automotive/AutomotiveDiagnostics'));
const AutomotiveLaborRates = lazy(() => import('@/pages/automotive/AutomotiveLaborRates'));
const AutomotiveRecalls = lazy(() => import('@/pages/automotive/AutomotiveRecalls'));
const AutomotiveStore = lazy(() => import('@/pages/automotive/AutomotiveStore'));

// Marine
const MarineDashboard = lazy(() => import('@/pages/marine/MarineDashboard'));
const MarineStore = lazy(() => import('@/pages/marine/MarineStore'));

// Fuel Delivery
const FuelDeliveryDashboard = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryDashboard'));
const FuelDeliveryOrders = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryOrders'));
const FuelDeliveryOrderForm = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryOrderForm'));
const FuelDeliveryCustomers = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryCustomers'));
const FuelDeliveryLocations = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryLocations'));
const FuelDeliveryProducts = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryProducts'));
const FuelDeliveryTrucks = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryTrucks'));
const FuelDeliveryDrivers = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryDrivers'));
const FuelDeliveryRoutes = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryRoutes'));
const FuelDeliveryCompletions = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryCompletions'));
const FuelDeliveryInventory = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryInventory'));
const FuelDeliveryInvoices = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryInvoices'));
const FuelDeliveryDriverApp = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryDriverApp'));
const FuelDeliveryPricing = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryPricing'));
const FuelDeliveryTanks = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryTanks'));
const FuelDeliveryTidyTanks = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryTidyTanks'));
const FuelDeliveryTankFills = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryTankFills'));
const FuelDeliveryEquipment = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryEquipment'));
const FuelDeliveryEquipmentFilters = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryEquipmentFilters'));
const FuelDeliveryQuotes = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryQuotes'));
const FuelDeliveryProfile = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryProfile'));
const FuelDeliverySettings = lazy(() => import('@/pages/fuel-delivery/FuelDeliverySettings'));
const FuelDeliveryPurchases = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryPurchases'));
const FuelDeliveryStore = lazy(() => import('@/pages/fuel-delivery/FuelDeliveryStore'));
const FuelDeliveryLayout = lazy(() => import('@/components/fuel-delivery').then(m => ({ default: m.FuelDeliveryLayout })));

// Fuel Delivery Portal
const FuelDeliveryPortalLanding = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalLanding'));
const FuelDeliveryPortalRegister = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalRegister'));
const FuelDeliveryPortalLogin = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalLogin'));
const FuelDeliveryPortalDashboard = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalDashboard'));
const FuelDeliveryPortalRequest = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalRequest'));
const FuelDeliveryPortalOrders = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalOrders'));
const FuelDeliveryPortalLocations = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalLocations'));
const FuelDeliveryPortalAccount = lazy(() => import('@/pages/fuel-delivery-portal/FuelDeliveryPortalAccount'));

// Septic Portal
const SepticPortalLanding = lazy(() => import('@/pages/septic-portal/SepticPortalLanding'));
const SepticPortalLogin = lazy(() => import('@/pages/septic-portal/SepticPortalLogin'));
const SepticPortalRegister = lazy(() => import('@/pages/septic-portal/SepticPortalRegister'));
const SepticPortalDashboard = lazy(() => import('@/pages/septic-portal/SepticPortalDashboard'));

// Automotive Portal
const AutomotivePortalLanding = lazy(() => import('@/pages/automotive-portal/AutomotivePortalLanding'));
const AutomotivePortalLogin = lazy(() => import('@/pages/automotive-portal/AutomotivePortalLogin'));
const AutomotivePortalRegister = lazy(() => import('@/pages/automotive-portal/AutomotivePortalRegister'));
const AutomotivePortalDashboard = lazy(() => import('@/pages/automotive-portal/AutomotivePortalDashboard'));

// Water Delivery Portal
const WaterDeliveryPortalLanding = lazy(() => import('@/pages/water-delivery-portal/WaterDeliveryPortalLanding'));
const WaterDeliveryPortalLogin = lazy(() => import('@/pages/water-delivery-portal/WaterDeliveryPortalLogin'));
const WaterDeliveryPortalRegister = lazy(() => import('@/pages/water-delivery-portal/WaterDeliveryPortalRegister'));
const WaterDeliveryPortalDashboardPage = lazy(() => import('@/pages/water-delivery-portal/WaterDeliveryPortalDashboard'));

// Marine Portal
const MarinePortalLanding = lazy(() => import('@/pages/marine-portal/MarinePortalLanding'));
const MarinePortalLogin = lazy(() => import('@/pages/marine-portal/MarinePortalLogin'));
const MarinePortalRegister = lazy(() => import('@/pages/marine-portal/MarinePortalRegister'));
const MarinePortalDashboard = lazy(() => import('@/pages/marine-portal/MarinePortalDashboard'));

// Water Delivery
const WaterDeliveryDashboard = lazy(() => import('@/pages/water-delivery/WaterDeliveryDashboard'));
const WaterDeliveryOrders = lazy(() => import('@/pages/water-delivery/WaterDeliveryOrders'));
const WaterDeliveryOrderForm = lazy(() => import('@/pages/water-delivery/WaterDeliveryOrderForm'));
const WaterDeliveryCustomers = lazy(() => import('@/pages/water-delivery/WaterDeliveryCustomers'));
const WaterDeliveryCustomerDetails = lazy(() => import('@/pages/water-delivery/WaterDeliveryCustomerDetails'));
const WaterDeliveryLocations = lazy(() => import('@/pages/water-delivery/WaterDeliveryLocations'));
const WaterDeliveryProducts = lazy(() => import('@/pages/water-delivery/WaterDeliveryProducts'));
const WaterDeliveryTrucks = lazy(() => import('@/pages/water-delivery/WaterDeliveryTrucks'));
const WaterDeliveryDrivers = lazy(() => import('@/pages/water-delivery/WaterDeliveryDrivers'));
const WaterDeliveryDriverDetail = lazy(() => import('@/pages/water-delivery/WaterDeliveryDriverDetail'));
const WaterDeliveryRoutes = lazy(() => import('@/pages/water-delivery/WaterDeliveryRoutes'));
const WaterDeliveryCompletions = lazy(() => import('@/pages/water-delivery/WaterDeliveryCompletions'));
const WaterDeliveryInventory = lazy(() => import('@/pages/water-delivery/WaterDeliveryPartsInventory'));
const WaterDeliveryInvoices = lazy(() => import('@/pages/water-delivery/WaterDeliveryInvoices'));
const WaterDeliveryDriverApp = lazy(() => import('@/pages/water-delivery/WaterDeliveryDriverApp'));
const WaterDeliveryPricing = lazy(() => import('@/pages/water-delivery/WaterDeliveryPricing'));
const WaterDeliveryTanks = lazy(() => import('@/pages/water-delivery/WaterDeliveryTanks'));
const WaterDeliveryTidyTanks = lazy(() => import('@/pages/water-delivery/WaterDeliveryTidyTanks'));
const WaterDeliveryTankFills = lazy(() => import('@/pages/water-delivery/WaterDeliveryTankFills'));
const WaterDeliveryEquipment = lazy(() => import('@/pages/water-delivery/WaterDeliveryEquipment'));
const WaterDeliveryEquipmentFilters = lazy(() => import('@/pages/water-delivery/WaterDeliveryEquipmentFilters'));
const WaterDeliveryQuotes = lazy(() => import('@/pages/water-delivery/WaterDeliveryQuotes'));
const WaterDeliveryProfile = lazy(() => import('@/pages/water-delivery/WaterDeliveryProfile'));
const WaterDeliverySettings = lazy(() => import('@/pages/water-delivery/WaterDeliverySettings'));
const WaterDeliveryPurchases = lazy(() => import('@/pages/water-delivery/WaterDeliveryPurchases'));
const WaterDeliveryStaff = lazy(() => import('@/pages/water-delivery/WaterDeliveryStaff'));
const WaterDeliveryPartsInventory = lazy(() => import('@/pages/water-delivery/WaterDeliveryPartsInventory'));
const WaterDeliveryStore = lazy(() => import('@/pages/water-delivery/WaterDeliveryStore'));
const WaterDeliveryLayout = lazy(() => import('@/components/water-delivery').then(m => ({ default: m.WaterDeliveryLayout })));

// Personal Trainer
const PersonalTrainerDashboard = lazy(() => import('@/pages/personal-trainer/PersonalTrainerDashboard'));
const PersonalTrainerClients = lazy(() => import('@/pages/personal-trainer/PersonalTrainerClients'));
const PersonalTrainerClientDetail = lazy(() => import('@/pages/personal-trainer/PersonalTrainerClientDetail'));
const PersonalTrainerWorkoutBuilder = lazy(() => import('@/pages/personal-trainer/PersonalTrainerWorkoutBuilder'));
const PersonalTrainerPrograms = lazy(() => import('@/pages/personal-trainer/PersonalTrainerPrograms'));
const PersonalTrainerExercises = lazy(() => import('@/pages/personal-trainer/PersonalTrainerExercises'));
const PersonalTrainerSessions = lazy(() => import('@/pages/personal-trainer/PersonalTrainerSessions'));
const PersonalTrainerMetrics = lazy(() => import('@/pages/personal-trainer/PersonalTrainerMetrics'));
const PersonalTrainerPackages = lazy(() => import('@/pages/personal-trainer/PersonalTrainerPackages'));
const PersonalTrainerBilling = lazy(() => import('@/pages/personal-trainer/PersonalTrainerBilling'));
const PersonalTrainerSettings = lazy(() => import('@/pages/personal-trainer/PersonalTrainerSettings'));
const PersonalTrainerTrainers = lazy(() => import('@/pages/personal-trainer/PersonalTrainerTrainers'));
const PersonalTrainerCheckIns = lazy(() => import('@/pages/personal-trainer/PersonalTrainerCheckIns'));
const PersonalTrainerMessages = lazy(() => import('@/pages/personal-trainer/PersonalTrainerMessages'));
const PersonalTrainerReports = lazy(() => import('@/pages/personal-trainer/PersonalTrainerReports'));
const PersonalTrainerCommunity = lazy(() => import('@/pages/personal-trainer/PersonalTrainerCommunity'));
const PersonalTrainerChallenges = lazy(() => import('@/pages/personal-trainer/PersonalTrainerChallenges'));
const PersonalTrainerReferrals = lazy(() => import('@/pages/personal-trainer/PersonalTrainerReferrals'));
const PersonalTrainerBranding = lazy(() => import('@/pages/personal-trainer/PersonalTrainerBranding'));
const PersonalTrainerNutrition = lazy(() => import('@/pages/personal-trainer/PersonalTrainerNutrition'));
const PersonalTrainerWearables = lazy(() => import('@/pages/personal-trainer/PersonalTrainerWearables'));
const PersonalTrainerAutomations = lazy(() => import('@/pages/personal-trainer/PersonalTrainerAutomations'));
const PersonalTrainerAIChat = lazy(() => import('@/components/personal-trainer/PTAIChatPage'));
const PersonalTrainerSocialFeed = lazy(() => import('@/pages/personal-trainer/PersonalTrainerSocialFeed'));
const PersonalTrainerCalendar = lazy(() => import('@/pages/personal-trainer/PersonalTrainerCalendar'));
const PersonalTrainerGymStaff = lazy(() => import('@/pages/personal-trainer/PersonalTrainerGymStaff'));
const PersonalTrainerTimeTracking = lazy(() => import('@/pages/personal-trainer/PersonalTrainerTimeTracking'));
const PersonalTrainerSupplements = lazy(() => import('@/pages/personal-trainer/PersonalTrainerSupplements'));
const PersonalTrainerAbout = lazy(() => import('@/pages/personal-trainer/PersonalTrainerAbout'));
const PersonalTrainerLayout = lazy(() => import('@/components/personal-trainer').then(m => ({ default: m.PersonalTrainerLayout })));

// Game Development Module
const GameDevDashboard = lazy(() => import('@/pages/game-development/GameDevDashboard'));
const GameDevProjects = lazy(() => import('@/pages/game-development/GameDevProjects'));
const GameDevCanvas = lazy(() => import('@/pages/game-development/GameDevCanvas'));
const GameDevCanvasOverview = lazy(() => import('@/pages/game-development/GameDevCanvasOverview'));
const GameDevDatabase = lazy(() => import('@/pages/game-development/GameDevDatabase'));
const GameDevGDD = lazy(() => import('@/pages/game-development/GameDevGDD'));
const GameDevRoadmap = lazy(() => import('@/pages/game-development/GameDevRoadmap'));
const GameDevStory = lazy(() => import('@/pages/game-development/GameDevStory'));
const GameDevCharacters = lazy(() => import('@/pages/game-development/GameDevCharacters'));
const GameDevDialogue = lazy(() => import('@/pages/game-development/GameDevDialogue'));
const GameDevWiki = lazy(() => import('@/pages/game-development/GameDevWiki'));
const GameDevQuests = lazy(() => import('@/pages/game-development/GameDevQuests'));
const GameDevRaids = lazy(() => import('@/pages/game-development/GameDevRaids'));
const GameDevItems = lazy(() => import('@/pages/game-development/GameDevItems'));
const GameDevEconomy = lazy(() => import('@/pages/game-development/GameDevEconomy'));
const GameDevLevels = lazy(() => import('@/pages/game-development/GameDevLevels'));
const GameDevPlaytesting = lazy(() => import('@/pages/game-development/GameDevPlaytesting'));
const GameDevAssets = lazy(() => import('@/pages/game-development/GameDevAssets'));
const GameDevLocalization = lazy(() => import('@/pages/game-development/GameDevLocalization'));
const GameDevTeam = lazy(() => import('@/pages/game-development/GameDevTeam'));
const GameDevAnalytics = lazy(() => import('@/pages/game-development/GameDevAnalytics'));
const GameDevSettings = lazy(() => import('@/pages/game-development/GameDevSettings'));
const GameDevLayout = lazy(() => import('@/components/game-development').then(m => ({ default: m.GameDevLayout })));

// Welding Module
const WeldingAdminOverview = lazy(() => import('@/pages/welding/WeldingAdminOverview'));
const WeldingAdminQuotes = lazy(() => import('@/pages/welding/WeldingAdminQuotes'));
const WeldingAdminInvoices = lazy(() => import('@/pages/welding/WeldingAdminInvoices'));
const WeldingAdminInventory = lazy(() => import('@/pages/welding/WeldingAdminInventory'));
const WeldingAdminCustomers = lazy(() => import('@/pages/welding/WeldingAdminCustomers'));
const WeldingAdminPaymentsDue = lazy(() => import('@/pages/welding/WeldingAdminPaymentsDue'));
const WeldingAdminAccountsPayable = lazy(() => import('@/pages/welding/WeldingAdminAccountsPayable'));
const WeldingAdminPurchaseOrders = lazy(() => import('@/pages/welding/WeldingAdminPurchaseOrders'));
const WeldingAdminMessages = lazy(() => import('@/pages/welding/WeldingAdminMessages'));
const WeldingAdminCalendar = lazy(() => import('@/pages/welding/WeldingAdminCalendar'));
const WeldingAdminSales = lazy(() => import('@/pages/welding/WeldingAdminSales'));
const WeldingAdminLinks = lazy(() => import('@/pages/welding/WeldingAdminLinks'));
const WeldingAdminGallery = lazy(() => import('@/pages/welding/WeldingAdminGallery'));
const WeldingAdminSettings = lazy(() => import('@/pages/welding/WeldingAdminSettings'));
const WeldingSettingsProvider = lazy(() => import('@/contexts/WeldingSettingsContext').then(m => ({ default: m.WeldingSettingsProvider })));

// Personal Trainer Portal
const PTPortalLanding = lazy(() => import('@/pages/pt-portal/PTPortalLanding'));
const PTPortalLogin = lazy(() => import('@/pages/pt-portal/PTPortalLogin'));
const PTPortalRegister = lazy(() => import('@/pages/pt-portal/PTPortalRegister'));
const PTPortalDashboard = lazy(() => import('@/pages/pt-portal/PTPortalDashboard'));

// Septic Services
const SepticDashboard = lazy(() => import('@/pages/septic/SepticDashboard'));
const SepticOrders = lazy(() => import('@/pages/septic/SepticOrders'));
const SepticOrderForm = lazy(() => import('@/pages/septic/SepticOrderForm'));
const SepticOrderDetail = lazy(() => import('@/pages/septic/SepticOrderDetail'));
const SepticCustomers = lazy(() => import('@/pages/septic/SepticCustomers'));
const SepticCustomerDetails = lazy(() => import('@/pages/septic/SepticCustomerDetails'));
const SepticLocations = lazy(() => import('@/pages/septic/SepticLocations'));
const SepticProducts = lazy(() => import('@/pages/septic/SepticProducts'));
const SepticTrucks = lazy(() => import('@/pages/septic/SepticTrucks'));
const SepticDrivers = lazy(() => import('@/pages/septic/SepticDrivers'));
const SepticDriverDetail = lazy(() => import('@/pages/septic/SepticDriverDetail'));
const SepticEmployeeDetail = lazy(() => import('@/pages/septic/SepticEmployeeDetail'));
const SepticRoutes = lazy(() => import('@/pages/septic/SepticRoutes'));
const SepticCompletions = lazy(() => import('@/pages/septic/SepticCompletions'));
const SepticInventory = lazy(() => import('@/pages/septic/SepticInventory'));
const SepticInvoices = lazy(() => import('@/pages/septic/SepticInvoices'));
const SepticDriverApp = lazy(() => import('@/pages/septic/SepticDriverApp'));
const SepticPricing = lazy(() => import('@/pages/septic/SepticPricing'));
const SepticTanks = lazy(() => import('@/pages/septic/SepticTanks'));
const SepticTidyTanks = lazy(() => import('@/pages/septic/SepticTidyTanks'));
const SepticTankFills = lazy(() => import('@/pages/septic/SepticTankFills'));
const SepticEquipment = lazy(() => import('@/pages/septic/SepticEquipment'));
const SepticEquipmentFilters = lazy(() => import('@/pages/septic/SepticEquipmentFilters'));
const SepticQuotes = lazy(() => import('@/pages/septic/SepticQuotes'));
const SepticProfile = lazy(() => import('@/pages/septic/SepticProfile'));
const SepticSettings = lazy(() => import('@/pages/septic/SepticSettings'));
const SepticPurchases = lazy(() => import('@/pages/septic/SepticPurchases'));
const SepticStaff = lazy(() => import('@/pages/septic/SepticStaff'));
const SepticStore = lazy(() => import('@/pages/septic/SepticStore'));
const SepticInspections = lazy(() => import('@/pages/septic/SepticInspections'));
const SepticInspectionForm = lazy(() => import('@/pages/septic/SepticInspectionForm'));
const SepticDeveloper = lazy(() => import('@/pages/septic/SepticDeveloper'));
const SepticLayout = lazy(() => import('@/components/septic').then(m => ({ default: m.SepticLayout })));

// Export Company
const ExportDashboard = lazy(() => import('@/pages/export/ExportDashboard'));
const ExportOrders = lazy(() => import('@/pages/export/ExportOrders'));
const ExportCustomers = lazy(() => import('@/pages/export/ExportCustomers'));
const ExportProducts = lazy(() => import('@/pages/export/ExportProducts'));
const ExportVehicles = lazy(() => import('@/pages/export/ExportVehicles'));
const ExportShipments = lazy(() => import('@/pages/export/ExportShipments'));
const ExportPackaging = lazy(() => import('@/pages/export/ExportPackaging'));
const ExportWarehouses = lazy(() => import('@/pages/export/ExportWarehouses'));
const ExportInventory = lazy(() => import('@/pages/export/ExportInventory'));
const ExportDocuments = lazy(() => import('@/pages/export/ExportDocuments'));
const ExportTrucks = lazy(() => import('@/pages/export/ExportTrucks'));
const ExportDrivers = lazy(() => import('@/pages/export/ExportDrivers'));
const ExportRoutes = lazy(() => import('@/pages/export/ExportRoutes'));
const ExportCompletions = lazy(() => import('@/pages/export/ExportCompletions'));
const ExportInvoices = lazy(() => import('@/pages/export/ExportInvoices'));
const ExportQuotes = lazy(() => import('@/pages/export/ExportQuotes'));
const ExportPricing = lazy(() => import('@/pages/export/ExportPricing'));
const ExportStaff = lazy(() => import('@/pages/export/ExportStaff'));
const ExportEquipment = lazy(() => import('@/pages/export/ExportEquipment'));
const ExportDriverApp = lazy(() => import('@/pages/export/ExportDriverApp'));
const ExportProfile = lazy(() => import('@/pages/export/ExportProfile'));
const ExportSettings = lazy(() => import('@/pages/export/ExportSettings'));
const ExportStore = lazy(() => import('@/pages/export/ExportStore'));
const ExportDeveloper = lazy(() => import('@/pages/export/ExportDeveloper'));
const ExportRequests = lazy(() => import('@/pages/export/ExportRequests'));
const ExportSuppliers = lazy(() => import('@/pages/export/ExportSuppliers'));
const ExportPackingTraceability = lazy(() => import('@/pages/export/ExportPackingTraceability'));
const ExportReservations = lazy(() => import('@/pages/export/ExportReservations'));
const ExportPayments = lazy(() => import('@/pages/export/ExportPayments'));
const ExportCustomsCompliance = lazy(() => import('@/pages/export/ExportCustomsCompliance'));
const ExportReports = lazy(() => import('@/pages/export/ExportReports'));
const ExportNotifications = lazy(() => import('@/pages/export/ExportNotifications'));
const ImportPurchaseOrders = lazy(() => import('@/pages/export/ImportPurchaseOrders'));
const ImportReceiving = lazy(() => import('@/pages/export/ImportReceiving'));
const ImportCustomsClearance = lazy(() => import('@/pages/export/ImportCustomsClearance'));
const ExportContracts = lazy(() => import('@/pages/export/ExportContracts'));
const ExportCurrencyRates = lazy(() => import('@/pages/export/ExportCurrencyRates'));
const ImportInvoices = lazy(() => import('@/pages/export/ImportInvoices'));
const ExportShippingInsurance = lazy(() => import('@/pages/export/ExportShippingInsurance'));
const ExportActivityLog = lazy(() => import('@/pages/export/ExportActivityLog'));
const ExportReturns = lazy(() => import('@/pages/export/ExportReturns'));
const ExportQualityControl = lazy(() => import('@/pages/export/ExportQualityControl'));
const ExportFreightForwarders = lazy(() => import('@/pages/export/ExportFreightForwarders'));
const ExportLettersOfCredit = lazy(() => import('@/pages/export/ExportLettersOfCredit'));
const ExportDutyDrawbacks = lazy(() => import('@/pages/export/ExportDutyDrawbacks'));
const ExportComplianceCalendar = lazy(() => import('@/pages/export/ExportComplianceCalendar'));
const ExportSanctionsScreening = lazy(() => import('@/pages/export/ExportSanctionsScreening'));
const ExportSamples = lazy(() => import('@/pages/export/ExportSamples'));
const ExportBookings = lazy(() => import('@/pages/export/ExportBookings'));
const ExportCountryRequirements = lazy(() => import('@/pages/export/ExportCountryRequirements'));
const ExportAgents = lazy(() => import('@/pages/export/ExportAgents'));
const ExportBankGuarantees = lazy(() => import('@/pages/export/ExportBankGuarantees'));
const ExportCreditManagement = lazy(() => import('@/pages/export/ExportCreditManagement'));
const ExportCertificates = lazy(() => import('@/pages/export/ExportCertificates'));
const ExportHsCodes = lazy(() => import('@/pages/export/ExportHsCodes'));
const ExportPorts = lazy(() => import('@/pages/export/ExportPorts'));
const ExportBondedWarehouses = lazy(() => import('@/pages/export/ExportBondedWarehouses'));
const ExportIntermodal = lazy(() => import('@/pages/export/ExportIntermodal'));
const ExportShipmentPL = lazy(() => import('@/pages/export/ExportShipmentPL'));
const ExportTradeFinanceDashboard = lazy(() => import('@/pages/export/ExportTradeFinanceDashboard'));
const ExportDocumentTemplates = lazy(() => import('@/pages/export/ExportDocumentTemplates'));
const ExportCustomsDeclarations = lazy(() => import('@/pages/export/ExportCustomsDeclarations'));
const ExportTradeAlerts = lazy(() => import('@/pages/export/ExportTradeAlerts'));
const ExportShipmentTracker = lazy(() => import('@/pages/export/ExportShipmentTracker'));
const ExportVendorScorecards = lazy(() => import('@/pages/export/ExportVendorScorecards'));
const ExportDemandForecasting = lazy(() => import('@/pages/export/ExportDemandForecasting'));
const ExportContainerLoadPlanning = lazy(() => import('@/pages/export/ExportContainerLoadPlanning'));
const ExportConsolidatedPL = lazy(() => import('@/pages/export/ExportConsolidatedPL'));
const ExportAgingReports = lazy(() => import('@/pages/export/ExportAgingReports'));
const ExportLandedCostCalculator = lazy(() => import('@/pages/export/ExportLandedCostCalculator'));
const ExportMessagingTemplates = lazy(() => import('@/pages/export/ExportMessagingTemplates'));
const ExportCustomerPortal = lazy(() => import('@/pages/export/ExportCustomerPortal'));
const ExportEdiHub = lazy(() => import('@/pages/export/ExportEdiHub'));
const ExportTradeLaneAnalytics = lazy(() => import('@/pages/export/ExportTradeLaneAnalytics'));
const ExportKpiDashboard = lazy(() => import('@/pages/export/ExportKpiDashboard'));
const ExportOverviewHub = lazy(() => import('@/pages/export/hubs/ExportOverviewHub'));
const ExportOrdersHub = lazy(() => import('@/pages/export/hubs/ExportOrdersHub'));
const ExportCustomersHub = lazy(() => import('@/pages/export/hubs/ExportCustomersHub'));
const ExportLogisticsHub = lazy(() => import('@/pages/export/hubs/ExportLogisticsHub'));
const ExportInventoryHub = lazy(() => import('@/pages/export/hubs/ExportInventoryHub'));
const ExportDocumentsHub = lazy(() => import('@/pages/export/hubs/ExportDocumentsHub'));
const ExportFinanceHub = lazy(() => import('@/pages/export/hubs/ExportFinanceHub'));
const ExportAnalyticsHub = lazy(() => import('@/pages/export/hubs/ExportAnalyticsHub'));
const ExportCommunicationHub = lazy(() => import('@/pages/export/hubs/ExportCommunicationHub'));
const ExportImportHub = lazy(() => import('@/pages/export/hubs/ExportImportHub'));
const ExportConfigHub = lazy(() => import('@/pages/export/hubs/ExportConfigHub'));
const ExportLayout = lazy(() => import('@/components/export').then(m => ({ default: m.ExportLayout })));

function App() {

  return (
    <>
      <ChunkErrorBoundary>
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes - no auth required */}
        <Route path="/" element={<Index />} />
        <Route path="/index" element={<Navigate to="/" replace />} />
        <Route path="/index.html" element={<Navigate to="/" replace />} />
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
        <Route path="/modules/:slug" element={<ModuleLearnMore />} />
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
        
        {/* Septic Customer Portal - Public routes */}
        <Route path="/septic-portal" element={<SepticPortalLanding />} />
        <Route path="/septic-portal/login" element={<SepticPortalLogin />} />
        <Route path="/septic-portal/register" element={<SepticPortalRegister />} />
        <Route path="/septic-portal/dashboard" element={<SepticPortalDashboard />} />
        
        {/* Automotive Customer Portal - Public routes */}
        <Route path="/automotive-portal" element={<AutomotivePortalLanding />} />
        <Route path="/automotive-portal/login" element={<AutomotivePortalLogin />} />
        <Route path="/automotive-portal/register" element={<AutomotivePortalRegister />} />
        <Route path="/automotive-portal/dashboard" element={<AutomotivePortalDashboard />} />
        
        {/* Water Delivery Customer Portal - Public routes */}
        <Route path="/water-delivery-portal" element={<WaterDeliveryPortalLanding />} />
        <Route path="/water-delivery-portal/login" element={<WaterDeliveryPortalLogin />} />
        <Route path="/water-delivery-portal/register" element={<WaterDeliveryPortalRegister />} />
        <Route path="/water-delivery-portal/dashboard" element={<WaterDeliveryPortalDashboardPage />} />
        
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
                  <Route path="/upcoming-modules" element={<UpcomingModules />} />
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
                  <Route path="/water-delivery/developer" element={<WaterDeliveryDeveloper />} />
                  <Route path="/automotive/developer" element={<AutomotiveDeveloper />} />
                  <Route path="/gunsmith/developer" element={<GunsmithDeveloper />} />
                  <Route path="/marine-services/developer" element={<MarineDeveloper />} />
                  <Route path="/fuel-delivery/developer" element={<FuelDeliveryDeveloper />} />
                  <Route path="/power-washing/developer" element={<PowerWashingDeveloper />} />
                  
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
                  
                  {/* Power Washing */}
                  <Route path="/power-washing" element={<PowerWashingDashboard />} />
                  <Route path="/power-washing/jobs" element={<PowerWashingJobsList />} />
                  <Route path="/power-washing/jobs/new" element={<PowerWashingJobCreate />} />
                  <Route path="/power-washing/jobs/:id" element={<PowerWashingJobDetails />} />
                  <Route path="/power-washing/jobs/:id/edit" element={<PowerWashingJobEdit />} />
                  <Route path="/power-washing/quotes" element={<PowerWashingQuotesList />} />
                  <Route path="/power-washing/quotes/new" element={<PowerWashingQuoteForm />} />
                  <Route path="/power-washing/quotes/:id" element={<PowerWashingQuoteDetail />} />
                  <Route path="/power-washing/customers" element={<PowerWashingCustomers />} />
                  <Route path="/power-washing/customers/new" element={<PowerWashingCustomerCreate />} />
                  <Route path="/power-washing/customers/:customerId" element={<PowerWashingCustomerDetail />} />
                  <Route path="/power-washing/equipment" element={<PowerWashingEquipment />} />
                  <Route path="/power-washing/equipment/new" element={<PowerWashingEquipmentCreate />} />
                  <Route path="/power-washing/equipment/:id" element={<PowerWashingEquipmentDetail />} />
                  <Route path="/power-washing/chemicals" element={<PowerWashingChemicals />} />
                  <Route path="/power-washing/chemicals/new" element={<PowerWashingChemicalCreate />} />
                  <Route path="/power-washing/inventory" element={<PowerWashingInventory />} />
                  <Route path="/power-washing/formulas" element={<PowerWashingFormulas />} />
                  <Route path="/power-washing/pricing-formulas" element={<PowerWashingPricingFormulas />} />
                  <Route path="/power-washing/bleach-calculator" element={<BleachCalculator />} />
                  <Route path="/power-washing/surface-calculator" element={<SurfaceMixCalculator />} />
                  <Route path="/power-washing/recurring" element={<PowerWashingRecurringSchedules />} />
                  <Route path="/power-washing/invoices" element={<PowerWashingInvoices />} />
                  <Route path="/power-washing/invoices/:id" element={<PowerWashingInvoiceDetail />} />
                  <Route path="/power-washing/reports" element={<PowerWashingReports />} />
                  <Route path="/power-washing/routes" element={<PowerWashingRoutes />} />
                  <Route path="/power-washing/routes/:id" element={<PowerWashingRouteDetail />} />
                  <Route path="/power-washing/reviews" element={<PowerWashingReviews />} />
                  <Route path="/power-washing/notifications" element={<PowerWashingNotifications />} />
                  <Route path="/power-washing/field" element={<PowerWashingFieldView />} />
                  <Route path="/power-washing/field-view" element={<PowerWashingFieldView />} />
                  <Route path="/power-washing/price-book" element={<PowerWashingPriceBook />} />
                  <Route path="/power-washing/analytics" element={<PowerWashingAnalytics />} />
                  <Route path="/power-washing/weather" element={<PowerWashingWeather />} />
                  <Route path="/power-washing/photos" element={<PowerWashingPhotos />} />
                  <Route path="/power-washing/subscriptions" element={<PowerWashingSubscriptions />} />
                  <Route path="/power-washing/portal" element={<PowerWashingCustomerPortal />} />
                  <Route path="/power-washing/payments" element={<PowerWashingPayments />} />
                  <Route path="/power-washing/schedule" element={<PowerWashingSchedule />} />
                  <Route path="/power-washing/leads" element={<PowerWashingLeads />} />
                  <Route path="/power-washing/fleet" element={<PowerWashingFleet />} />
                  <Route path="/power-washing/store" element={<PowerWashingStore />} />
                  <Route path="/power-washing/team" element={<PowerWashingTeam />} />
                  <Route path="/power-washing/roles" element={<PowerWashingRoles />} />
                  <Route path="/power-washing/settings" element={<PowerWashingSettings />} />
                  
                  {/* Gunsmith Routes */}
                  <Route path="/gunsmith" element={<GunsmithDashboard />} />
                  <Route path="/gunsmith/jobs" element={<GunsmithJobs />} />
                  <Route path="/gunsmith/jobs/new" element={<GunsmithJobForm />} />
                  <Route path="/gunsmith/jobs/:id" element={<GunsmithJobDetail />} />
                  <Route path="/gunsmith/customers" element={<GunsmithCustomers />} />
                  <Route path="/gunsmith/customers/new" element={<GunsmithCustomerCreate />} />
                  <Route path="/gunsmith/customers/:customerId" element={<GunsmithCustomerDetail />} />
                  <Route path="/gunsmith/quotes" element={<GunsmithQuotes />} />
                  <Route path="/gunsmith/quotes/new" element={<GunsmithQuoteForm />} />
                  <Route path="/gunsmith/quotes/:id" element={<GunsmithQuoteDetail />} />
                  <Route path="/gunsmith/firearms" element={<GunsmithFirearms />} />
                  <Route path="/gunsmith/firearms/new" element={<GunsmithFirearmForm />} />
                  <Route path="/gunsmith/firearms/:id" element={<GunsmithFirearmEdit />} />
                  <Route path="/gunsmith/parts" element={<GunsmithParts />} />
                  <Route path="/gunsmith/parts/:id" element={<GunsmithPartEdit />} />
                  <Route path="/gunsmith/parts/new" element={<GunsmithPartForm />} />
                  <Route path="/gunsmith/parts-on-order" element={<GunsmithPartsOnOrder />} />
                  <Route path="/gunsmith/invoices" element={<GunsmithInvoices />} />
                  <Route path="/gunsmith/invoices/new" element={<GunsmithInvoiceForm />} />
                  <Route path="/gunsmith/payments" element={<GunsmithPayments />} />
                  <Route path="/gunsmith/appointments" element={<GunsmithAppointments />} />
                  <Route path="/gunsmith/appointments/new" element={<GunsmithAppointmentForm />} />
                  <Route path="/gunsmith/compliance" element={<GunsmithCompliance />} />
                  <Route path="/gunsmith/transfers" element={<GunsmithTransfers />} />
                  <Route path="/gunsmith/transfers/new" element={<GunsmithTransferForm />} />
                  <Route path="/gunsmith/consignments" element={<GunsmithConsignments />} />
                  <Route path="/gunsmith/consignments/new" element={<GunsmithConsignmentForm />} />
                  <Route path="/gunsmith/inventory" element={<GunsmithInventory />} />
                  <Route path="/gunsmith/inventory/adjust" element={<GunsmithStockAdjust />} />
                  <Route path="/gunsmith/inventory/purchase-orders/new" element={<GunsmithPurchaseOrderForm />} />
                  <Route path="/gunsmith/inventory/serialized/new" element={<GunsmithSerializedForm />} />
                  <Route path="/gunsmith/resources" element={<GunsmithUsefulLinks />} />
                  <Route path="/gunsmith/useful-links" element={<Navigate to="/gunsmith/resources" replace />} />
                  <Route path="/gunsmith/change-log" element={<GunsmithChangeLog />} />
                  <Route path="/gunsmith/settings" element={<GunsmithSettings />} />
                  <Route path="/gunsmith/team" element={<GunsmithTeam />} />
                  <Route path="/gunsmith/roles" element={<GunsmithRoles />} />
                  <Route path="/gunsmith/store" element={<GunsmithStore />} />
                  
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
        
        {/* Water Delivery Module - Separate Layout */}
        <Route
          path="/water-delivery/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <WaterDeliveryLayout>
                <Routes>
                  <Route path="/" element={<WaterDeliveryDashboard />} />
                  <Route path="/orders" element={<WaterDeliveryOrders />} />
                  <Route path="/orders/new" element={<WaterDeliveryOrderForm />} />
                  <Route path="/orders/:id" element={<WaterDeliveryOrders />} />
                  <Route path="/customers" element={<WaterDeliveryCustomers />} />
                  <Route path="/customers/:customerId" element={<WaterDeliveryCustomerDetails />} />
                  <Route path="/locations" element={<WaterDeliveryLocations />} />
                  <Route path="/products" element={<WaterDeliveryProducts />} />
                  <Route path="/trucks" element={<WaterDeliveryTrucks />} />
                  <Route path="/drivers" element={<WaterDeliveryDrivers />} />
                  <Route path="/drivers/:id" element={<WaterDeliveryDriverDetail />} />
                  <Route path="/routes" element={<WaterDeliveryRoutes />} />
                  <Route path="/routes/new" element={<WaterDeliveryRoutes />} />
                  <Route path="/deliveries" element={<WaterDeliveryCompletions />} />
                  <Route path="/inventory" element={<WaterDeliveryInventory />} />
                  <Route path="/parts-inventory" element={<WaterDeliveryPartsInventory />} />
                  <Route path="/purchases" element={<WaterDeliveryPurchases />} />
                  <Route path="/invoices" element={<WaterDeliveryInvoices />} />
                  <Route path="/invoices/new" element={<WaterDeliveryInvoices />} />
                  <Route path="/driver-app" element={<WaterDeliveryDriverApp />} />
                  <Route path="/pricing" element={<WaterDeliveryPricing />} />
                  <Route path="/tanks" element={<WaterDeliveryTanks />} />
                  <Route path="/tidy-tanks" element={<WaterDeliveryTidyTanks />} />
                  <Route path="/tank-fills" element={<WaterDeliveryTankFills />} />
                  <Route path="/equipment" element={<WaterDeliveryEquipment />} />
                  <Route path="/equipment-filters" element={<WaterDeliveryEquipmentFilters />} />
                  <Route path="/quotes" element={<WaterDeliveryQuotes />} />
                  <Route path="/staff" element={<WaterDeliveryStaff />} />
                  <Route path="/profile" element={<WaterDeliveryProfile />} />
                  <Route path="/settings" element={<WaterDeliverySettings />} />
                  <Route path="/store" element={<WaterDeliveryStore />} />
                  <Route path="/developer" element={<WaterDeliveryDeveloper />} />
                </Routes>
              </WaterDeliveryLayout>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />

        {/* Personal Trainer Module */}
        <Route
          path="/personal-trainer/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <PersonalTrainerLayout>
                <Routes>
                  <Route path="/" element={<PersonalTrainerDashboard />} />
                  <Route path="/clients" element={<PersonalTrainerClients />} />
                  <Route path="/clients/:id" element={<PersonalTrainerClientDetail />} />
                  <Route path="/trainers" element={<PersonalTrainerTrainers />} />
                  <Route path="/programs" element={<PersonalTrainerPrograms />} />
                  <Route path="/programs/:programId/builder" element={<PersonalTrainerWorkoutBuilder />} />
                  <Route path="/exercises" element={<PersonalTrainerExercises />} />
                  <Route path="/sessions" element={<PersonalTrainerSessions />} />
                  <Route path="/calendar" element={<PersonalTrainerCalendar />} />
                  <Route path="/metrics" element={<PersonalTrainerMetrics />} />
                  <Route path="/check-ins" element={<PersonalTrainerCheckIns />} />
                  <Route path="/messages" element={<PersonalTrainerMessages />} />
                  <Route path="/reports" element={<PersonalTrainerReports />} />
                  <Route path="/packages" element={<PersonalTrainerPackages />} />
                  <Route path="/billing" element={<PersonalTrainerBilling />} />
                  <Route path="/settings" element={<PersonalTrainerSettings />} />
                  <Route path="/community" element={<PersonalTrainerCommunity />} />
                  <Route path="/challenges" element={<PersonalTrainerChallenges />} />
                  <Route path="/referrals" element={<PersonalTrainerReferrals />} />
                  <Route path="/branding" element={<PersonalTrainerBranding />} />
                  <Route path="/nutrition" element={<PersonalTrainerNutrition />} />
                  <Route path="/wearables" element={<PersonalTrainerWearables />} />
                  <Route path="/automations" element={<PersonalTrainerAutomations />} />
                  <Route path="/ai-chat" element={<PersonalTrainerAIChat />} />
                  <Route path="/social-feed" element={<PersonalTrainerSocialFeed />} />
                  <Route path="/staff" element={<PersonalTrainerGymStaff />} />
                  <Route path="/time-tracking" element={<PersonalTrainerTimeTracking />} />
                  <Route path="/supplements" element={<PersonalTrainerSupplements />} />
                  <Route path="/about" element={<PersonalTrainerAbout />} />
                </Routes>
              </PersonalTrainerLayout>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />

        {/* Game Development Module */}
        <Route
          path="/game-development/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <GameDevLayout>
                <Routes>
                  <Route path="/" element={<GameDevDashboard />} />
                  <Route path="/projects" element={<GameDevProjects />} />
                  <Route path="/canvas" element={<GameDevCanvas />} />
                  <Route path="/canvas-overview" element={<GameDevCanvasOverview />} />
                  <Route path="/database" element={<GameDevDatabase />} />
                  <Route path="/gdd" element={<GameDevGDD />} />
                  <Route path="/roadmap" element={<GameDevRoadmap />} />
                  <Route path="/story" element={<GameDevStory />} />
                  <Route path="/characters" element={<GameDevCharacters />} />
                  <Route path="/dialogue" element={<GameDevDialogue />} />
                  <Route path="/wiki" element={<GameDevWiki />} />
                  <Route path="/quests" element={<GameDevQuests />} />
                  <Route path="/raids" element={<GameDevRaids />} />
                  <Route path="/items" element={<GameDevItems />} />
                  <Route path="/economy" element={<GameDevEconomy />} />
                  <Route path="/levels" element={<GameDevLevels />} />
                  <Route path="/playtesting" element={<GameDevPlaytesting />} />
                  <Route path="/assets" element={<GameDevAssets />} />
                  <Route path="/localization" element={<GameDevLocalization />} />
                  <Route path="/team" element={<GameDevTeam />} />
                  <Route path="/analytics" element={<GameDevAnalytics />} />
                  <Route path="/settings" element={<GameDevSettings />} />
                </Routes>
              </GameDevLayout>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />

        {/* Personal Trainer Portal - Public routes */}
        <Route path="/pt-portal" element={<PTPortalLanding />} />
        <Route path="/pt-portal/login" element={<PTPortalLogin />} />
        <Route path="/pt-portal/register" element={<PTPortalRegister />} />
        <Route path="/pt-portal/dashboard" element={<PTPortalDashboard />} />

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

        <Route
          path="/septic/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <SepticLayout>
                <Routes>
                  <Route path="/" element={<SepticDashboard />} />
                  <Route path="/orders" element={<SepticOrders />} />
                  <Route path="/orders/new" element={<SepticOrderForm />} />
                  <Route path="/orders/:orderId" element={<SepticOrderDetail />} />
                  <Route path="/customers" element={<SepticCustomers />} />
                  <Route path="/customers/:customerId" element={<SepticCustomerDetails />} />
                  <Route path="/locations" element={<SepticLocations />} />
                  <Route path="/products" element={<SepticProducts />} />
                  <Route path="/trucks" element={<SepticTrucks />} />
                  <Route path="/drivers" element={<SepticDrivers />} />
                  <Route path="/drivers/:id" element={<SepticDriverDetail />} />
                  <Route path="/employees/:id" element={<SepticEmployeeDetail />} />
                  <Route path="/routes" element={<SepticRoutes />} />
                  <Route path="/completions" element={<SepticCompletions />} />
                  <Route path="/inventory" element={<SepticInventory />} />
                  <Route path="/invoices" element={<SepticInvoices />} />
                  <Route path="/driver-app" element={<SepticDriverApp />} />
                  <Route path="/pricing" element={<SepticPricing />} />
                  <Route path="/tanks" element={<SepticTanks />} />
                  <Route path="/tidy-tanks" element={<SepticTidyTanks />} />
                  <Route path="/tank-fills" element={<SepticTankFills />} />
                  <Route path="/equipment" element={<SepticEquipment />} />
                  <Route path="/equipment-filters" element={<SepticEquipmentFilters />} />
                  <Route path="/quotes" element={<SepticQuotes />} />
                  <Route path="/purchases" element={<SepticPurchases />} />
                  <Route path="/staff" element={<SepticStaff />} />
                  <Route path="/inspections" element={<SepticInspections />} />
                  <Route path="/inspection-form/:templateId" element={<SepticInspectionForm />} />
                  <Route path="/profile" element={<SepticProfile />} />
                  <Route path="/settings" element={<SepticSettings />} />
                  <Route path="/store" element={<SepticStore />} />
                  <Route path="/developer" element={<SepticDeveloper />} />
                </Routes>
              </SepticLayout>
              </AuthenticatedProviders>
            </AuthGate>
          }
        />

        {/* Export Company Module */}
        <Route
          path="/export/*"
          element={
            <AuthGate>
              <AuthenticatedProviders>
              <ExportLayout>
                <Routes>
                  <Route path="/" element={<ExportDashboard />} />
                  <Route path="/hub/overview" element={<ExportOverviewHub />} />
                  <Route path="/hub/orders" element={<ExportOrdersHub />} />
                  <Route path="/hub/customers" element={<ExportCustomersHub />} />
                  <Route path="/hub/logistics" element={<ExportLogisticsHub />} />
                  <Route path="/hub/inventory" element={<ExportInventoryHub />} />
                  <Route path="/hub/documents" element={<ExportDocumentsHub />} />
                  <Route path="/hub/finance" element={<ExportFinanceHub />} />
                  <Route path="/hub/analytics" element={<ExportAnalyticsHub />} />
                  <Route path="/hub/communication" element={<ExportCommunicationHub />} />
                  <Route path="/hub/import" element={<ExportImportHub />} />
                  <Route path="/hub/config" element={<ExportConfigHub />} />
                  <Route path="/orders" element={<ExportOrders />} />
                  <Route path="/customers" element={<ExportCustomers />} />
                  <Route path="/products" element={<ExportProducts />} />
                  <Route path="/vehicles" element={<ExportVehicles />} />
                  <Route path="/shipments" element={<ExportShipments />} />
                  <Route path="/packaging" element={<ExportPackaging />} />
                  <Route path="/warehouses" element={<ExportWarehouses />} />
                  <Route path="/inventory" element={<ExportInventory />} />
                  <Route path="/documents" element={<ExportDocuments />} />
                  <Route path="/trucks" element={<ExportTrucks />} />
                  <Route path="/drivers" element={<ExportDrivers />} />
                  <Route path="/routes" element={<ExportRoutes />} />
                  <Route path="/completions" element={<ExportCompletions />} />
                  <Route path="/invoices" element={<ExportInvoices />} />
                  <Route path="/quotes" element={<ExportQuotes />} />
                  <Route path="/pricing" element={<ExportPricing />} />
                  <Route path="/staff" element={<ExportStaff />} />
                  <Route path="/equipment" element={<ExportEquipment />} />
                  <Route path="/driver-app" element={<ExportDriverApp />} />
                  <Route path="/profile" element={<ExportProfile />} />
                  <Route path="/settings" element={<ExportSettings />} />
                  <Route path="/store" element={<ExportStore />} />
                  <Route path="/developer" element={<ExportDeveloper />} />
                  <Route path="/requests" element={<ExportRequests />} />
                  <Route path="/suppliers" element={<ExportSuppliers />} />
                  <Route path="/packing" element={<ExportPackingTraceability />} />
                  <Route path="/reservations" element={<ExportReservations />} />
                  <Route path="/payments" element={<ExportPayments />} />
                  <Route path="/customs" element={<ExportCustomsCompliance />} />
                  <Route path="/reports" element={<ExportReports />} />
                  <Route path="/notifications" element={<ExportNotifications />} />
                  <Route path="/import-orders" element={<ImportPurchaseOrders />} />
                  <Route path="/import-receiving" element={<ImportReceiving />} />
                  <Route path="/import-customs" element={<ImportCustomsClearance />} />
                  <Route path="/import-invoices" element={<ImportInvoices />} />
                  <Route path="/contracts" element={<ExportContracts />} />
                  <Route path="/currency" element={<ExportCurrencyRates />} />
                  <Route path="/insurance" element={<ExportShippingInsurance />} />
                  <Route path="/activity" element={<ExportActivityLog />} />
                  <Route path="/returns" element={<ExportReturns />} />
                  <Route path="/quality" element={<ExportQualityControl />} />
                  <Route path="/forwarders" element={<ExportFreightForwarders />} />
                  <Route path="/letters-of-credit" element={<ExportLettersOfCredit />} />
                  <Route path="/duty-drawbacks" element={<ExportDutyDrawbacks />} />
                  <Route path="/compliance-calendar" element={<ExportComplianceCalendar />} />
                  <Route path="/sanctions" element={<ExportSanctionsScreening />} />
                  <Route path="/samples" element={<ExportSamples />} />
                  <Route path="/bookings" element={<ExportBookings />} />
                  <Route path="/country-requirements" element={<ExportCountryRequirements />} />
                  <Route path="/agents" element={<ExportAgents />} />
                  <Route path="/bank-guarantees" element={<ExportBankGuarantees />} />
                  <Route path="/credit" element={<ExportCreditManagement />} />
                  <Route path="/certificates" element={<ExportCertificates />} />
                  <Route path="/hs-codes" element={<ExportHsCodes />} />
                  <Route path="/ports" element={<ExportPorts />} />
                  <Route path="/bonded-warehouses" element={<ExportBondedWarehouses />} />
                  <Route path="/intermodal" element={<ExportIntermodal />} />
                  <Route path="/shipment-pl" element={<ExportShipmentPL />} />
                  <Route path="/trade-finance" element={<ExportTradeFinanceDashboard />} />
                  <Route path="/doc-templates" element={<ExportDocumentTemplates />} />
                  <Route path="/declarations" element={<ExportCustomsDeclarations />} />
                  <Route path="/trade-alerts" element={<ExportTradeAlerts />} />
                  <Route path="/shipment-tracker" element={<ExportShipmentTracker />} />
                  <Route path="/vendor-scorecards" element={<ExportVendorScorecards />} />
                  <Route path="/demand-forecasting" element={<ExportDemandForecasting />} />
                  <Route path="/container-load-planning" element={<ExportContainerLoadPlanning />} />
                  <Route path="/consolidated-pl" element={<ExportConsolidatedPL />} />
                  <Route path="/aging-reports" element={<ExportAgingReports />} />
                  <Route path="/landed-cost" element={<ExportLandedCostCalculator />} />
                  <Route path="/messaging-templates" element={<ExportMessagingTemplates />} />
                  <Route path="/customer-portal" element={<ExportCustomerPortal />} />
                  <Route path="/edi-hub" element={<ExportEdiHub />} />
                  <Route path="/trade-lanes" element={<ExportTradeLaneAnalytics />} />
                  <Route path="/kpi-dashboard" element={<ExportKpiDashboard />} />
                </Routes>
              </ExportLayout>
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
