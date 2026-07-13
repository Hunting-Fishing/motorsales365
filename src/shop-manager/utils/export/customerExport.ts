
import { Customer } from "@/types/customer";
import { formatPhoneNumber } from "@/utils/formatters";

/**
 * Convert a customer object to a vCard format for exporting contacts
 */
export function customerToVcard(customer: Customer): string {
  // Start building vCard
  let vcard = 'BEGIN:VCARD\n';
  vcard += 'VERSION:3.0\n';
  
  // Name information
  vcard += `FN:${customer.first_name} ${customer.last_name}\n`;
  vcard += `N:${customer.last_name};${customer.first_name};;;\n`;
  
  // Organization if available
  if (customer.company) {
    vcard += `ORG:${customer.company}\n`;
  }
  
  // Phone number if available
  if (customer.phone) {
    vcard += `TEL;TYPE=CELL:${customer.phone}\n`;
  }
  
  // Email if available
  if (customer.email) {
    vcard += `EMAIL:${customer.email}\n`;
  }
  
  // Address if available
  if (customer.address) {
    vcard += `ADR;TYPE=HOME:;;${customer.address};;;;\n`;
  }
  
  // Add notes if available
  if (customer.notes) {
    // Clean up notes to avoid breaking vCard format
    const cleanNotes = customer.notes.replace(/\n/g, '\\n');
    vcard += `NOTE:${cleanNotes}\n`;
  }
  
  // End vCard
  vcard += 'END:VCARD';
  
  return vcard;
}
