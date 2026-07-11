
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvoiceTemplate, Invoice } from "@/types/invoice";

export interface SaveTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  invoice: Invoice;
  onSaveTemplate: (template: Omit<InvoiceTemplate, "id" | "created_at" | "usage_count">) => void;
}

export function SaveTemplateDialog({ open, onClose, invoice, onSaveTemplate }: SaveTemplateDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [taxRate, setTaxRate] = useState(8);
  const [dueDays, setDueDays] = useState(30);
  const [saving, setSaving] = useState(false);
  
  const handleSave = () => {
    setSaving(true);
    
    const template: Omit<InvoiceTemplate, "id" | "created_at" | "usage_count"> = {
      name,
      description,
      default_tax_rate: taxRate / 100,
      default_due_date_days: dueDays,
      default_notes: invoice.notes || "",
      default_items: invoice.items,
      last_used: null
    };
    
    onSaveTemplate(template);
    setSaving(false);
    resetForm();
    onClose();
  };
  
  const resetForm = () => {
    setName("");
    setDescription("");
    setTaxRate(8);
    setDueDays(30);
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Save as Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="name">Template Name</Label>
            <Input 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Standard Oil Change" 
            />
          </div>
          <div>
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe when to use this template"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
            <div>
              <Label htmlFor="dueDays">Default Due Days</Label>
              <Input
                id="dueDays"
                type="number"
                value={dueDays}
                onChange={(e) => setDueDays(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
