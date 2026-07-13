
import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/components/ui/command";
import { useNavigate } from "react-router-dom";

export interface GlobalCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: (value: string) => void;
}

export function GlobalCommandMenu({ open, onOpenChange, onSearch }: GlobalCommandMenuProps) {
  const navigate = useNavigate();

  const quickLinks = [
    { title: "Work Orders", href: "/work-orders" },
    { title: "Create Work Order", href: "/work-orders/new" },
    { title: "Customers", href: "/customers" },
    { title: "Invoices", href: "/invoices" },
    { title: "Create Invoice", href: "/invoices/new" },
    { title: "Calendar", href: "/calendar" },
    { title: "Inventory", href: "/inventory" },
    { title: "Equipment", href: "/equipment" },
    { title: "Maintenance", href: "/maintenance" },
    { title: "Reports", href: "/reports" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0" style={{ maxWidth: "640px" }}>
        <Command>
          <CommandInput 
            placeholder="Type a command or search..." 
            onValueChange={onSearch}
          />
          <CommandList>
            <CommandGroup heading="Quick Links">
              {quickLinks.map((link) => (
                <CommandItem
                  key={link.href}
                  onSelect={() => {
                    navigate(link.href);
                    onOpenChange(false);
                  }}
                >
                  {link.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
