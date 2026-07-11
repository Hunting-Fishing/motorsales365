import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  Calendar,
  Clock, 
  AlertTriangle,
  RotateCcw,
  User,
  CheckCircle,
  FileText,
  Eye,
  Edit,
  RefreshCw
} from 'lucide-react';
import { useDailyWorkOrders } from '@/hooks/work-orders/useDailyWorkOrders';

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'in_progress': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'assigned': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'urgent': return 'bg-red-100 text-red-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'low': return 'bg-green-100 text-green-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export function DailyWorkOrdersDashboard() {
  const { dailyData, loading, error, refetch } = useDailyWorkOrders();
  const [activeTab, setActiveTab] = useState<'today' | 'overdue' | 'carryOvers'>('today');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 rounded-lg">
        <AlertTriangle className="h-4 w-4" />
        <span>Failed to load daily data: {error}</span>
        <button onClick={refetch} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const currentData = dailyData[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Daily Work Orders</h3>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('today')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{dailyData.totalToday}</div>
            <div className="text-sm text-muted-foreground">Today's Schedule</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('overdue')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{dailyData.totalOverdue}</div>
            <div className="text-sm text-muted-foreground">Overdue</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('carryOvers')}>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{dailyData.totalCarryOvers}</div>
            <div className="text-sm text-muted-foreground">Carry Overs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{dailyData.completedToday}</div>
            <div className="text-sm text-muted-foreground">Completed Today</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'today'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Calendar className="h-4 w-4 inline mr-2" />
          Today ({dailyData.totalToday})
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'overdue'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Overdue ({dailyData.totalOverdue})
        </button>
        <button
          onClick={() => setActiveTab('carryOvers')}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'carryOvers'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <RotateCcw className="h-4 w-4 inline mr-2" />
          Carry Overs ({dailyData.totalCarryOvers})
        </button>
      </div>

      {/* Work Orders List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {activeTab === 'today' && <Calendar className="h-4 w-4" />}
            {activeTab === 'overdue' && <AlertTriangle className="h-4 w-4" />}
            {activeTab === 'carryOvers' && <RotateCcw className="h-4 w-4" />}
            {activeTab === 'today' && "Today's Work Orders"}
            {activeTab === 'overdue' && 'Overdue Work Orders'}
            {activeTab === 'carryOvers' && 'Carry Over Work Orders'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No work orders found for this category</p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentData.map((workOrder) => (
                <div 
                  key={workOrder.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {workOrder.work_order_number}
                      </h4>
                      <Badge className={getStatusColor(workOrder.status)}>
                        {workOrder.status}
                      </Badge>
                      <Badge className={getPriorityColor(workOrder.priority)}>
                        {workOrder.priority}
                      </Badge>
                      {workOrder.days_overdue && (
                        <Badge className="bg-red-100 text-red-800">
                          {workOrder.days_overdue} days overdue
                        </Badge>
                      )}
                      {workOrder.is_carry_over && (
                        <Badge className="bg-orange-100 text-orange-800">
                          Carry Over
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {workOrder.description}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {workOrder.customer_name}
                      </span>
                      {workOrder.technician_name && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Tech: {workOrder.technician_name}
                        </span>
                      )}
                      {workOrder.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(workOrder.start_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      )}
                      {workOrder.estimated_hours && (
                        <span>Est: {workOrder.estimated_hours}h</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}