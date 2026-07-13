import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { FileText, Download, Share2, Mail, Loader2, QrCode } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InspectionItem {
  itemName: string;
  category: string;
  status: string | null;
  notes: string;
}

interface InspectionPdfExportProps {
  inspectionId: string;
  inspectionDate: string;
  inspectorName: string;
  vesselName: string;
  overallStatus: string;
  safeToOperate: boolean;
  currentHours?: number | null;
  generalNotes?: string;
  signatureData?: string | null;
  items: InspectionItem[];
}

export function InspectionPdfExport({
  inspectionId,
  inspectionDate,
  inspectorName,
  vesselName,
  overallStatus,
  safeToOperate,
  currentHours,
  generalNotes,
  signatureData,
  items
}: InspectionPdfExportProps) {
  const [generating, setGenerating] = useState(false);

  const generatePdf = (): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Vessel Inspection Report', pageWidth / 2, 20, { align: 'center' });

    // Inspection info box
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const infoY = 35;
    doc.setFillColor(245, 245, 245);
    doc.rect(14, infoY - 5, pageWidth - 28, 35, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.text('Vessel:', 20, infoY + 5);
    doc.text('Inspector:', 20, infoY + 12);
    doc.text('Date:', 20, infoY + 19);
    doc.text('Hours:', 20, infoY + 26);
    
    doc.text('Status:', pageWidth / 2, infoY + 5);
    doc.text('Safe to Operate:', pageWidth / 2, infoY + 12);
    doc.text('Report ID:', pageWidth / 2, infoY + 19);
    
    doc.setFont('helvetica', 'normal');
    doc.text(vesselName, 50, infoY + 5);
    doc.text(inspectorName, 50, infoY + 12);
    doc.text(format(new Date(inspectionDate), 'MMM dd, yyyy HH:mm'), 50, infoY + 19);
    doc.text(currentHours ? `${currentHours}` : 'N/A', 50, infoY + 26);
    
    doc.text(overallStatus.toUpperCase(), pageWidth / 2 + 35, infoY + 5);
    doc.text(safeToOperate ? 'YES' : 'NO', pageWidth / 2 + 35, infoY + 12);
    doc.text(inspectionId.slice(0, 8), pageWidth / 2 + 35, infoY + 19);

    // Status color indicator
    const statusColor = safeToOperate 
      ? [34, 197, 94] as [number, number, number]
      : [239, 68, 68] as [number, number, number];
    doc.setFillColor(...statusColor);
    doc.circle(pageWidth - 25, infoY + 15, 8, 'F');

    // Items table
    const tableData = items
      .filter(item => item.status)
      .map(item => [
        item.category,
        item.itemName,
        item.status?.toUpperCase() || '-',
        item.notes || '-'
      ]);

    autoTable(doc, {
      startY: infoY + 40,
      head: [['Category', 'Item', 'Status', 'Notes']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 25 },
        3: { cellWidth: 'auto' }
      },
      didParseCell: (data) => {
        if (data.column.index === 2 && data.section === 'body') {
          const status = data.cell.raw as string;
          if (status === 'GOOD') {
            data.cell.styles.textColor = [34, 197, 94];
          } else if (status === 'ATTENTION') {
            data.cell.styles.textColor = [234, 179, 8];
          } else if (status === 'BAD') {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    // General notes
    const finalY = (doc as any).lastAutoTable?.finalY || infoY + 40;
    
    if (generalNotes) {
      doc.setFont('helvetica', 'bold');
      doc.text('General Notes:', 14, finalY + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const splitNotes = doc.splitTextToSize(generalNotes, pageWidth - 28);
      doc.text(splitNotes, 14, finalY + 17);
    }

    // Signature
    if (signatureData) {
      const sigY = finalY + (generalNotes ? 35 : 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Inspector Signature:', 14, sigY);
      
      try {
        doc.addImage(signatureData, 'PNG', 14, sigY + 2, 60, 20);
      } catch (e) {
        console.error('Error adding signature to PDF:', e);
      }
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, footerY);
    doc.text(`Page 1 of 1`, pageWidth - 14, footerY, { align: 'right' });

    return doc;
  };

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const doc = generatePdf();
      const fileName = `inspection-${vesselName.replace(/\s+/g, '-')}-${format(new Date(inspectionDate), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      toast({ title: 'PDF downloaded successfully' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error generating PDF',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleShare = async () => {
    setGenerating(true);
    try {
      const doc = generatePdf();
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `inspection-${inspectionId.slice(0, 8)}.pdf`, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Vessel Inspection Report - ${vesselName}`,
          text: `Inspection report for ${vesselName} on ${format(new Date(inspectionDate), 'MMM dd, yyyy')}`,
          files: [file]
        });
      } else {
        // Fallback: copy link or download
        handleDownload();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing PDF:', error);
        toast({
          title: 'Share failed',
          description: 'Downloading PDF instead',
          variant: 'default'
        });
        handleDownload();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-1" />
          )}
          Export PDF
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
