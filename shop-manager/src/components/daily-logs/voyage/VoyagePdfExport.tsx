import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { VoyageLog, VoyageCommunicationLog, VOYAGE_TYPE_LABELS, CALL_TYPE_LABELS, ACTIVITY_TYPE_LABELS, INCIDENT_TYPE_LABELS } from "@/types/voyage";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface VoyagePdfExportProps {
  voyage: VoyageLog;
  variant?: "icon" | "button";
}

export const VoyagePdfExport = ({ voyage, variant = "icon" }: VoyagePdfExportProps) => {
  const generatePdf = async () => {
    try {
      // Fetch communications for this voyage
      const { data: communications } = await supabase
        .from('voyage_communication_logs')
        .select('*')
        .eq('voyage_id', voyage.id)
        .order('communication_time', { ascending: true });

      // Fetch entered by profile name
      let enteredByName = "Unknown";
      if (voyage.entered_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', voyage.entered_by)
          .single();
        if (profile) {
          enteredByName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
        }
      }

      const doc = new jsPDF();
      let yPos = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      const contentWidth = pageWidth - margin * 2;

      // Header
      doc.setFillColor(30, 64, 175); // Blue header
      doc.rect(0, 0, pageWidth, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("VOYAGE LOG REPORT", pageWidth / 2, 15, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Transport Canada Compliant Documentation", pageWidth / 2, 23, { align: "center" });
      doc.text(`Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm')}`, pageWidth / 2, 30, { align: "center" });

      yPos = 45;
      doc.setTextColor(0, 0, 0);

      // Voyage Identification Section
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, contentWidth, 45, 'F');
      doc.setDrawColor(200, 200, 200);
      doc.rect(margin, yPos, contentWidth, 45, 'S');

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("VOYAGE IDENTIFICATION", margin + 5, yPos + 8);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const col1X = margin + 5;
      const col2X = margin + contentWidth / 2;

      doc.setFont("helvetica", "bold");
      doc.text("Voyage Number:", col1X, yPos + 18);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.voyage_number, col1X + 35, yPos + 18);

      doc.setFont("helvetica", "bold");
      doc.text("Vessel:", col2X, yPos + 18);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.vessel?.name || "N/A", col2X + 20, yPos + 18);

      doc.setFont("helvetica", "bold");
      doc.text("Departure:", col1X, yPos + 26);
      doc.setFont("helvetica", "normal");
      doc.text(`${format(new Date(voyage.departure_datetime), 'yyyy-MM-dd HH:mm')} from ${voyage.origin_location}`, col1X + 25, yPos + 26);

      doc.setFont("helvetica", "bold");
      doc.text("Arrival:", col2X, yPos + 26);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.arrival_datetime ? `${format(new Date(voyage.arrival_datetime), 'yyyy-MM-dd HH:mm')} at ${voyage.destination_location}` : "In Progress", col2X + 18, yPos + 26);

      doc.setFont("helvetica", "bold");
      doc.text("Voyage Type:", col1X, yPos + 34);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.voyage_type ? VOYAGE_TYPE_LABELS[voyage.voyage_type] : "N/A", col1X + 30, yPos + 34);

      doc.setFont("helvetica", "bold");
      doc.text("Status:", col2X, yPos + 34);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.voyage_status.replace('_', ' ').toUpperCase(), col2X + 18, yPos + 34);

      // Calculate duration
      if (voyage.departure_datetime && voyage.arrival_datetime) {
        const duration = new Date(voyage.arrival_datetime).getTime() - new Date(voyage.departure_datetime).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        doc.setFont("helvetica", "bold");
        doc.text("Duration:", col1X, yPos + 42);
        doc.setFont("helvetica", "normal");
        doc.text(`${hours}h ${minutes}m`, col1X + 22, yPos + 42);
      }

      yPos += 55;

      // Personnel Section
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("PERSONNEL", margin, yPos);
      yPos += 6;

      (doc as any).autoTable({
        startY: yPos,
        head: [['Role', 'Name']],
        body: [
          ['Master/Captain', voyage.master_name],
          ...voyage.crew_members.map(crew => [crew.role, crew.name])
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin },
        tableWidth: contentWidth / 2 - 5
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Cargo/Tow Details (if applicable)
      if (voyage.cargo_description || voyage.barge_name) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("CARGO / TOW DETAILS", margin, yPos);
        yPos += 6;

        const cargoData = [];
        if (voyage.barge_name) cargoData.push(['Barge Name', voyage.barge_name]);
        if (voyage.cargo_description) cargoData.push(['Cargo Description', voyage.cargo_description]);
        if (voyage.cargo_weight) cargoData.push(['Cargo Weight', `${voyage.cargo_weight} ${voyage.cargo_weight_unit}`]);

        (doc as any).autoTable({
          startY: yPos,
          body: cargoData,
          theme: 'grid',
          bodyStyles: { fontSize: 9 },
          margin: { left: margin, right: margin },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
        });

        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Equipment Readings
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("EQUIPMENT READINGS", margin, yPos);
      yPos += 6;

      const engineHoursUsed = (voyage.engine_hours_end && voyage.engine_hours_start) 
        ? (voyage.engine_hours_end - voyage.engine_hours_start).toFixed(1) 
        : 'N/A';
      const fuelConsumed = (voyage.fuel_start && voyage.fuel_end) 
        ? (voyage.fuel_start - voyage.fuel_end).toFixed(1) 
        : 'N/A';

      (doc as any).autoTable({
        startY: yPos,
        head: [['Metric', 'Start', 'End', 'Used/Consumed']],
        body: [
          ['Engine Hours', voyage.engine_hours_start?.toString() || 'N/A', voyage.engine_hours_end?.toString() || 'N/A', engineHoursUsed],
          ['Fuel Level', voyage.fuel_start ? `${voyage.fuel_start} ${voyage.fuel_unit}` : 'N/A', voyage.fuel_end ? `${voyage.fuel_end} ${voyage.fuel_unit}` : 'N/A', fuelConsumed !== 'N/A' ? `${fuelConsumed} ${voyage.fuel_unit}` : 'N/A']
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 64, 175], fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        margin: { left: margin, right: margin }
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Weather Conditions
      if (voyage.weather_conditions && Object.keys(voyage.weather_conditions).length > 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("WEATHER CONDITIONS", margin, yPos);
        yPos += 6;

        const weather = voyage.weather_conditions;
        const weatherData = [];
        if (weather.wind_speed) weatherData.push(['Wind Speed', `${weather.wind_speed} knots`]);
        if (weather.wind_direction) weatherData.push(['Wind Direction', weather.wind_direction]);
        if (weather.visibility) weatherData.push(['Visibility', weather.visibility]);
        if (weather.sea_state) weatherData.push(['Sea State', weather.sea_state]);
        if (weather.temperature) weatherData.push(['Temperature', `${weather.temperature}°C`]);
        if (weather.precipitation) weatherData.push(['Precipitation', weather.precipitation]);

        if (weatherData.length > 0) {
          (doc as any).autoTable({
            startY: yPos,
            body: weatherData,
            theme: 'grid',
            bodyStyles: { fontSize: 9 },
            margin: { left: margin, right: margin },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } }
          });
          yPos = (doc as any).lastAutoTable.finalY + 10;
        }
      }

      // Check for page break
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      // Communications Log (Critical for Transport Canada)
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 64, 175);
      doc.text("COMMUNICATIONS LOG", margin, yPos);
      doc.setTextColor(0, 0, 0);
      yPos += 6;

      if (communications && communications.length > 0) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['Time', 'Channel', 'Station', 'Type', 'Direction', 'Summary']],
          body: communications.map((comm: VoyageCommunicationLog) => [
            format(new Date(comm.communication_time), 'HH:mm'),
            comm.channel || '-',
            comm.contact_station || '-',
            comm.call_type ? CALL_TYPE_LABELS[comm.call_type] : '-',
            comm.direction || '-',
            comm.message_summary || '-'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [30, 64, 175], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
          columnStyles: { 5: { cellWidth: 50 } }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("No communications logged for this voyage.", margin, yPos);
        yPos += 10;
      }

      // Activity Log
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("ACTIVITY LOG", margin, yPos);
      yPos += 6;

      if (voyage.activity_log && voyage.activity_log.length > 0) {
        (doc as any).autoTable({
          startY: yPos,
          head: [['Time', 'Type', 'Description', 'Location']],
          body: voyage.activity_log.map(activity => [
            format(new Date(activity.timestamp), 'yyyy-MM-dd HH:mm'),
            ACTIVITY_TYPE_LABELS[activity.type] || activity.type,
            activity.description,
            activity.location || '-'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [30, 64, 175], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      } else {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.text("No activities logged for this voyage.", margin, yPos);
        yPos += 10;
      }

      // Incidents Section
      if (voyage.has_incidents && voyage.incidents && voyage.incidents.length > 0) {
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38); // Red for incidents
        doc.text("⚠ INCIDENTS REPORTED", margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 6;

        (doc as any).autoTable({
          startY: yPos,
          head: [['Time', 'Type', 'Severity', 'Description', 'Resolution', 'Reported By']],
          body: voyage.incidents.map(incident => [
            format(new Date(incident.timestamp), 'yyyy-MM-dd HH:mm'),
            INCIDENT_TYPE_LABELS[incident.type] || incident.type,
            incident.severity.toUpperCase(),
            incident.description,
            incident.resolution || 'Pending',
            incident.reported_by || '-'
          ]),
          theme: 'grid',
          headStyles: { fillColor: [220, 38, 38], fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
          didParseCell: (data: any) => {
            if (data.column.index === 2) {
              const severity = data.cell.raw;
              if (severity === 'CRITICAL' || severity === 'HIGH') {
                data.cell.styles.textColor = [220, 38, 38];
                data.cell.styles.fontStyle = 'bold';
              } else if (severity === 'MEDIUM') {
                data.cell.styles.textColor = [217, 119, 6];
              }
            }
          }
        });
        yPos = (doc as any).lastAutoTable.finalY + 10;
      }

      // Notes
      if (voyage.notes) {
        if (yPos > 230) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("NOTES", margin, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const splitNotes = doc.splitTextToSize(voyage.notes, contentWidth);
        doc.text(splitNotes, margin, yPos);
        yPos += splitNotes.length * 5 + 10;
      }

      // Certification Section
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(240, 248, 255);
      doc.rect(margin, yPos, contentWidth, 50, 'F');
      doc.setDrawColor(30, 64, 175);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPos, contentWidth, 50, 'S');

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("MASTER'S CERTIFICATION", margin + 5, yPos + 8);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("I hereby certify that this voyage log is a true and accurate record of the voyage as required by Transport Canada regulations.", margin + 5, yPos + 16);

      // Master Signature
      doc.setFont("helvetica", "bold");
      doc.text("Master Name:", margin + 5, yPos + 28);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.master_name, margin + 35, yPos + 28);

      if (voyage.master_signature) {
        doc.setFont("helvetica", "bold");
        doc.text("Signature:", margin + 5, yPos + 36);
        try {
          doc.addImage(voyage.master_signature, 'PNG', margin + 30, yPos + 30, 40, 15);
        } catch (e) {
          doc.setFont("helvetica", "italic");
          doc.text("[Signature on file]", margin + 30, yPos + 36);
        }
      }

      doc.setFont("helvetica", "bold");
      doc.text("Confirmed:", col2X, yPos + 28);
      doc.setFont("helvetica", "normal");
      doc.text(voyage.confirmed_at ? format(new Date(voyage.confirmed_at), 'yyyy-MM-dd HH:mm') : 'Pending', col2X + 25, yPos + 28);

      doc.setFont("helvetica", "bold");
      doc.text("Entered By:", col2X, yPos + 36);
      doc.setFont("helvetica", "normal");
      doc.text(enteredByName, col2X + 25, yPos + 36);

      // Footer on all pages
      const pageCount = doc.internal.pages.length - 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Page ${i} of ${pageCount} | Voyage Log: ${voyage.voyage_number} | Transport Canada Compliant`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save the PDF
      const filename = `Voyage_Log_${voyage.voyage_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      doc.save(filename);
      toast.success("Voyage log PDF exported successfully");

    } catch (error) {
      console.error('Error generating voyage PDF:', error);
      toast.error("Failed to generate PDF");
    }
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={generatePdf}
        title="Export PDF"
      >
        <FileDown className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button onClick={generatePdf} variant="outline" size="sm">
      <FileDown className="h-4 w-4 mr-2" />
      Export PDF
    </Button>
  );
};
