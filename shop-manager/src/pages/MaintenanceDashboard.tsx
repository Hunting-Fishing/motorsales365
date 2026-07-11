
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchEquipment, getOverdueMaintenanceEquipment } from "@/services/equipmentService";
import type { EquipmentWithMaintenance } from "@/services/equipmentService";
import { getUpcomingMaintenanceSchedules } from "@/utils/maintenanceScheduler";
import { 
  MaintenanceHeader, 
  MaintenanceAlerts, 
  MaintenanceStats,
  UpcomingMaintenanceTable,
  MaintenanceHistoryTable,
  MaintenanceScheduler 
} from "@/components/maintenance";

export default function MaintenanceDashboard() {
  const [timeframe, setTimeframe] = useState<"upcoming" | "all">("upcoming");
  const [filterStatus, setFilterStatus] = useState<"all" | "overdue" | "scheduled">("all");
  const [equipment, setEquipment] = useState<EquipmentWithMaintenance[]>([]);
  const [overdueEquipment, setOverdueEquipment] = useState<EquipmentWithMaintenance[]>([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Load equipment data
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [equipmentData, overdueData] = await Promise.all([
          fetchEquipment(),
          getOverdueMaintenanceEquipment()
        ]);
        
        setEquipment(equipmentData);
        setOverdueEquipment(overdueData);
        
        // Get upcoming maintenance schedules (next 30 days)
        const upcoming = getUpcomingMaintenanceSchedules(equipmentData, 30);
        setUpcomingMaintenance(upcoming);
      } catch (error) {
        console.error("Error loading maintenance dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-slate-500">Loading maintenance data...</div>
      </div>
    );
  }

  // Calculate maintenance statistics
  const today = new Date();
  const totalScheduled = equipment.filter(item => item.next_maintenance_date).length;
  
  const totalOverdue = overdueEquipment.length;
  
  const upcomingCount = upcomingMaintenance.length;
  
  // Calculate completed count from equipment maintenance history
  const completedCount = equipment.reduce((count, item) => {
    if (!item.maintenance_history) return count;
    return count + item.maintenance_history.filter(record => 
      new Date(record.date).getTime() > today.getTime() - (30 * 24 * 60 * 60 * 1000)
    ).length;
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <MaintenanceHeader 
        totalScheduled={totalScheduled}
        totalOverdue={totalOverdue}
      />
      
      {/* Maintenance Stats */}
      <MaintenanceStats 
        totalScheduled={totalScheduled}
        totalOverdue={totalOverdue}
        upcomingCount={upcomingCount}
        completedCount={completedCount}
      />
      
      {/* Alerts for overdue maintenance */}
      <MaintenanceAlerts overdueEquipment={overdueEquipment} />
      
      {/* Main content tabs */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Maintenance</TabsTrigger>
          <TabsTrigger value="scheduler">Maintenance Scheduler</TabsTrigger>
          <TabsTrigger value="history">Maintenance History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-4">
          <UpcomingMaintenanceTable 
            upcomingMaintenance={upcomingMaintenance}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
          />
        </TabsContent>
        
        <TabsContent value="scheduler" className="space-y-4">
          <MaintenanceScheduler />
        </TabsContent>
        
        <TabsContent value="history" className="space-y-4">
          <MaintenanceHistoryTable 
            equipment={equipment}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
