
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { FeedbackForm } from '@/types/feedback';
import { getFeedbackForms, deleteFeedbackForm } from '@/services/feedbackService';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { FeedbackFormCard } from './FeedbackFormCard';
import { EmptyFormsList } from './EmptyFormsList';
import { DeleteFormDialog } from './DeleteFormDialog';
import { supabase } from '@/integrations/supabase/client';

export const FeedbackFormsList: React.FC = () => {
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Fetch shop ID from user profile
  useEffect(() => {
    const fetchShopId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('shop_id')
          .or(`id.eq.${user.id},user_id.eq.${user.id}`)
          .maybeSingle();
        
        if (profile?.shop_id) {
          setShopId(profile.shop_id);
        }
      }
    };
    fetchShopId();
  }, []);

  useEffect(() => {
    const loadForms = async () => {
      if (!shopId) return;
      setLoading(true);
      const formData = await getFeedbackForms(shopId);
      setForms(formData);
      setLoading(false);
    };

    loadForms();
  }, [shopId]);

  const handleCreateForm = () => {
    navigate('/feedback/forms/new');
  };

  const handleEditForm = (formId: string) => {
    navigate(`/feedback/forms/${formId}/edit`);
  };

  const handleViewResponses = (formId: string) => {
    navigate(`/feedback/forms/${formId}/responses`);
  };

  const handleViewAnalytics = (formId: string) => {
    navigate(`/feedback/forms/${formId}/analytics`);
  };

  const handleDeleteClick = (formId: string) => {
    setFormToDelete(formId);
  };

  const handleCancelDelete = () => {
    setFormToDelete(null);
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;
    
    const success = await deleteFeedbackForm(formToDelete);
    if (success) {
      setForms(forms.filter(form => form.id !== formToDelete));
      toast({
        title: "Form Deleted",
        description: "The feedback form has been deleted successfully",
        variant: "success",
      });
    }
    setFormToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-gray-500">Loading feedback forms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Feedback Forms</h2>
        <Button onClick={handleCreateForm}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create New Form
        </Button>
      </div>
      
      {forms.length === 0 ? (
        <EmptyFormsList onCreateForm={handleCreateForm} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <FeedbackFormCard
              key={form.id}
              form={form}
              onEdit={handleEditForm}
              onViewResponses={handleViewResponses}
              onViewAnalytics={handleViewAnalytics}
              onDeleteClick={handleDeleteClick}
            />
          ))}
        </div>
      )}
      
      <AlertDialog>
        <DeleteFormDialog
          isOpen={!!formToDelete}
          onClose={handleCancelDelete}
          onConfirm={confirmDelete}
        />
      </AlertDialog>
    </div>
  );
};
