
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, Clock, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HistoryEntry {
  id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string;
  change_reason: string | null;
  changed_at: string;
}

interface ChangeHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemType: 'jobLine' | 'part';
  itemName: string;
}

export function ChangeHistoryDialog({ 
  isOpen, 
  onClose, 
  itemId, 
  itemType, 
  itemName 
}: ChangeHistoryDialogProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && itemId) {
      fetchHistory();
    }
  }, [isOpen, itemId, itemType]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const tableName = itemType === 'jobLine' ? 'work_order_job_line_history' : 'work_order_part_history';
      const idField = itemType === 'jobLine' ? 'job_line_id' : 'part_id';
      
      // Use explicit typing to avoid deep type instantiation
      const { data, error } = await supabase
        .from(tableName as any)
        .select('id, field_name, old_value, new_value, changed_by_name, change_reason, changed_at')
        .eq(idField, itemId)
        .order('changed_at', { ascending: false })
        .returns<HistoryEntry[]>();

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      setHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFieldName = (fieldName: string) => {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History: {itemName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-4">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No change history available
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-medium text-sm">
                      {formatFieldName(entry.field_name)} Changed
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(entry.changed_at)}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm mb-2">
                    <div>
                      <span className="text-muted-foreground">From:</span>
                      <div className="font-mono bg-red-50 px-2 py-1 rounded">
                        {entry.old_value || 'None'}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">To:</span>
                      <div className="font-mono bg-green-50 px-2 py-1 rounded">
                        {entry.new_value || 'None'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {entry.changed_by_name}
                    </div>
                    {entry.change_reason && (
                      <div>
                        <span className="font-medium">Reason:</span> {entry.change_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
