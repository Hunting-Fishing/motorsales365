
import { useState, useCallback } from 'react';

type SelectedService = {
  mainCategory: string;
  subcategory: string;
  job: string;
  estimatedTime?: number;
};

// Global state for selected service
let selectedService: SelectedService | null = null;
let listeners: Array<(service: SelectedService | null) => void> = [];

// Notify all listeners of the change
const notifyListeners = () => {
  listeners.forEach(listener => listener(selectedService));
};

export const useServiceSelection = () => {
  const [currentSelection, setCurrentSelection] = useState<SelectedService | null>(selectedService);

  // Register and clean up listeners
  useState(() => {
    const listener = (service: SelectedService | null) => {
      setCurrentSelection(service);
    };
    
    listeners.push(listener);
    
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  });

  // Select a service
  const selectService = useCallback((service: SelectedService) => {
    selectedService = service;
    notifyListeners();
  }, []);

  // Clear the selected service
  const clearSelectedService = useCallback(() => {
    selectedService = null;
    notifyListeners();
  }, []);

  return {
    selectedService: currentSelection,
    selectService,
    clearSelectedService
  };
};
