import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

import { template as signupWelcome } from './signup-welcome'
import { template as paymentReceipt } from './payment-receipt'
import { template as paymentFailed } from './payment-failed'
import { template as refundIssued } from './refund-issued'
import { template as subscriptionRenewed } from './subscription-renewed'
import { template as subscriptionCancelled } from './subscription-cancelled'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'signup-welcome': signupWelcome,
  'payment-receipt': paymentReceipt,
  'payment-failed': paymentFailed,
  'refund-issued': refundIssued,
  'subscription-renewed': subscriptionRenewed,
  'subscription-cancelled': subscriptionCancelled,
}
