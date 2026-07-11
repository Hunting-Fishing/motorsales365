
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  User, Building2, Phone, Mail, MapPin, Tag, Car, 
  Calendar, FileText, Clock, Printer, Download
} from "lucide-react";
import { Customer, CustomerVehicle } from "@/types/customer";
import { formatPhoneNumber } from "@/utils/formatters";
import { customerToVcard } from "@/utils/export/customerExport";
import { useToast } from "@/hooks/use-toast";

interface EnhancedCustomerPreviewProps {
  customer: Customer;
  workOrderCount?: number;
  lastServiceDate?: string;
}

export const EnhancedCustomerPreview: React.FC<EnhancedCustomerPreviewProps> = ({ 
  customer,
  workOrderCount = 0,
  lastServiceDate
}) => {
  const { toast } = useToast();
  const fullName = `${customer.first_name} ${customer.last_name}`;
  
  const handlePrint = () => {
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Could not open print window. Please check your pop-up settings.",
        variant: "destructive",
      });
      return;
    }

    // Generate the print content
    printWindow.document.write(`
      <html>
        <head>
          <title>Customer Details - ${fullName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; margin-bottom: 10px; }
            .section { margin-bottom: 20px; }
            .label { font-weight: bold; color: #555; }
            .container { max-width: 800px; margin: 0 auto; }
            .info-item { margin-bottom: 5px; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>${fullName}</h1>
            ${customer.company ? `<div><span class="label">Company:</span> ${customer.company}</div>` : ''}
            
            <div class="section">
              <h2>Contact Information</h2>
              ${customer.phone ? `<div class="info-item"><span class="label">Phone:</span> ${formatPhoneNumber(customer.phone)}</div>` : ''}
              ${customer.email ? `<div class="info-item"><span class="label">Email:</span> ${customer.email}</div>` : ''}
              ${customer.address ? `<div class="info-item"><span class="label">Address:</span> ${customer.address}</div>` : ''}
            </div>
            
            ${customer.tags && customer.tags.length > 0 ? `
              <div class="section">
                <h2>Tags</h2>
                <div>${customer.tags.join(', ')}</div>
              </div>
            ` : ''}
            
            ${customer.vehicles && customer.vehicles.length > 0 ? `
              <div class="section">
                <h2>Vehicles</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Make</th>
                      <th>Model</th>
                      <th>VIN</th>
                      <th>License Plate</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${customer.vehicles.map((vehicle: CustomerVehicle) => `
                      <tr>
                        <td>${vehicle.year || ''}</td>
                        <td>${vehicle.make || ''}</td>
                        <td>${vehicle.model || ''}</td>
                        <td>${vehicle.vin || ''}</td>
                        <td>${vehicle.license_plate || ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}
            
            <div class="section">
              <h2>Service Information</h2>
              <div class="info-item"><span class="label">Work Orders:</span> ${workOrderCount}</div>
              ${lastServiceDate ? `<div class="info-item"><span class="label">Last Service:</span> ${new Date(lastServiceDate).toLocaleDateString()}</div>` : ''}
            </div>
            
            ${customer.notes ? `
              <div class="section">
                <h2>Notes</h2>
                <div style="white-space: pre-wrap;">${customer.notes}</div>
              </div>
            ` : ''}
            
            <div class="footer">
              <p>Printed on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    // Trigger print and close window when done
    printWindow.document.close();
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    });
  };

  const handleExportVCard = () => {
    try {
      // Generate vCard data
      const vcardData = customerToVcard(customer);
      
      // Create a Blob from the vCard data
      const blob = new Blob([vcardData], { type: 'text/vcard' });
      const url = URL.createObjectURL(blob);
      
      // Create a download link and trigger the download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${customer.first_name}_${customer.last_name}.vcf`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Export successful",
        description: "Contact information exported as vCard",
      });
    } catch (error) {
      console.error("Error exporting vCard:", error);
      toast({
        title: "Export failed",
        description: "Could not export contact information",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card className="border shadow-sm">
      <CardHeader className="bg-slate-50 pb-3">
        <CardTitle className="text-lg flex items-center">
          <User className="h-5 w-5 mr-2 text-slate-500" />
          Customer Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-xl font-medium">{fullName}</h3>
          {customer.company && (
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <Building2 className="h-4 w-4 mr-1" />
              {customer.company}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {customer.phone && (
            <div className="flex items-center text-sm">
              <Phone className="h-4 w-4 mr-2 text-gray-500" />
              {formatPhoneNumber(customer.phone)}
            </div>
          )}
          
          {customer.email && (
            <div className="flex items-center text-sm">
              <Mail className="h-4 w-4 mr-2 text-gray-500" />
              {customer.email}
            </div>
          )}
          
          {customer.address && (
            <div className="flex items-center text-sm col-span-1 md:col-span-2">
              <MapPin className="h-4 w-4 mr-2 text-gray-500" />
              {customer.address}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-500 mb-1 flex items-center">
              <FileText className="h-3 w-3 mr-1" />
              Work Orders
            </div>
            <div className="font-medium">{workOrderCount}</div>
          </div>
          
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-500 mb-1 flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              Last Service
            </div>
            <div className="font-medium">
              {lastServiceDate 
                ? new Date(lastServiceDate).toLocaleDateString() 
                : "N/A"}
            </div>
          </div>
          
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-500 mb-1 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              Customer Since
            </div>
            <div className="font-medium">
              {customer.created_at 
                ? new Date(customer.created_at).toLocaleDateString() 
                : "N/A"}
            </div>
          </div>
        </div>

        {customer.tags && customer.tags.length > 0 && (
          <div>
            <div className="flex items-center mb-1 text-sm text-gray-600">
              <Tag className="h-4 w-4 mr-1" />
              Tags
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {customer.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs bg-slate-100">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {customer.vehicles && customer.vehicles.length > 0 && (
          <div>
            <div className="flex items-center mb-1 text-sm text-gray-600">
              <Car className="h-4 w-4 mr-1" />
              Vehicles ({customer.vehicles.length})
            </div>
            <div className="space-y-2 mt-1">
              {customer.vehicles.slice(0, 2).map((vehicle, index) => (
                <div key={index} className="text-sm border rounded-md p-2 bg-slate-50">
                  {vehicle.year && vehicle.make && vehicle.model ? (
                    <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
                  ) : (
                    <div className="font-medium text-gray-500">Vehicle {index + 1}</div>
                  )}
                  {vehicle.vin && <div className="text-xs text-gray-600">VIN: {vehicle.vin}</div>}
                  {vehicle.license_plate && <div className="text-xs text-gray-600">License: {vehicle.license_plate}</div>}
                </div>
              ))}
              {customer.vehicles.length > 2 && (
                <div className="text-xs text-blue-600 cursor-pointer hover:underline">
                  +{customer.vehicles.length - 2} more vehicles
                </div>
              )}
            </div>
          </div>
        )}
        
        {customer.notes && (
          <div>
            <div className="flex items-center mb-1 text-sm text-gray-600">
              <FileText className="h-4 w-4 mr-1" />
              Notes
            </div>
            <div className="text-sm border rounded-md p-2 bg-slate-50 whitespace-pre-wrap">
              {customer.notes.length > 150 
                ? `${customer.notes.substring(0, 150)}...` 
                : customer.notes}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="bg-slate-50 pt-3 pb-3 flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportVCard}>
          <Download className="h-4 w-4 mr-1" /> Export
        </Button>
      </CardFooter>
    </Card>
  );
};
