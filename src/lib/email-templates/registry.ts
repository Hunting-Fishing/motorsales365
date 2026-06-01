import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as signupWelcome } from './signup-welcome'
import { template as paymentReceipt } from './payment-receipt'
import { template as paymentFailed } from './payment-failed'
import { template as refundIssued } from './refund-issued'
import { template as subscriptionRenewed } from './subscription-renewed'
import { template as subscriptionCancelled } from './subscription-cancelled'
import { template as adInquiryReceived } from './ad-inquiry-received'
import { template as adInquiryStaffNotice } from './ad-inquiry-staff-notice'
import { template as adInquiryReply } from './ad-inquiry-reply'
import { template as teamInvite } from './team-invite'
import { template as teamNewLead } from './team-new-lead'
import { template as supportTicketReceived } from './support-ticket-received'
import { template as supportTicketStaffNotice } from './support-ticket-staff-notice'
import { template as bookingCustomer } from './booking-customer'
import { template as bookingOwner } from './booking-owner'
import { template as businessArchived } from './business-archived'
import { template as businessRestored } from './business-restored'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'signup-welcome': signupWelcome,
  'payment-receipt': paymentReceipt,
  'payment-failed': paymentFailed,
  'refund-issued': refundIssued,
  'subscription-renewed': subscriptionRenewed,
  'subscription-cancelled': subscriptionCancelled,
  'ad-inquiry-received': adInquiryReceived,
  'ad-inquiry-staff-notice': adInquiryStaffNotice,
  'ad-inquiry-reply': adInquiryReply,
  'team-invite': teamInvite,
  'team-new-lead': teamNewLead,
  'support-ticket-received': supportTicketReceived,
  'support-ticket-staff-notice': supportTicketStaffNotice,
  'booking-customer': bookingCustomer,
  'booking-owner': bookingOwner,
  'business-archived': businessArchived,
  'business-restored': businessRestored,
}

