import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { useFAQ, useFAQCategories, useTrackFAQView, useSubmitFAQFeedback } from '@/hooks/useFAQ';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export const FAQSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());
  
  const { data: faqs, isLoading: faqsLoading } = useFAQ(selectedCategory);
  const { data: categories } = useFAQCategories();
  const trackView = useTrackFAQView();
  const submitFeedback = useSubmitFAQFeedback();

  const handleFAQClick = (faqId: string) => {
    trackView.mutate(faqId);
  };

  const handleFeedback = async (faqId: string, isHelpful: boolean) => {
    try {
      await submitFeedback.mutateAsync({
        faqId,
        isHelpful
      });
      
      setFeedbackGiven(prev => new Set(prev).add(faqId));
      toast.success('Thank you for your feedback!');
    } catch (error) {
      toast.error('Failed to submit feedback');
    }
  };

  const getCategoryDisplayName = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (faqsLoading) {
    return <div>Loading FAQs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories || []).map((category) => (
              <SelectItem key={category} value={category}>
                {getCategoryDisplayName(category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {(faqs || []).map((faq) => (
          <Card key={faq.id} className="cursor-pointer" onClick={() => handleFAQClick(faq.id)}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{faq.question}</CardTitle>
                <Badge variant="outline">{getCategoryDisplayName(faq.category)}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{faq.answer}</p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{faq.viewCount} views</span>
                  <span>{faq.helpfulCount} helpful</span>
                </div>
                
                {!feedbackGiven.has(faq.id) && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Was this helpful?</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(faq.id, true);
                      }}
                      disabled={submitFeedback.isPending}
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFeedback(faq.id, false);
                      }}
                      disabled={submitFeedback.isPending}
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(faqs || []).length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-muted-foreground">
              <p className="mb-2">No FAQs found{selectedCategory !== 'all' ? ` for ${getCategoryDisplayName(selectedCategory)}` : ''}.</p>
              <p className="text-sm">Try selecting a different category or contact support for help.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};