
import React from "react";
import { Layout } from "@/components/layout/Layout";

interface CustomersLayoutProps {
  children: React.ReactNode;
}

export function CustomersLayout({ children }: CustomersLayoutProps) {
  return (
    <Layout>
      <div className="space-y-6">
        {children}
      </div>
    </Layout>
  );
}
