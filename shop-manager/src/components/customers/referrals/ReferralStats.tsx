
import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Customer } from "@/types/customer";
import { CustomerReferralView } from "@/types/referral";
import { 
  UserCheck, 
  Clock, 
  Users, 
  TrendingUp, 
  Award 
} from "lucide-react";

interface ReferralStatsProps {
  customer: Customer;
  referrals: CustomerReferralView[];
}

export const ReferralStats: React.FC<ReferralStatsProps> = ({ customer, referrals }) => {
  // Calculate referral stats
  const totalReferrals = referrals.length;
  const convertedReferrals = referrals.filter(ref => ref.status === 'converted').length;
  const pendingReferrals = referrals.filter(ref => ref.status === 'pending').length;
  const conversionRate = totalReferrals > 0 
    ? Math.round((convertedReferrals / totalReferrals) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard 
        title="Total Referrals" 
        value={totalReferrals.toString()} 
        icon={<Users className="h-5 w-5 text-blue-500" />} 
        description="Total customers referred" 
      />
      <StatCard 
        title="Converted" 
        value={convertedReferrals.toString()} 
        icon={<UserCheck className="h-5 w-5 text-green-500" />} 
        description="Successful referrals" 
      />
      <StatCard 
        title="Pending" 
        value={pendingReferrals.toString()} 
        icon={<Clock className="h-5 w-5 text-amber-500" />} 
        description="Waiting for conversion" 
      />
      <StatCard 
        title="Conversion Rate" 
        value={`${conversionRate}%`} 
        icon={<TrendingUp className="h-5 w-5 text-purple-500" />} 
        description="Success percentage" 
      />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description }) => (
  <Card className="p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="bg-slate-100 p-3 rounded-full">{icon}</div>
    </div>
  </Card>
);
