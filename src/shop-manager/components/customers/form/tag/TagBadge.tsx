
import React from "react";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { predefinedTags } from "../schemas/referenceData";

interface TagBadgeProps {
  tag: string;
  onRemove: (tag: string) => void;
  disabled?: boolean;
}

export const TagBadge: React.FC<TagBadgeProps> = ({ tag, onRemove, disabled }) => {
  const tagInfo = predefinedTags.find((t) => t.id === tag) || {
    label: tag,
    color: "bg-gray-500"
  };
  
  return (
    <Badge 
      variant="outline"
      className={`${tagInfo.color} text-white px-2 py-1 text-xs rounded-full flex items-center gap-1`}
    >
      <span>{tagInfo.label}</span>
      {!disabled && (
        <X
          size={14}
          className="cursor-pointer"
          onClick={() => onRemove(tag)}
        />
      )}
    </Badge>
  );
};
