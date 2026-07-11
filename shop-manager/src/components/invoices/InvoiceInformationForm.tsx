
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InvoiceInformationFormProps {
  // Invoice basic info
  invoiceId: string;
  status: string;
  date: string;
  dueDate: string;
  onInvoiceIdChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onDateChange: (value: string) => void;
  onDueDateChange: (value: string) => void;
  
  // Customer info
  customer: string;
  customerAddress: string;
  customerEmail: string;
  onCustomerChange: (value: string) => void;
  onCustomerAddressChange: (value: string) => void;
  onCustomerEmailChange: (value: string) => void;
  
  // Description and notes
  description: string;
  notes: string;
  onDescriptionChange: (value: string) => void;
  onNotesChange: (value: string) => void;
}

export function InvoiceInformationForm({
  // Invoice basic info
  invoiceId,
  status,
  date,
  dueDate,
  onInvoiceIdChange,
  onStatusChange,
  onDateChange,
  onDueDateChange,
  
  // Customer info
  customer,
  customerAddress,
  customerEmail,
  onCustomerChange,
  onCustomerAddressChange,
  onCustomerEmailChange,
  
  // Description and notes
  description,
  notes,
  onDescriptionChange,
  onNotesChange,
}: InvoiceInformationFormProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6">
      <h2 className="text-lg font-medium mb-4">Invoice Information</h2>
      
      {/* Basic Invoice Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="invoice-id">Invoice Number</Label>
          <Input 
            id="invoice-id" 
            value={invoiceId} 
            onChange={(e) => onInvoiceIdChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select 
            value={status}
            onValueChange={onStatusChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="issue-date">Issue Date</Label>
          <Input 
            id="issue-date" 
            type="date" 
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="due-date">Due Date</Label>
          <Input 
            id="due-date" 
            type="date" 
            value={dueDate}
            onChange={(e) => onDueDateChange(e.target.value)}
          />
        </div>
      </div>
      
      {/* Customer Information */}
      <div>
        <h3 className="font-medium mb-3">Customer Information</h3>
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div>
            <Label htmlFor="customer">Customer Name</Label>
            <Input 
              id="customer" 
              value={customer}
              onChange={(e) => onCustomerChange(e.target.value)}
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <Label htmlFor="customer-address">Customer Address</Label>
            <Textarea 
              id="customer-address" 
              value={customerAddress}
              onChange={(e) => onCustomerAddressChange(e.target.value)}
              placeholder="Enter customer address"
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="customer-email">Customer Email</Label>
            <Input 
              id="customer-email" 
              type="email"
              value={customerEmail}
              onChange={(e) => onCustomerEmailChange(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
        </div>
      </div>
      
      {/* Description and Notes */}
      <div>
        <div className="mb-6">
          <Label htmlFor="description">Description</Label>
          <Textarea 
            id="description" 
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Enter invoice description"
            rows={2}
          />
        </div>
        
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea 
            id="notes" 
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Enter any additional notes"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
