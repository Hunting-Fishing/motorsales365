import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Circle, Camera, AlertTriangle, X } from 'lucide-react';

interface WorkflowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepTitle: string;
  stepNumber: number;
}

// Mock inspection form preview
const InspectionFormPreview = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between pb-3 border-b">
      <div>
        <p className="font-semibold">2019 Toyota Camry</p>
        <p className="text-sm text-muted-foreground">VIN: 4T1B11HK5KU...</p>
      </div>
      <Badge variant="outline">In Progress</Badge>
    </div>
    
    <div className="space-y-3">
      {[
        { name: 'Brake Pads - Front', status: 'good', note: '6mm remaining' },
        { name: 'Brake Pads - Rear', status: 'warning', note: '3mm - Replace soon' },
        { name: 'Tire Tread - LF', status: 'good', note: '7/32"' },
        { name: 'Tire Tread - RF', status: 'good', note: '6/32"' },
        { name: 'Oil Level', status: 'good', note: 'Full' },
        { name: 'Air Filter', status: 'bad', note: 'Dirty - Recommend replace' },
        { name: 'Wiper Blades', status: 'warning', note: 'Streaking - Replace soon' },
        { name: 'Battery', status: 'good', note: '12.6V - Good condition' },
      ].map((item) => (
        <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3">
            {item.status === 'good' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
            {item.status === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
            {item.status === 'bad' && <X className="h-5 w-5 text-red-500" />}
            <span className="font-medium">{item.name}</span>
          </div>
          <span className="text-sm text-muted-foreground">{item.note}</span>
        </div>
      ))}
    </div>
    
    <div className="pt-3 border-t">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Camera className="h-4 w-4" />
        <span>Photo Documentation</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="aspect-square rounded-lg bg-muted flex items-center justify-center">
            <Camera className="h-6 w-6 text-muted-foreground/50" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Customer check-in preview
const CheckInPreview = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Customer Name</label>
        <div className="p-3 rounded-lg bg-muted/50 text-sm">John Smith</div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Phone</label>
        <div className="p-3 rounded-lg bg-muted/50 text-sm">(555) 123-4567</div>
      </div>
    </div>
    <div className="space-y-2">
      <label className="text-sm font-medium">VIN (Auto-decoded)</label>
      <div className="p-3 rounded-lg bg-muted/50 text-sm">4T1B11HK5KU789012</div>
    </div>
    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
      <p className="font-semibold text-primary mb-2">Vehicle Identified</p>
      <p className="text-sm">2019 Toyota Camry SE • 45,230 miles</p>
      <p className="text-xs text-muted-foreground mt-1">Last service: Oil Change - 3 months ago</p>
    </div>
    <div className="space-y-2">
      <label className="text-sm font-medium">Customer Concern</label>
      <div className="p-3 rounded-lg bg-muted/50 text-sm min-h-[80px]">
        "Squeaking noise when braking, especially at low speeds"
      </div>
    </div>
  </div>
);

// Estimate preview
const EstimatePreview = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center pb-3 border-b">
      <div>
        <p className="font-semibold">Estimate #EST-2024-001</p>
        <p className="text-sm text-muted-foreground">2019 Toyota Camry</p>
      </div>
      <Badge>Draft</Badge>
    </div>
    
    <div className="space-y-3">
      {[
        { service: 'Front Brake Pad Replacement', labor: 85, parts: 120 },
        { service: 'Brake Rotor Resurface (x2)', labor: 60, parts: 0 },
        { service: 'Air Filter Replacement', labor: 15, parts: 35 },
      ].map((item) => (
        <div key={item.service} className="p-3 rounded-lg bg-muted/50">
          <p className="font-medium">{item.service}</p>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>Labor: ${item.labor}</span>
            <span>Parts: ${item.parts}</span>
          </div>
        </div>
      ))}
    </div>
    
    <div className="pt-3 border-t space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>$315.00</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Tax (8%)</span>
        <span>$25.20</span>
      </div>
      <div className="flex justify-between font-bold text-lg">
        <span>Total</span>
        <span>$340.20</span>
      </div>
    </div>
  </div>
);

// Assignment preview
const AssignmentPreview = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-3 gap-3">
      {[
        { bay: 'Bay 1', tech: 'Mike S.', status: 'busy', job: 'Oil Change' },
        { bay: 'Bay 2', tech: 'Available', status: 'free', job: null },
        { bay: 'Bay 3', tech: 'Tom R.', status: 'busy', job: 'Transmission' },
      ].map((bay) => (
        <Card key={bay.bay} className={bay.status === 'free' ? 'border-emerald-500 border-2' : ''}>
          <CardContent className="p-4 text-center">
            <p className="font-semibold">{bay.bay}</p>
            <p className={`text-sm ${bay.status === 'free' ? 'text-emerald-600 font-medium' : 'text-muted-foreground'}`}>
              {bay.tech}
            </p>
            {bay.job && <p className="text-xs text-muted-foreground mt-1">{bay.job}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
    
    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
      <p className="font-semibold mb-2">Assign Work Order #WO-2024-156</p>
      <div className="flex items-center gap-2">
        <Circle className="h-4 w-4 text-emerald-500 fill-emerald-500" />
        <span className="text-sm">Bay 2 is available - Click to assign</span>
      </div>
    </div>
    
    <div className="space-y-2">
      <p className="text-sm font-medium">Today's Queue</p>
      {['WO-2024-155 - Brake Job (In Progress)', 'WO-2024-156 - Brake Inspection (Pending)', 'WO-2024-157 - Oil Change (Scheduled 2PM)'].map((wo) => (
        <div key={wo} className="p-2 rounded bg-muted/50 text-sm">{wo}</div>
      ))}
    </div>
  </div>
);

// Customer approval preview
const ApprovalPreview = () => (
  <div className="space-y-4">
    <div className="text-center p-4 bg-muted/50 rounded-lg">
      <p className="text-sm text-muted-foreground">Customer View</p>
      <p className="font-semibold mt-1">Sent via SMS/Email</p>
    </div>
    
    <div className="p-4 border rounded-lg space-y-4">
      <div className="text-center">
        <p className="font-bold text-lg">Service Estimate</p>
        <p className="text-sm text-muted-foreground">2019 Toyota Camry • John Smith</p>
      </div>
      
      <div className="space-y-2">
        {[
          { item: 'Front Brake Pads', price: '$205', recommended: true },
          { item: 'Air Filter', price: '$50', recommended: true },
          { item: 'Cabin Filter', price: '$45', recommended: false },
        ].map((item) => (
          <div key={item.item} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded border-2 ${item.recommended ? 'bg-primary border-primary' : 'border-muted-foreground'} flex items-center justify-center`}>
                {item.recommended && <CheckCircle className="h-3 w-3 text-white" />}
              </div>
              <span>{item.item}</span>
            </div>
            <span className="font-medium">{item.price}</span>
          </div>
        ))}
      </div>
      
      <div className="pt-3 border-t">
        <div className="flex justify-between font-bold">
          <span>Selected Total</span>
          <span>$255.00</span>
        </div>
      </div>
      
      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
        <p className="text-emerald-700 font-medium">✓ Approved by Customer</p>
        <p className="text-xs text-emerald-600 mt-1">Digital signature received</p>
      </div>
    </div>
  </div>
);

// Invoice preview
const InvoicePreview = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center pb-3 border-b">
      <div>
        <p className="font-semibold">Invoice #INV-2024-089</p>
        <p className="text-sm text-muted-foreground">January 7, 2026</p>
      </div>
      <Badge className="bg-emerald-500">Paid</Badge>
    </div>
    
    <div className="space-y-3">
      {[
        { desc: 'Front Brake Pad Replacement', qty: 1, amount: 205 },
        { desc: 'Air Filter Replacement', qty: 1, amount: 50 },
      ].map((item) => (
        <div key={item.desc} className="flex justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <p className="font-medium">{item.desc}</p>
            <p className="text-sm text-muted-foreground">Qty: {item.qty}</p>
          </div>
          <p className="font-medium">${item.amount.toFixed(2)}</p>
        </div>
      ))}
    </div>
    
    <div className="pt-3 border-t space-y-2">
      <div className="flex justify-between text-sm">
        <span>Subtotal</span>
        <span>$255.00</span>
      </div>
      <div className="flex justify-between text-sm">
        <span>Tax (8%)</span>
        <span>$20.40</span>
      </div>
      <div className="flex justify-between font-bold text-lg pt-2 border-t">
        <span>Total Paid</span>
        <span className="text-emerald-600">$275.40</span>
      </div>
    </div>
    
    <div className="p-3 rounded-lg bg-muted/50 text-center text-sm text-muted-foreground">
      Payment received via Credit Card ending in 4242
    </div>
  </div>
);

const previewComponents: Record<number, React.ReactNode> = {
  1: <CheckInPreview />,
  2: <EstimatePreview />,
  3: <AssignmentPreview />,
  4: <InspectionFormPreview />,
  5: <ApprovalPreview />,
  6: <InvoicePreview />,
};

const previewTitles: Record<number, string> = {
  1: 'Customer Check-in Form',
  2: 'Estimate Builder',
  3: 'Bay & Technician Assignment',
  4: 'Digital Vehicle Inspection',
  5: 'Customer Approval Portal',
  6: 'Invoice & Payment',
};

export function WorkflowPreviewModal({ isOpen, onClose, stepTitle, stepNumber }: WorkflowPreviewModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
              {stepNumber}
            </span>
            {previewTitles[stepNumber] || stepTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {previewComponents[stepNumber] || (
            <div className="text-center py-8 text-muted-foreground">
              Preview coming soon
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-4 pt-4 border-t">
          This is a preview of what this feature looks like in the actual app
        </p>
      </DialogContent>
    </Dialog>
  );
}