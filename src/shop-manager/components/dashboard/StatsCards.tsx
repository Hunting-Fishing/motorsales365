import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wrench, Package, Clock, TrendingUp, TrendingDown, Wifi, WifiOff } from "lucide-react";
import { DashboardStats } from "@/services/dashboard/statsService";
import { useDashboardData } from "@/hooks/useDashboardData";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedList } from "@/components/ui/animated-list";
import { motion } from "framer-motion";

export function StatsCards() {
  const { stats, isLoading, lastUpdated } = useDashboardData();
  
  // Show real-time status indicator
  const isRealtimeActive = Date.now() - lastUpdated.getTime() < 60000; // Active if updated within 1 minute

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-slate-300 rounded-full animate-pulse" />
            Loading dashboard data...
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-white shadow-sm border-slate-200/60">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <div className="h-4 bg-slate-200 rounded animate-pulse w-20" />
                </CardTitle>
                <div className="h-4 w-4 bg-slate-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-slate-200 rounded animate-pulse mb-2" />
                <div className="h-3 bg-slate-200 rounded animate-pulse w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const getChangeIcon = (change: string) => {
    if (change.includes('+')) return <TrendingUp className="h-3 w-3 text-emerald-600" />;
    if (change.includes('-')) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return null;
  };

  const getChangeColor = (change: string) => {
    if (change.includes('+')) return 'text-emerald-600';
    if (change.includes('-')) return 'text-red-500';
    return 'text-slate-500';
  };

  const statsData = [
    {
      title: "Active Work Orders",
      value: stats.activeWorkOrders,
      change: stats.workOrderChange,
      icon: Wrench,
      color: "bg-blue-500",
      bgGradient: "from-blue-50 to-blue-100/50"
    },
    {
      title: "Team Members",
      value: stats.teamMembers,
      change: stats.teamChange,
      icon: Users,
      color: "bg-emerald-500",
      bgGradient: "from-emerald-50 to-emerald-100/50"
    },
    {
      title: "Inventory Items",
      value: stats.inventoryItems,
      change: stats.inventoryChange,
      icon: Package,
      color: "bg-orange-500",
      bgGradient: "from-orange-50 to-orange-100/50"
    },
    {
      title: "Avg Completion Time",
      value: stats.avgCompletionTime,
      change: stats.completionTimeChange,
      icon: Clock,
      color: "bg-purple-500",
      bgGradient: "from-purple-50 to-purple-100/50"
    }
  ];

  return (
    <div className="space-y-4" data-tour="dashboard-stats">
      {/* Real-time status indicator */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <div className="flex items-center gap-1">
          {isRealtimeActive ? (
            <>
              <Wifi className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-600">Live data</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-amber-500" />
              <span className="text-amber-600">Data from cache</span>
            </>
          )}
          <span className="text-slate-400">•</span>
          <span>Updated {lastUpdated.toLocaleTimeString()}</span>
        </div>
      </div>
      
      <AnimatedList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6" variant="scale" staggerDelay={0.08}>
        {statsData.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <motion.div 
              key={index}
              whileHover={{ y: -4, scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Card className="bg-white shadow-sm border-slate-200/60 hover:shadow-lg transition-shadow duration-200 overflow-hidden group">
                <div className={`h-1 bg-gradient-to-r ${stat.bgGradient} group-hover:h-1.5 transition-all duration-300`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4">
                  <CardTitle className="text-sm font-medium text-slate-700">
                    {stat.title}
                  </CardTitle>
                  <motion.div 
                    className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                    transition={{ duration: 0.4 }}
                  >
                    <IconComponent className={`h-4 w-4 ${stat.color.replace('bg-', 'text-')}`} />
                  </motion.div>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="text-2xl font-bold text-slate-900 mb-1">
                    {typeof stat.value === 'number' ? (
                      <NumberTicker value={stat.value} delay={index * 0.1} />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className={`text-xs flex items-center gap-1 ${getChangeColor(stat.change)}`}>
                    {getChangeIcon(stat.change)}
                    {stat.change} from last month
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatedList>
    </div>
  );
}
