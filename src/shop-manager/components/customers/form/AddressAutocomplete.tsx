import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { CustomerFormValues } from "./schemas/customerSchema";
import { FormControl } from "@/components/ui/form";

interface AddressAutocompleteProps {
  form: UseFormReturn<CustomerFormValues>;
  field: any;
  disabled?: boolean;
}

interface NominatimResult {
  display_name: string;
  place_id: number;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    state?: string;
    province?: string;
  };
}

// This component uses Nominatim (OpenStreetMap) API for free address autocomplete
export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ form, field, disabled }) => {
  const [predictions, setPredictions] = useState<NominatimResult[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [inputValue, setInputValue] = useState(field.value || "");
  const [isLoading, setIsLoading] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Set up click outside listener to close predictions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowPredictions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Function to fetch address predictions from Nominatim
  const fetchAddressPredictions = async (input: string) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setIsLoading(true);

    try {
      // Nominatim API call with structured results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&addressdetails=1&limit=5&countrycodes=us,ca,gb,au`
      );
      
      if (!response.ok) {
        throw new Error('Address search failed');
      }

      const results: NominatimResult[] = await response.json();
      setPredictions(results);
      setShowPredictions(results.length > 0);
    } catch (error) {
      console.error("Error fetching address predictions:", error);
      setPredictions([]);
      setShowPredictions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    field.onChange(value);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce API calls to respect rate limits
    debounceRef.current = setTimeout(() => {
      fetchAddressPredictions(value);
    }, 500);
  };

  // Handle prediction selection and auto-populate fields
  const handleSelectPrediction = (prediction: NominatimResult) => {
    const address = prediction.address;
    const fullAddress = `${address.house_number || ''} ${address.road || ''}`.trim();
    
    // Set the street address
    setInputValue(fullAddress || prediction.display_name.split(',')[0]);
    field.onChange(fullAddress || prediction.display_name.split(',')[0]);

    // Auto-populate other address fields
    if (address.city || address.town || address.village) {
      form.setValue('city', address.city || address.town || address.village);
    }
    
    if (address.postcode) {
      form.setValue('postal_code', address.postcode);
    }
    
    if (address.country_code) {
      // Convert country code to format expected by form
      const countryCode = address.country_code.toUpperCase();
      form.setValue('country', countryCode);
    }
    
    if (address.state || address.province) {
      form.setValue('state', address.state || address.province);
    }

    setShowPredictions(false);
  };

  return (
    <div className="relative" ref={autocompleteRef}>
      <div className="relative">
        <Input
          placeholder="Start typing an address..."
          {...field}
          value={inputValue}
          onChange={handleInputChange}
          disabled={disabled}
          className="w-full pr-10"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showPredictions && predictions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <div
              key={prediction.place_id}
              className="px-4 py-2 cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSelectPrediction(prediction)}
            >
              <div className="font-medium text-sm">
                {prediction.display_name.split(',')[0]}
              </div>
              <div className="text-xs text-muted-foreground">
                {prediction.display_name.split(',').slice(1).join(',').trim()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
