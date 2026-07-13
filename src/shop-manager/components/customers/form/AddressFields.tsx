
import React, { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CustomerFormValues } from "./schemas/customerSchema";
import { countries, usStates, canadianProvinces } from "./schemas/locationData";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { AddressAutocomplete } from "./AddressAutocomplete";

interface AddressFieldsProps {
  form: UseFormReturn<CustomerFormValues>;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({ form }) => {
  const [regionOptions, setRegionOptions] = useState<{code: string, name: string}[]>([]);
  const countryValue = form.watch("country");

  useEffect(() => {
    // Update region options based on selected country
    if (countryValue === "US") {
      setRegionOptions(usStates);
    } else if (countryValue === "CA") {
      setRegionOptions(canadianProvinces);
    } else {
      setRegionOptions([]);
    }
  }, [countryValue]);

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Street Address</FormLabel>
            <FormControl>
              <AddressAutocomplete form={form} field={field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="Enter city" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="postal_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Postal/Zip Code</FormLabel>
              <FormControl>
                <Input placeholder="Enter postal code" {...field} value={field.value || ''} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="country"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value}
                value={field.value || "_none"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code || "_unknown"}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="state"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {countryValue === "US" ? "State" : 
                 countryValue === "CA" ? "Province" : 
                 "State/Province/Region"}
              </FormLabel>
              {regionOptions.length > 0 ? (
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                  value={field.value || "_none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${countryValue === "US" ? "a state" : 
                                              countryValue === "CA" ? "a province" : 
                                              "a region"}`} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {regionOptions.map((region) => (
                      <SelectItem key={region.code} value={region.code || "_unknown"}>
                        {region.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <FormControl>
                  <Input 
                    placeholder="Enter state/province/region" 
                    {...field} 
                    value={field.value || ''} 
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};
