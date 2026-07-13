
import { UseFormReturn } from "react-hook-form";
import { CustomerFormValues } from "../../schemas/customerSchema";

export interface BaseFieldProps {
  form: UseFormReturn<CustomerFormValues>;
  index: number;
}
