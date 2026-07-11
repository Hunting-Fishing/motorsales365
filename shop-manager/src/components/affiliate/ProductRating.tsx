
import React from 'react';
import { Star, StarHalf } from 'lucide-react';

interface ProductRatingProps {
  rating: number;
  reviewCount?: number;
}

export const ProductRating: React.FC<ProductRatingProps> = ({ rating, reviewCount }) => {
  // Function to render the appropriate stars
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star 
          key={`full-${i}`} 
          className="h-4 w-4 fill-yellow-400 text-yellow-400"
        />
      );
    }
    
    // Add half star if needed
    if (hasHalfStar) {
      stars.push(
        <StarHalf 
          key="half" 
          className="h-4 w-4 fill-yellow-400 text-yellow-400"
        />
      );
    }
    
    // Add empty stars to make total of 5
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star 
          key={`empty-${i}`} 
          className="h-4 w-4 text-gray-300"
        />
      );
    }
    
    return stars;
  };
  
  return (
    <div className="flex items-center">
      <div className="flex">
        {renderStars()}
      </div>
      {reviewCount !== undefined && (
        <span className="ml-2 text-sm text-slate-500">
          ({reviewCount})
        </span>
      )}
    </div>
  );
};
