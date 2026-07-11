import { SecurityAuditDashboard } from '@/components/admin/SecurityAuditDashboard';
import { Helmet } from 'react-helmet-async';

export default function SecurityAudit() {
  return (
    <>
      <Helmet>
        <title>Security Audit | Admin</title>
        <meta name="description" content="RLS Security audit dashboard for detecting and fixing policy issues" />
      </Helmet>
      <div className="container mx-auto py-6 px-4">
        <SecurityAuditDashboard />
      </div>
    </>
  );
}
