
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export const useTagSelector = (selectedTags: string[], onChange: (tags: string[]) => void) => {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch popular tags from the database
  useEffect(() => {
    if (showSuggestions && inputValue.length > 0) {
      fetchTagSuggestions(inputValue);
    } else if (showSuggestions) {
      fetchPopularTags();
    }
  }, [showSuggestions, inputValue]);
  
  const fetchPopularTags = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_tags')
        .select('name')
        .order('usage_count', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("Error fetching tags:", error);
        return;
      }
      
      setSuggestedTags(data?.map(tag => tag.name) || []);
    } catch (error) {
      console.error("Error in tag fetching:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchTagSuggestions = async (query: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('document_tags')
        .select('name')
        .ilike('name', `%${query}%`)
        .order('usage_count', { ascending: false })
        .limit(10);
      
      if (error) {
        console.error("Error fetching tag suggestions:", error);
        return;
      }
      
      setSuggestedTags(data?.map(tag => tag.name) || []);
    } catch (error) {
      console.error("Error in tag suggestion fetching:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setShowSuggestions(true);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const handleAddTag = async (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !selectedTags.includes(trimmedTag)) {
      const newTags = [...selectedTags, trimmedTag];
      onChange(newTags);
      setInputValue("");
      
      // Update the tag in the database
      try {
        // Check if the tag already exists
        const { data, error } = await supabase
          .from('document_tags')
          .select('name, usage_count')
          .eq('name', trimmedTag)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
          console.error("Error checking tag:", error);
          return;
        }
          
        if (data) {
          // Tag exists, increment usage count
          await supabase
            .from('document_tags')
            .update({ usage_count: (data.usage_count || 0) + 1 })
            .eq('name', trimmedTag);
        } else {
          // Tag doesn't exist, create it
          await supabase
            .from('document_tags')
            .insert({ name: trimmedTag, usage_count: 1 });
        }
      } catch (error) {
        console.error("Error updating tag usage:", error);
      }
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter((tag) => tag !== tagToRemove);
    onChange(newTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && selectedTags.length > 0) {
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  return {
    inputValue,
    showSuggestions,
    suggestedTags,
    loading,
    handleInputChange,
    handleInputFocus,
    handleAddTag,
    handleRemoveTag,
    handleKeyDown,
    inputRef,
    suggestionsRef,
  };
};
