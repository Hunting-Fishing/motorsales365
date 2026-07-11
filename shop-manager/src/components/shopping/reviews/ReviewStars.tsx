import React from 'react';
import { Star } from 'lucide-react';

interface ReviewStarsProps {
  rating: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

const ReviewStars: React.FC<ReviewStarsProps> = ({ 
  rating, 
  size = 'sm', 
  showNumber = false, 
  interactive = false,
  onRatingChange 
}) => {
  const getSizeClass = () => {
    switch (size) {
      case 'xs': return 'h-3 w-3';
      case 'sm': return 'h-4 w-4';
      case 'md': return 'h-5 w-5';
      case 'lg': return 'h-6 w-6';
      default: return 'h-4 w-4';
    }
  };

  const handleStarClick = (starRating: number) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            onClick={() => handleStarClick(star)}
            disabled={!interactive}
          >
            <Star
              className={`${getSizeClass()} ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/30'
              }`}
            />
          </button>
        ))}
      </div>
      {showNumber && (
        <span className={`text-muted-foreground ${
          size === 'xs' ? 'text-xs' : 
          size === 'sm' ? 'text-sm' : 
          size === 'md' ? 'text-base' : 'text-lg'
        }`}>
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
};

export default ReviewStars;