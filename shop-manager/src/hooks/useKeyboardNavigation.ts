import { useState, useEffect, useCallback } from 'react';
import { ServiceMainCategory, ServiceSubcategory, ServiceJob } from '@/types/service';

interface NavigationState {
  selectedCategoryIndex: number;
  selectedSubcategoryIndex: number;
  selectedJobIndex: number;
  activeColumn: 'categories' | 'subcategories' | 'jobs';
}

export function useKeyboardNavigation(
  categories: ServiceMainCategory[],
  onServiceSelect: (service: ServiceJob, categoryName: string, subcategoryName: string) => void
) {
  const [navigation, setNavigation] = useState<NavigationState>({
    selectedCategoryIndex: 0,
    selectedSubcategoryIndex: 0,
    selectedJobIndex: 0,
    activeColumn: 'categories'
  });

  const currentCategory = categories[navigation.selectedCategoryIndex];
  const currentSubcategory = currentCategory?.subcategories[navigation.selectedSubcategoryIndex];
  const currentJob = currentSubcategory?.jobs[navigation.selectedJobIndex];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!categories.length) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setNavigation(prev => {
          const newNav = { ...prev };
          
          if (prev.activeColumn === 'categories') {
            newNav.selectedCategoryIndex = Math.min(prev.selectedCategoryIndex + 1, categories.length - 1);
            newNav.selectedSubcategoryIndex = 0;
            newNav.selectedJobIndex = 0;
          } else if (prev.activeColumn === 'subcategories' && currentCategory) {
            newNav.selectedSubcategoryIndex = Math.min(prev.selectedSubcategoryIndex + 1, currentCategory.subcategories.length - 1);
            newNav.selectedJobIndex = 0;
          } else if (prev.activeColumn === 'jobs' && currentSubcategory) {
            newNav.selectedJobIndex = Math.min(prev.selectedJobIndex + 1, currentSubcategory.jobs.length - 1);
          }
          
          return newNav;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setNavigation(prev => {
          const newNav = { ...prev };
          
          if (prev.activeColumn === 'categories') {
            newNav.selectedCategoryIndex = Math.max(prev.selectedCategoryIndex - 1, 0);
            newNav.selectedSubcategoryIndex = 0;
            newNav.selectedJobIndex = 0;
          } else if (prev.activeColumn === 'subcategories') {
            newNav.selectedSubcategoryIndex = Math.max(prev.selectedSubcategoryIndex - 1, 0);
            newNav.selectedJobIndex = 0;
          } else if (prev.activeColumn === 'jobs') {
            newNav.selectedJobIndex = Math.max(prev.selectedJobIndex - 1, 0);
          }
          
          return newNav;
        });
        break;

      case 'ArrowRight':
        event.preventDefault();
        setNavigation(prev => {
          if (prev.activeColumn === 'categories' && currentCategory?.subcategories.length) {
            return { ...prev, activeColumn: 'subcategories' };
          } else if (prev.activeColumn === 'subcategories' && currentSubcategory?.jobs.length) {
            return { ...prev, activeColumn: 'jobs' };
          }
          return prev;
        });
        break;

      case 'ArrowLeft':
        event.preventDefault();
        setNavigation(prev => {
          if (prev.activeColumn === 'jobs') {
            return { ...prev, activeColumn: 'subcategories' };
          } else if (prev.activeColumn === 'subcategories') {
            return { ...prev, activeColumn: 'categories' };
          }
          return prev;
        });
        break;

      case 'Enter':
        event.preventDefault();
        if (navigation.activeColumn === 'jobs' && currentJob && currentCategory && currentSubcategory) {
          onServiceSelect(currentJob, currentCategory.name, currentSubcategory.name);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setNavigation({
          selectedCategoryIndex: 0,
          selectedSubcategoryIndex: 0,
          selectedJobIndex: 0,
          activeColumn: 'categories'
        });
        break;
    }
  }, [categories, navigation, currentCategory, currentSubcategory, currentJob, onServiceSelect]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const scrollToSelected = useCallback((columnType: string, index: number) => {
    const element = document.querySelector(`[data-nav="${columnType}-${index}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  useEffect(() => {
    // Scroll to selected items when navigation changes
    if (navigation.activeColumn === 'categories') {
      scrollToSelected('category', navigation.selectedCategoryIndex);
    } else if (navigation.activeColumn === 'subcategories') {
      scrollToSelected('subcategory', navigation.selectedSubcategoryIndex);
    } else if (navigation.activeColumn === 'jobs') {
      scrollToSelected('job', navigation.selectedJobIndex);
    }
  }, [navigation, scrollToSelected]);

  return {
    navigation,
    setNavigation,
    currentCategory,
    currentSubcategory,
    currentJob
  };
}
