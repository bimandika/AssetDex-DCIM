import { PropertyDefinition } from '@/hooks/usePropertyDefinitions';

/**
 * Supported property types for dynamic forms
 */
export type DynamicPropertyType = 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect';

/**
 * Property validation options that can be stored in the options JSONB field
 */
export interface PropertyValidationOptions {
  // String validations
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternMessage?: string;
  
  // Number validations
  min?: number;
  max?: number;
  step?: number;
  
  // Array validations (for multiselect)
  minItems?: number;
  maxItems?: number;
  
  // Select/multiselect options
  options?: Array<{ value: string; label: string; description?: string }>;
  
  // UI hints
  placeholder?: string;
  helpText?: string;
  fieldWidth?: 'full' | 'half' | 'third' | 'quarter';
  
  // Advanced options
  conditional?: {
    field: string;
    value: any;
    operator: 'equals' | 'not_equals' | 'contains' | 'not_contains';
  };
}

/**
 * Enhanced property definition with type safety
 */
export interface TypedPropertyDefinition extends Omit<PropertyDefinition, 'property_type' | 'options'> {
  property_type: DynamicPropertyType;
  options: PropertyValidationOptions | null;
}

/**
 * Form field configuration derived from property definition
 */
export interface DynamicFormFieldConfig {
  key: string;
  name: string;
  displayName: string;
  type: DynamicPropertyType;
  required: boolean;
  defaultValue: any;
  placeholder?: string;
  description?: string;
  category?: string;
  sortOrder: number;
  options?: Array<{ value: string; label: string; description?: string }>;
  validation: PropertyValidationOptions;
  ui: {
    component: string;
    width: 'full' | 'half' | 'third' | 'quarter';
    helpText?: string;
    conditional?: PropertyValidationOptions['conditional'];
  };
}

/**
 * Form schema generated from property definitions
 */
export interface DynamicFormSchema {
  fields: DynamicFormFieldConfig[];
  categories: string[];
  defaultValues: Record<string, any>;
  validationSchema: any; // Zod schema
  metadata: {
    totalFields: number;
    requiredFields: number;
    fieldsByCategory: Record<string, number>;
    lastUpdated: string;
  };
}

/**
 * Form submission data with type safety
 */
export interface DynamicFormData {
  // Core server fields (always present)
  hostname: string;
  serial_number: string;
  status: string;
  device_type: string;
  dc_site: string;
  unit_height: number;
  
  // Dynamic fields (based on property definitions)
  [key: string]: any;
}

/**
 * Form validation result
 */
export interface FormValidationResult {
  success: boolean;
  data?: DynamicFormData;
  errors?: Record<string, string[]>;
  warnings?: Record<string, string[]>;
}

/**
 * Property definition with server schema information
 */
export interface PropertyDefinitionWithSchema extends TypedPropertyDefinition {
  column_exists: boolean;
  column_type: string;
  is_nullable: string;
  schema_matches: boolean; // Whether the column type matches the property type
}

/**
 * Form field state for React Hook Form
 */
export interface DynamicFormFieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

/**
 * Form context for managing dynamic forms
 */
export interface DynamicFormContext {
  schema: DynamicFormSchema;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;
  isValid: boolean;
  submitCount: number;
  
  // Actions
  refetchSchema: () => Promise<void>;
  validateField: (fieldKey: string, value: any) => Promise<string | undefined>;
  resetForm: () => void;
  submitForm: (data: DynamicFormData) => Promise<FormValidationResult>;
}

/**
 * Property manager integration types
 */
export interface PropertyManagerEvent {
  type: 'property_added' | 'property_updated' | 'property_deleted';
  property: TypedPropertyDefinition;
  timestamp: string;
}

/**
 * Form renderer configuration
 */
export interface FormRendererConfig {
  showCategories: boolean;
  columnsPerRow: 1 | 2 | 3;
  enableConditionalFields: boolean;
  enableFieldValidation: boolean;
  enableAutoSave: boolean;
  autoSaveInterval?: number; // milliseconds
  
  // Styling
  fieldSpacing: 'compact' | 'normal' | 'relaxed';
  categoryStyle: 'cards' | 'sections' | 'tabs';
  
  // Behavior
  validateOnChange: boolean;
  validateOnBlur: boolean;
  showFieldDescriptions: boolean;
  showRequiredIndicators: boolean;
  showOptionalIndicators: boolean;
}

/**
 * Type guards for property types
 */
export const isTextProperty = (property: TypedPropertyDefinition): boolean => 
  property.property_type === 'text';

export const isNumberProperty = (property: TypedPropertyDefinition): boolean => 
  property.property_type === 'number';

export const isBooleanProperty = (property: TypedPropertyDefinition): boolean => 
  property.property_type === 'boolean';

export const isDateProperty = (property: TypedPropertyDefinition): boolean => 
  property.property_type === 'date';

export const isSelectProperty = (property: TypedPropertyDefinition): boolean => 
  property.property_type === 'select';

export const isMultiSelectProperty = (property: TypedPropertyDefinition): boolean => 
  property.property_type === 'multiselect';

/**
 * Utility type for extracting property values based on type
 */
export type PropertyValue<T extends DynamicPropertyType> = 
  T extends 'text' ? string :
  T extends 'number' ? number :
  T extends 'boolean' ? boolean :
  T extends 'date' ? string :
  T extends 'select' ? string :
  T extends 'multiselect' ? string[] :
  any;

/**
 * Type-safe property value getter
 */
export function getPropertyValue<T extends DynamicPropertyType>(
  data: DynamicFormData,
  property: TypedPropertyDefinition & { property_type: T }
): PropertyValue<T> | null {
  return data[property.key] ?? null;
}

/**
 * Server integration types
 */
export interface ServerWithDynamicProperties {
  // Core server fields
  id: string;
  hostname: string;
  serial_number: string;
  status: string;
  device_type: string;
  dc_site: string;
  unit_height: number;
  created_at: string;
  updated_at: string;
  
  // Dynamic properties
  dynamic_properties: Record<string, any>;
}

/**
 * API response types for property form manager
 */
export interface PropertyFormManagerResponse {
  success: boolean;
  data?: DynamicFormSchema;
  enhanced?: boolean;
  error?: string;
}

export interface PropertyDefinitionsResponse {
  success: boolean;
  data?: TypedPropertyDefinition[];
  error?: string;
}