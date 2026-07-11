// Form Category type
export interface FormCategory {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  count?: number;
}

export interface FormCategoryResponse {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'date'
  | 'email'
  | 'phone'
  | 'file'
  | 'signature';

export type ConditionOperator = 
  | 'equals' 
  | 'not_equals' 
  | 'contains' 
  | 'not_contains'
  | 'greater_than' 
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export type ConditionType = 'show' | 'hide';

export interface ConditionalRule {
  id: string;
  formFieldId: string;
  conditionFieldId: string;
  conditionType: ConditionType;
  conditionOperator: ConditionOperator;
  conditionValue: string;
}

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldValidation {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
}

export interface FormBuilderField {
  id: string;
  sectionId: string;
  label: string;
  fieldType: FormFieldType;
  placeholder?: string;
  helpText?: string;
  isRequired: boolean;
  displayOrder: number;
  options?: FormFieldOption[];
  defaultValue?: string;
  validationRules?: FormFieldValidation;
  conditionalRules?: ConditionalRule[];
}

export interface FormBuilderSection {
  id: string;
  templateId: string;
  title: string;
  description?: string;
  displayOrder: number;
  fields: FormBuilderField[];
}

export interface FormBuilderTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  isPublished: boolean;
  version: number;
  sections: FormBuilderSection[];
  createdAt?: string;
  updatedAt?: string;
}
