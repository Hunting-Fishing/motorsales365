import React from 'react';

interface CategoryBannerProps {
  title: string;
  description: string;
  image: string;
  align?: 'left' | 'right';
}

export function CategoryBanner({ title, description, image, align = 'left' }: CategoryBannerProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-4 md:mb-6 h-32 md:h-40">
      {/* Background Image */}
      <img 
        src={image} 
        alt={title} 
        loading="lazy"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      {/* Gradient Overlay */}
      <div className={`absolute inset-0 ${
        align === 'left' 
          ? 'bg-gradient-to-r from-background/95 via-background/70 to-transparent' 
          : 'bg-gradient-to-l from-background/95 via-background/70 to-transparent'
      }`} />
      
      {/* Content */}
      <div className={`relative h-full flex flex-col justify-center px-6 md:px-8 ${
        align === 'right' ? 'items-end text-right' : 'items-start'
      }`}>
        <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1 md:mb-2">
          {title}
        </h3>
        <p className="text-sm md:text-base text-muted-foreground max-w-md">
          {description}
        </p>
      </div>
    </div>
  );
}
