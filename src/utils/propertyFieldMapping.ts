import * as z from 'zod';
import { PropertyDefinition } from '@/hooks/usePropertyDefinitions';

/**
 * Maps property types to their corresponding form field components
 */
export const PROPERTY_FIELD_MAPPING = {
  text: 'Input',
  number: 'NumberInput',
  boolean: 'Switch',
  date: 'DatePicker',
  select: 'Select',
  multiselect: 'MultiSelect',
} as const;

/**
 * Maps property types to their default values
 */
export const PROPERTY_DEFAULT_VALUES = {
  text: '',
  number: 0,
  boolean: false,
  date: null,
  select: '',
  multiselect: [],
} as const;

/**
 * Maps property types to their TypeScript types
 */
export type PropertyTypeMapping = {
  text: string;
  number: number;
  boolean: boolean;
  date: string | null;
  select: string;
  multiselect: string[];
};

/**
 * Validates if a property type is supported
 */
export const isValidPropertyType = (type: string): type is keyof typeof PROPERTY_FIELD_MAPPING => {
  return type in PROPERTY_FIELD_MAPPING;
};

/**
 * Gets the appropriate form field component name for a property type
 */
export const getFormFieldComponent = (propertyType: string): string => {
  if (!isValidPropertyType(propertyType)) {
    console.warn(`Unknown property type: ${propertyType}, defaulting to Input`);
    return 'Input';
  }
  return PROPERTY_FIELD_MAPPING[propertyType];
};

/**
 * Gets the default value for a property type
 */
export const getDefaultValueForType = (propertyType: string, required: boolean = false): any => {
  if (!isValidPropertyType(propertyType)) {
    return required ? '' : null;
  }
  
  const defaultValue = PROPERTY_DEFAULT_VALUES[propertyType];
  return required ? defaultValue : null;
};

/**
 * Converts a property definition to a form field configuration
 */
export interface FormFieldConfig {
  key: string;
  name: string;
  displayName: string;
  type: keyof typeof PROPERTY_FIELD_MAPPING;
  component: string;
  required: boolean;
  defaultValue: any;
  placeholder: string;
  description?: string;
  category?: string;
  options?: Array<{ value: string; label: string }>;
  validation: {
    type: string;
    required: boolean;
    enum?: string[];
    min?: number;
    max?: number;
  };
}

export const propertyToFormField = (property: PropertyDefinition): FormFieldConfig => {
  const fieldType = isValidPropertyType(property.property_type) 
    ? property.property_type 
    : 'text';

  const config: FormFieldConfig = {
    key: property.key,
    name: property.name,
    displayName: property.display_name,
    type: fieldType,
    component: getFormFieldComponent(fieldType),
    required: property.required,
    defaultValue: property.default_value ?? getDefaultValueForType(fieldType, property.required),
    placeholder: `Enter ${property.display_name.toLowerCase()}`,
    description: property.description || undefined,
    category: property.category || 'Additional',
    validation: {
      type: fieldType,
      required: property.required,
    },
  };

  // Handle select/multiselect options
  if (property.options && (fieldType === 'select' || fieldType === 'multiselect')) {
    if (Array.isArray(property.options)) {
      config.options = property.options.map((option: any) => ({
        value: typeof option === 'string' ? option : option.value,
        label: typeof option === 'string' ? option : option.label || option.value,
      }));
    } else if (typeof property.options === 'object' && property.options.options) {
      config.options = property.options.options.map((option: any) => ({
        value: typeof option === 'string' ? option : option.value,
        label: typeof option === 'string' ? option : option.label || option.value,
      }));
    }

    if (config.options && fieldType === 'select') {
      config.validation.enum = config.options.map(opt => opt.value);
    }
  }

  return config;
};

/**
 * Converts multiple property definitions to form field configurations
 */
export const propertiesToFormFields = (properties: PropertyDefinition[]): FormFieldConfig[] => {
  return properties
    .map(propertyToFormField)
    .sort((a, b) => {
      // Sort by category first, then by display name
      const categoryA = a.category || 'Additional';
      const categoryB = b.category || 'Additional';
      if (categoryA !== categoryB) {
        return categoryA.localeCompare(categoryB);
      }
      return a.displayName.localeCompare(b.displayName);
    });
};

/**
 * Groups form fields by category
 */
export const groupFieldsByCategory = (fields: FormFieldConfig[]): Record<string, FormFieldConfig[]> => {
  return fields.reduce((acc, field) => {
    const category = field.category || 'Additional';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(field);
    return acc;
  }, {} as Record<string, FormFieldConfig[]>);
};

/**
 * Gets all unique categories from form fields
 */
export const getFieldCategories = (fields: FormFieldConfig[]): string[] => {
  const categories = [...new Set(fields.map(field => field.category || 'Additional'))];
  return categories.sort((a, b) => {
    // Sort with 'Additional' first, then alphabetically
    if (a === 'Additional') return -1;
    if (b === 'Additional') return 1;
    return a.localeCompare(b);
  });
};