
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, ChevronLeft } from "lucide-react";
import { Customer, CustomerNote } from "@/types/customer";
import { CustomerInteraction } from "@/types/interaction";
import { getCustomerNotes } from "@/services/customers";

interface CustomerSummaryCardProps {
  customer: Customer & { name?: string, lastServiceDate?: string, notes?: string };
  customerWorkOrders: any[];
  customerInteractions: CustomerInteraction[];
  setActiveTab: (tab: string) => void;
}

export const CustomerSummaryCard: React.FC<CustomerSummaryCardProps> = ({
  customer,
  customerWorkOrders,
  customerInteractions,
  setActiveTab
}) => {
  const [recentNote, setRecentNote] = useState<CustomerNote | null>(null);
  const [isLoadingNote, setIsLoadingNote] = useState(true);

  useEffect(() => {
    loadRecentNote();
  }, [customer.id]);

  const loadRecentNote = async () => {
    try {
      setIsLoadingNote(true);
      const notes = await getCustomerNotes(customer.id);
      if (notes.length > 0) {
        // Sort by created_at and get the most recent
        const sorted = [...notes].sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentNote(sorted[0]);
      }
    } catch (error) {
      console.error("Failed to load recent note:", error);
    } finally {
      setIsLoadingNote(false);
    }
  };

  return (
    <Card className="md:col-span-2">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg">Customer Summary</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-slate-500">Total Work Orders</p>
            <p className="text-2xl font-bold">{customerWorkOrders.length}</p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-slate-500">Last Service</p>
            <p className="text-2xl font-bold">
              {customer.lastServiceDate 
                ? new Date(customer.lastServiceDate).toLocaleDateString()
                : "N/A"}
            </p>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-slate-500">Interactions</p>
            <p className="text-2xl font-bold">
              {customerInteractions.length}
            </p>
          </div>
        </div>
        
        {isLoadingNote ? (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Loading latest note...</h3>
          </div>
        ) : recentNote ? (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-slate-500">Latest Note</h3>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0"
                onClick={() => setActiveTab("notes")}
              >
                <History className="h-4 w-4 mr-1" /> View All Notes
              </Button>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm mb-1 flex items-center gap-2">
                    <span className="capitalize">{recentNote.category}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(recentNote.created_at).toLocaleDateString()}
                    </span>
                  </p>
                  <p className="text-sm whitespace-pre-wrap text-slate-600">{recentNote.content}</p>
                  <p className="text-xs text-slate-500 mt-1">Added by {recentNote.created_by}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium text-slate-500">Notes</h3>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0"
                onClick={() => setActiveTab("notes")}
              >
                <History className="h-4 w-4 mr-1" /> Add Note
              </Button>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-center text-slate-500">
              No notes recorded yet
            </div>
          </div>
        )}
        
        <RecentInteractions 
          customerInteractions={customerInteractions} 
          setActiveTab={setActiveTab} 
        />
      </CardContent>
    </Card>
  );
};

interface RecentInteractionsProps {
  customerInteractions: CustomerInteraction[];
  setActiveTab: (tab: string) => void;
}

const RecentInteractions: React.FC<RecentInteractionsProps> = ({ 
  customerInteractions, 
  setActiveTab 
}) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-500">Recent Interactions</h3>
        <Button 
          variant="link" 
          size="sm" 
          className="h-auto p-0"
          onClick={() => setActiveTab("interactions")}
        >
          <History className="h-4 w-4 mr-1" /> View All
        </Button>
      </div>
      
      {customerInteractions.length > 0 ? (
        <div className="bg-slate-50 rounded-lg divide-y">
          {customerInteractions.slice(0, 3).map((interaction) => (
            <div key={interaction.id} className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{interaction.description}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(interaction.date).toLocaleDateString()} • {interaction.staff_member_name}
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6"
                  onClick={() => setActiveTab("interactions")}
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 bg-slate-50 rounded-lg text-slate-500">
          No interactions recorded yet
        </div>
      )}
    </div>
  );
};
