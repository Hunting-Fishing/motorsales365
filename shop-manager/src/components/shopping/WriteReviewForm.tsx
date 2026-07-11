import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import ReviewForm from './ReviewForm';

interface WriteReviewFormProps {
  productId: string;
  productName: string;
  onReviewSubmitted?: () => void;
}

export const WriteReviewForm: React.FC<WriteReviewFormProps> = ({
  productId,
  productName,
  onReviewSubmitted
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleReviewSubmitted = () => {
    setIsOpen(false);
    onReviewSubmitted?.();
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="outline" className="flex items-center gap-2">
        <Star className="h-4 w-4" />
        Write a Review
      </Button>
      
      <ReviewForm
        productId={productId}
        productName={productName}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </>
  );
};

export default WriteReviewForm;