import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { ProjectBudget } from "@/types/projectBudget";
import { format } from "date-fns";
import { toast } from "sonner";

interface ProjectPdfExportProps {
  project: ProjectBudget;
}

export const ProjectPdfExport = ({ project }: ProjectPdfExportProps) => {
  const generatePdf = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(33, 33, 33);
      doc.text(project.project_name, 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Project Code: ${project.project_code || 'N/A'}`, 14, yPos);
      doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, pageWidth - 14, yPos, { align: 'right' });
      yPos += 10;

      // Status badge
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      const statusColor = getStatusColor(project.status);
      doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      doc.roundedRect(14, yPos - 4, 30, 7, 2, 2, 'F');
      doc.text(project.status.toUpperCase(), 16, yPos);
      yPos += 15;

      // Budget Summary Section
      doc.setFontSize(14);
      doc.setTextColor(33, 33, 33);
      doc.text('Budget Summary', 14, yPos);
      yPos += 8;

      const budgetData = [
        ['Original Budget', formatCurrency(project.original_budget)],
        ['Approved Budget', formatCurrency(project.approved_budget || project.original_budget)],
        ['Current Budget', formatCurrency(project.current_budget || project.original_budget)],
        ['Contingency', `${formatCurrency(project.contingency_amount)} (${project.contingency_percent}%)`],
        ['Committed', formatCurrency(project.committed_amount)],
        ['Actual Spent', formatCurrency(project.actual_spent)],
        ['Remaining', formatCurrency((project.current_budget || project.original_budget) - project.actual_spent)],
      ];

      doc.autoTable({
        startY: yPos,
        head: [['Item', 'Amount']],
        body: budgetData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
        margin: { left: 14, right: 14 },
        tableWidth: 100,
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Earned Value Metrics
      if (project.phases && project.phases.length > 0) {
        doc.setFontSize(14);
        doc.text('Earned Value Analysis', 14, yPos);
        yPos += 8;

        const totalBudget = project.current_budget || project.original_budget;
        const totalPlannedValue = project.phases.reduce((sum, p) => sum + p.phase_budget, 0);
        const earnedValue = project.phases.reduce((sum, p) => sum + (p.phase_budget * p.percent_complete / 100), 0);
        const actualCost = project.actual_spent;
        const spi = totalPlannedValue > 0 ? earnedValue / totalPlannedValue : 0;
        const cpi = actualCost > 0 ? earnedValue / actualCost : 0;

        const evData = [
          ['Planned Value (PV)', formatCurrency(totalPlannedValue)],
          ['Earned Value (EV)', formatCurrency(earnedValue)],
          ['Actual Cost (AC)', formatCurrency(actualCost)],
          ['Schedule Performance Index (SPI)', spi.toFixed(2)],
          ['Cost Performance Index (CPI)', cpi.toFixed(2)],
        ];

        doc.autoTable({
          startY: yPos,
          head: [['Metric', 'Value']],
          body: evData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 14, right: 14 },
          tableWidth: 100,
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Phases Section
      if (project.phases && project.phases.length > 0) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Project Phases', 14, yPos);
        yPos += 8;

        const phaseData = project.phases.map(phase => [
          phase.phase_name,
          phase.status,
          `${phase.percent_complete}%`,
          formatCurrency(phase.phase_budget),
          formatCurrency(phase.actual_spent),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Phase', 'Status', 'Progress', 'Budget', 'Spent']],
          body: phaseData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Cost Items Section
      if (project.cost_items && project.cost_items.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Cost Breakdown', 14, yPos);
        yPos += 8;

        const costData = project.cost_items.map(item => [
          item.category,
          item.description || '-',
          formatCurrency(item.budgeted_amount),
          formatCurrency(item.actual_spent),
          formatCurrency(item.budgeted_amount - item.actual_spent),
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['Category', 'Description', 'Budgeted', 'Spent', 'Variance']],
          body: costData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 14, right: 14 },
        });

        yPos = (doc as any).lastAutoTable.finalY + 15;
      }

      // Change Orders Section
      if (project.change_orders && project.change_orders.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(14);
        doc.text('Change Orders', 14, yPos);
        yPos += 8;

        const changeData = project.change_orders.map(co => [
          co.change_order_number,
          co.reason,
          co.status,
          formatCurrency(co.amount_change),
          co.approved_at ? format(new Date(co.approved_at), 'MMM d, yyyy') : '-',
        ]);

        doc.autoTable({
          startY: yPos,
          head: [['CO #', 'Reason', 'Status', 'Amount', 'Approved']],
          body: changeData,
          theme: 'striped',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 14, right: 14 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      doc.save(`${project.project_code || project.project_name}_report.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={generatePdf}>
      <FileDown className="h-4 w-4 mr-2" />
      Export PDF
    </Button>
  );
};

const formatCurrency = (value: number | null | undefined): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return { r: 34, g: 197, b: 94 };
    case 'in_progress': return { r: 234, g: 179, b: 8 };
    case 'approved': return { r: 59, g: 130, b: 246 };
    case 'on_hold': return { r: 249, g: 115, b: 22 };
    case 'cancelled': return { r: 239, g: 68, b: 68 };
    default: return { r: 107, g: 114, b: 128 };
  }
};
