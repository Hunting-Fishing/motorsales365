
import { supabase } from "@/integrations/supabase/client";
import { CustomerCreate } from "@/types/customer";

// Import customers from CSV file
export const importCustomersFromCSV = async (file: File): Promise<{ imported: number, errors: string[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const errors: string[] = [];
    let importCount = 0;
    
    reader.onload = async (event) => {
      try {
        const csvContent = event.target?.result as string;
        const lines = csvContent.split('\n');
        
        // Extract headers (first line)
        const headers = lines[0].split(',').map(header => header.trim().toLowerCase());
        
        // Validate required headers
        const requiredFields = ['first_name', 'last_name'];
        for (const field of requiredFields) {
          if (!headers.includes(field)) {
            reject(new Error(`CSV is missing required field: ${field}`));
            return;
          }
        }
        
        // Process each customer row
        const customers: CustomerCreate[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue; // Skip empty lines
          
          const values = lines[i].split(',').map(value => value.trim());
          if (values.length !== headers.length) {
            errors.push(`Row ${i} has incorrect number of fields`);
            continue;
          }
          
          // Create customer object from CSV row
          const customer: Record<string, any> = {
            shop_id: "DEFAULT-SHOP-ID", // Default shop ID
          };
          
          headers.forEach((header, index) => {
            if (header && values[index]) {
              customer[header] = values[index];
            }
          });
          
          // Add to batch if required fields are present
          if (customer.first_name && customer.last_name) {
            customers.push(customer as CustomerCreate);
          } else {
            errors.push(`Row ${i} is missing required fields`);
          }
        }
        
        // Insert customers in batches
        if (customers.length > 0) {
          const { data, error } = await supabase
            .from("customers")
            .insert(customers);
            
          if (error) {
            reject(new Error(`Failed to import customers: ${error.message}`));
            return;
          }
          
          importCount = customers.length;
        }
        
        resolve({ imported: importCount, errors });
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error("Failed to read CSV file"));
    };
    
    reader.readAsText(file);
  });
};
