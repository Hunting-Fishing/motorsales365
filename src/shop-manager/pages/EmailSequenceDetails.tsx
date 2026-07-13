
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useEmailSequences } from "@/hooks/email/useEmailSequences";
import { EmailSequenceDetails } from "@/components/email/sequence/EmailSequenceDetails";
import { useToast } from "@/hooks/use-toast";

export default function EmailSequenceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  
  const { 
    currentSequence, 
    analytics,
    fetchSequenceById, 
    fetchSequenceAnalytics,
    updateSequence,
    deleteSequence,
    enrollCustomer,
    analyticsLoading
  } = useEmailSequences();

  useEffect(() => {
    async function loadSequence() {
      if (id) {
        setLoading(true);
        try {
          const sequence = await fetchSequenceById(id);
          if (sequence) {
            // Pass the sequence ID to fetch analytics for this specific sequence
            await fetchSequenceAnalytics(id);
          } else {
            toast({
              title: "Error",
              description: "Sequence not found",
              variant: "destructive",
            });
            navigate('/email-sequences');
          }
        } finally {
          setLoading(false);
        }
      }
    }
    
    loadSequence();
  }, [id, fetchSequenceById, navigate, toast, fetchSequenceAnalytics]);

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded"></div>
        <div className="h-64 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  if (!currentSequence) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Sequence Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The sequence you're looking for doesn't exist or has been deleted.
          </p>
          <button
            onClick={() => navigate('/email-sequences')}
            className="text-primary hover:underline"
          >
            Return to Email Sequences
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <EmailSequenceDetails sequenceId={id as string} />
    </div>
  );
}
