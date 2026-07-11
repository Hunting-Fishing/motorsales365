
import React from 'react';

interface ServiceSubcategoryGridProps {
  category: string;
  subcategories: string[];
  selectedSubcategory: string | null;
  onSelectSubcategory: (subcategory: string) => void;
}

export function ServiceSubcategoryGrid({
  category,
  subcategories,
  selectedSubcategory,
  onSelectSubcategory
}: ServiceSubcategoryGridProps) {
  return (
    <div className="h-full">
      <div className="p-2 border-b">
        <h3 className="font-medium text-sm">Subcategories</h3>
      </div>
      
      <div className="p-2 overflow-y-auto max-h-56">
        <ul className="space-y-1">
          {subcategories.map((subcategory, index) => (
            <li key={index}>
              <button
                type="button"
                className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition ${
                  selectedSubcategory === subcategory
                    ? "bg-blue-100 text-blue-800"
                    : "hover:bg-blue-50"
                }`}
                onClick={(e) => {
                  e.preventDefault(); // Prevent default button behavior
                  onSelectSubcategory(subcategory);
                }}
              >
                {subcategory}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
