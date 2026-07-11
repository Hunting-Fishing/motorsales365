
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Calendar } from "lucide-react";
import { RemindersList } from "@/components/reminders/list/RemindersList";
import { AddReminderForm } from "@/components/reminders/AddReminderForm";
import { Customer } from "@/types/customer";

interface CustomerServiceRemindersProps {
  customer: Customer;
}

export function CustomerServiceReminders({ customer }: CustomerServiceRemindersProps) {
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  
  const handleReminderCreated = () => {
    setReminderDialogOpen(false);
    // Refresh would happen via re-render of parent component
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
        <div className="flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-slate-500" />
          <CardTitle className="text-lg">Service Reminders</CardTitle>
        </div>
        <Dialog open={reminderDialogOpen} onOpenChange={setReminderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Service Reminder</DialogTitle>
            </DialogHeader>
            <AddReminderForm 
              customerId={customer.id} 
              onSuccess={handleReminderCreated} 
            />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0">
        <RemindersList customerId={customer.id} limit={5} />
      </CardContent>
    </Card>
  );
}
