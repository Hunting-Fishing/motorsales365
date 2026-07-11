import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { ProjectBudget } from "@/types/projectBudget";
import { toast } from "sonner";

interface ProjectCsvExportProps {
  project: ProjectBudget;
}

export const ProjectCsvExport = ({ project }: ProjectCsvExportProps) => {
  const exportBudgetCsv = () => {
    try {
      const rows: string[][] = [];
      
      // Header info
      rows.push(['Project Budget Export']);
      rows.push(['Project Name', project.project_name]);
      rows.push(['Project Code', project.project_code || '']);
      rows.push(['Status', project.status]);
      rows.push(['']);
      
      // Budget Summary
      rows.push(['Budget Summary']);
      rows.push(['Item', 'Amount']);
      rows.push(['Original Budget', String(project.original_budget)]);
      rows.push(['Approved Budget', String(project.approved_budget || project.original_budget)]);
      rows.push(['Current Budget', String(project.current_budget || project.original_budget)]);
      rows.push(['Contingency Amount', String(project.contingency_amount)]);
      rows.push(['Contingency %', String(project.contingency_percent)]);
      rows.push(['Committed', String(project.committed_amount)]);
      rows.push(['Actual Spent', String(project.actual_spent)]);
      rows.push(['']);

      // Phases
      if (project.phases && project.phases.length > 0) {
        rows.push(['Phases']);
        rows.push(['Phase Name', 'Status', 'Progress %', 'Budget', 'Spent', 'Planned Start', 'Planned End']);
        project.phases.forEach(phase => {
          rows.push([
            phase.phase_name,
            phase.status,
            String(phase.percent_complete),
            String(phase.phase_budget),
            String(phase.actual_spent),
            phase.planned_start || '',
            phase.planned_end || '',
          ]);
        });
        rows.push(['']);
      }

      // Cost Items
      if (project.cost_items && project.cost_items.length > 0) {
        rows.push(['Cost Items']);
        rows.push(['Category', 'Description', 'Budgeted', 'Committed', 'Spent', 'Variance']);
        project.cost_items.forEach(item => {
          rows.push([
            item.category,
            item.description || '',
            String(item.budgeted_amount),
            String(item.committed_amount),
            String(item.actual_spent),
            String(item.budgeted_amount - item.actual_spent),
          ]);
        });
        rows.push(['']);
      }

      // Change Orders
      if (project.change_orders && project.change_orders.length > 0) {
        rows.push(['Change Orders']);
        rows.push(['CO Number', 'Reason', 'Status', 'Amount Change', 'Original Budget', 'New Budget', 'Requested At']);
        project.change_orders.forEach(co => {
          rows.push([
            co.change_order_number,
            co.reason,
            co.status,
            String(co.amount_change),
            String(co.original_budget || ''),
            String(co.new_budget || ''),
            co.requested_at,
          ]);
        });
      }

      // Convert to CSV string
      const csvContent = rows.map(row => 
        row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${project.project_code || project.project_name}_budget.csv`;
      link.click();
      
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('Failed to export CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={exportBudgetCsv}>
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  );
};
