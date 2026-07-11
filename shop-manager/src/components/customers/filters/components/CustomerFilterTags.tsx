
import React, { useState } from "react";
import { Label } from "@/components/ui/label";
import { TagSelector } from "../../form/tag/TagSelector";

interface CustomerFilterTagsProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

export const CustomerFilterTags: React.FC<CustomerFilterTagsProps> = ({
  tags,
  onChange,
}) => {
  const [tempTags, setTempTags] = useState<string[]>(tags || []);

  const handleTagsChange = (newTags: string[]) => {
    setTempTags(newTags);
    onChange(newTags);
  };

  return (
    <div className="space-y-2">
      <Label>Tags</Label>
      <TagSelector 
        selectedTags={tempTags}
        onChange={handleTagsChange}
      />
    </div>
  );
};
