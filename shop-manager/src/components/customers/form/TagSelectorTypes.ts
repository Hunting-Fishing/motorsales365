
// Define the expected props for the TagSelector component
export interface TagSelectorFormProps {
  setValue: (name: string, value: string[]) => void;
  watch: () => string[];
}

export interface TagSelectorFieldProps {
  name: string;
  value: string[];
  onChange: (value: string[]) => void;
}

export interface FormTagSelectorProps {
  form: TagSelectorFormProps;
  field: TagSelectorFieldProps;
  disabled?: boolean;
}
