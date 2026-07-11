import { useState, useMemo, useCallback } from 'react';
import { SettingsSection, SettingsTabConfig } from '@/types/settingsConfig';

interface SearchResult {
  tab: SettingsTabConfig;
  section: SettingsSection;
  matchType: 'label' | 'description' | 'section';
  matchText: string;
}

export interface UseSettingsSearchResult {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredSections: SettingsSection[];
  searchResults: SearchResult[];
  hasResults: boolean;
  isSearching: boolean;
}

// Simple fuzzy search function
const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query) return true;
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Direct substring match
  if (textLower.includes(queryLower)) return true;
  
  // Fuzzy match - allow for some characters in between
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
};

export const useSettingsSearch = (sections: SettingsSection[]): UseSettingsSearchResult => {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo((): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];
    
    sections.forEach(section => {
      section.tabs.forEach(tab => {
        // Check tab label
        if (fuzzyMatch(tab.label, searchQuery)) {
          results.push({
            tab,
            section,
            matchType: 'label',
            matchText: tab.label
          });
        }
        // Check tab description
        else if (tab.description && fuzzyMatch(tab.description, searchQuery)) {
          results.push({
            tab,
            section,
            matchType: 'description',
            matchText: tab.description
          });
        }
        // Check section title
        else if (fuzzyMatch(section.title, searchQuery)) {
          results.push({
            tab,
            section,
            matchType: 'section',
            matchText: section.title
          });
        }
      });
    });

    return results;
  }, [sections, searchQuery]);

  const filteredSections = useMemo((): SettingsSection[] => {
    if (!searchQuery.trim()) return sections;

    const filteredSections: SettingsSection[] = [];
    
    sections.forEach(section => {
      const matchingTabs = section.tabs.filter(tab => {
        return fuzzyMatch(tab.label, searchQuery) ||
               (tab.description && fuzzyMatch(tab.description, searchQuery)) ||
               fuzzyMatch(section.title, searchQuery);
      });

      if (matchingTabs.length > 0) {
        filteredSections.push({
          ...section,
          tabs: matchingTabs
        });
      }
    });

    return filteredSections;
  }, [sections, searchQuery]);

  const hasResults = searchResults.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  const setSearchQueryCallback = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    searchQuery,
    setSearchQuery: setSearchQueryCallback,
    filteredSections,
    searchResults,
    hasResults,
    isSearching
  };
};