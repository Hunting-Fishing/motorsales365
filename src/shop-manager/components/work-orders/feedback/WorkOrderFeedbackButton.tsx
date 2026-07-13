
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FeedbackForm } from '@/components/feedback/FeedbackForm';
import { getFeedbackForms } from '@/services/feedbackService';
import { useShopId } from '@/hooks/useShopId';
import { MessageSquare, Loader2 } from 'lucide-react';

interface WorkOrderFeedbackButtonProps {
  workOrderId: string;
  customerId: string;
}

export const WorkOrderFeedbackButton: React.FC<WorkOrderFeedbackButtonProps> = ({
  workOrderId,
  customerId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackFormId, setFeedbackFormId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { shopId, loading: shopLoading } = useShopId();

  useEffect(() => {
    const loadFeedbackForms = async () => {
      if (!shopId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const forms = await getFeedbackForms(shopId);
        
        // Find the first active feedback form
        const activeForm = forms.find(form => form.is_active);
        if (activeForm) {
          setFeedbackFormId(activeForm.id);
        }
      } catch (error) {
        console.error('Error loading feedback forms:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (!shopLoading) {
      loadFeedbackForms();
    }
  }, [shopId, shopLoading]);

  const handleFeedbackComplete = () => {
    setIsOpen(false);
  };

  const isDisabled = loading || shopLoading || !feedbackFormId || !shopId;

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        disabled={isDisabled}
      >
        {(loading || shopLoading) ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <MessageSquare className="h-4 w-4 mr-2" />
        )}
        Request Feedback
      </Button>
      
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Customer Feedback</DialogTitle>
          </DialogHeader>
          
          {feedbackFormId && (
            <FeedbackForm 
              formId={feedbackFormId}
              customerId={customerId}
              workOrderId={workOrderId}
              onComplete={handleFeedbackComplete}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
