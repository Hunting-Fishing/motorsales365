import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Edit, 
  Globe, 
  CreditCard, 
  Clock, 
  Building, 
  FileText,
  User
} from "lucide-react";
import { InventorySupplier } from "@/services/inventory/supplierService";

interface SupplierDetailsDialogProps {
  supplier: InventorySupplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (supplier: InventorySupplier) => void;
}

export function SupplierDetailsDialog({
  supplier,
  open,
  onOpenChange,
  onEdit,
}: SupplierDetailsDialogProps) {
  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {supplier.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={supplier.is_active ? "default" : "secondary"}>
                  {supplier.is_active ? "Active" : "Inactive"}
                </Badge>
                {supplier.type && (
                  <Badge variant="outline">{supplier.type}</Badge>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(supplier)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </h3>
            <div className="space-y-3">
              {supplier.contact_name && (
                <div className="flex items-center gap-3">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Contact:</span> {supplier.contact_name}
                  </span>
                </div>
              )}
              
              {supplier.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Email:</span> {supplier.email}
                  </span>
                </div>
              )}
              
              {supplier.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Phone:</span> {supplier.phone}
                  </span>
                </div>
              )}
              
              {supplier.website && (
                <div className="flex items-center gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    <span className="font-medium">Website:</span> {supplier.website}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Address Information */}
          {(supplier.address || supplier.region) && (
            <>
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address & Location
                </h3>
                <div className="space-y-2">
                  {supplier.address && (
                    <div className="text-sm">
                      <span className="font-medium">Address:</span> {supplier.address}
                    </div>
                  )}
                  
                  {supplier.region && (
                    <div className="text-sm">
                      <span className="font-medium">Region:</span> {supplier.region}
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Business Terms */}
          {(supplier.payment_terms || supplier.lead_time_days) && (
            <>
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Business Terms
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {supplier.payment_terms && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Payment:</span> {supplier.payment_terms}
                      </span>
                    </div>
                  )}
                  
                  {supplier.lead_time_days && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        <span className="font-medium">Lead Time:</span> {supplier.lead_time_days} days
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div>
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes
              </h3>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                <span>Created: {new Date(supplier.created_at).toLocaleDateString()}</span>
              </div>
              {supplier.updated_at && supplier.updated_at !== supplier.created_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  <span>Updated: {new Date(supplier.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}