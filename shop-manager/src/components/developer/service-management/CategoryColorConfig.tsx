
import React from 'react';

// Define category color styles
export interface CategoryColorStyle {
  bg: string;
  text: string;
  border: string;
}

// Predefined color styles for categories
export const categoryColors: CategoryColorStyle[] = [
  { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-300' },
  { bg: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-300' },
  { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300' },
  { bg: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-300' },
];

export const ColorSample: React.FC<{ color: CategoryColorStyle }> = ({ color }) => (
  <div className={`w-6 h-6 rounded-full ${color.bg} ${color.border}`} />
);

export const assignCategoryColors = (categories: string[]): Record<string, string> => {
  const colorMap: Record<string, string> = {};
  
  categories.forEach((category, index) => {
    colorMap[category] = (index % categoryColors.length).toString();
  });
  
  return colorMap;
};
