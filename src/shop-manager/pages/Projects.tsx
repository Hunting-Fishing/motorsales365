import { ProjectBudgetDashboard } from '@sm/components/projects/ProjectBudgetDashboard';
import { ResourceConflictAlert } from '@sm/components/projects/ResourceConflictAlert';
import { UpcomingMilestones } from '@sm/components/projects/UpcomingMilestones';
import { useMilestoneNotifications } from '@sm/hooks/useMilestoneNotifications';

export default function Projects() {
  const { overdueCount, approachingCount } = useMilestoneNotifications();
  const hasMilestoneAlerts = overdueCount > 0 || approachingCount > 0;

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <ResourceConflictAlert />
      
      {/* Show upcoming milestones widget if there are alerts */}
      {hasMilestoneAlerts && (
        <UpcomingMilestones limit={5} compact />
      )}
      
      <ProjectBudgetDashboard />
    </div>
  );
}
