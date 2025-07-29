import { useMemo } from 'react';
import * as z from 'zod';
import { usePropertyDefinitions, PropertyDefinition } from './usePropertyDefinitions';
import { useServerEnums } from './useServerEnums';

export interface DynamicFormField {
  key: string;
  name: string;
  displayName: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'multiselect' | 'enum';
  required: boolean;
  defaultValue: any;
  options?: Array<{ value: string; label: string }>;
  description?: string;
  category?: string;
  placeholder?: string;
  validation?: z.ZodSchema;
}

export interface DynamicFormSchema {
  fields: DynamicFormField[];
  validationSchema: z.ZodSchema;
  defaultValues: Record<string, any>;
}

interface UseDynamicFormSchemaReturn {
  formSchema: DynamicFormSchema;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useDynamicFormSchema = (): UseDynamicFormSchemaReturn => {
  const { properties, isLoading: propertiesLoading, error, refetch } = usePropertyDefinitions();
  const { enums, loading: enumsLoading } = useServerEnums();

  // Helper function to get live enum values for a property
  const getLiveEnumValues = (property: PropertyDefinition): Array<{ value: string; label: string }> => {
    // Try to get live enum values from the enums context first
    const enumKey = property.key;
    
    // Check if we have live enum values in the enums object
    if (enums && enums[enumKey] && Array.isArray(enums[enumKey])) {
      return enums[enumKey].map((value: string) => ({
        value,
        label: value
      }));
    }
    
    // Fallback to property definition options if no live enums found
    if (property.options && Array.isArray(property.options)) {
      return property.options.map((option: any) => ({
        value: typeof option === 'string' ? option : option.value,
        label: typeof option === 'string' ? option : option.label || option.value,
      }));
    } else if (property.options && typeof property.options === 'object' && property.options.options) {
      return property.options.options.map((option: any) => ({
        value: typeof option === 'string' ? option : option.value,
        label: typeof option === 'string' ? option : option.label || option.value,
      }));
    }
    
    return [];
  };

  const formSchema = useMemo(() => {
    if (!properties.length) {
      return {
        fields: [],
        validationSchema: z.object({}),
        defaultValues: {},
      };
    }

    const fields: DynamicFormField[] = [];
    const schemaFields: Record<string, z.ZodSchema> = {};
    const defaultValues: Record<string, any> = {};

    properties.forEach((property: PropertyDefinition) => {
      // Create form field definition
      const field: DynamicFormField = {
        key: property.key,
        name: property.name,
        displayName: property.display_name,
        type: property.property_type === 'enum' ? 'select' : property.property_type, // Map enum to select for rendering
        required: property.required,
        defaultValue: property.default_value,
        description: property.description || undefined,
        category: property.category || undefined,
        placeholder: `Enter ${property.display_name.toLowerCase()}`,
      };

      // Handle options for select/multiselect/enum fields
      if (property.property_type === 'select' || property.property_type === 'multiselect' || property.property_type === 'enum') {
        // Use live enum values for better synchronization
        field.options = getLiveEnumValues(property);
      }

      fields.push(field);

      // Create Zod validation schema
      let validator: z.ZodSchema;

      switch (property.property_type) {
        case 'number':
          validator = z.number({
            required_error: `${property.display_name} is required`,
            invalid_type_error: `${property.display_name} must be a number`,
          });
          if (!property.required) {
            validator = validator.optional().nullable();
          }
          break;

        case 'boolean':
          validator = z.boolean({
            required_error: `${property.display_name} is required`,
          });
          if (!property.required) {
            validator = validator.optional().nullable();
          }
          break;

        case 'date':
          validator = z.string({
            required_error: `${property.display_name} is required`,
          }).datetime({ message: `${property.display_name} must be a valid date` });
          if (!property.required) {
            validator = validator.optional().nullable();
          }
          break;

        case 'select':
        case 'enum': // Handle enum same as select
          if (field.options && field.options.length > 0) {
            const validValues = field.options.map(opt => opt.value);
            validator = z.enum(validValues as [string, ...string[]], {
              required_error: `${property.display_name} is required`,
              invalid_type_error: `${property.display_name} must be one of: ${validValues.join(', ')}`,
            });
          } else {
            validator = z.string({
              required_error: `${property.display_name} is required`,
            });
          }
          if (!property.required) {
            validator = validator.optional().nullable();
          }
          break;

        case 'multiselect':
          if (field.options && field.options.length > 0) {
            const validValues = field.options.map(opt => opt.value);
            validator = z.array(z.enum(validValues as [string, ...string[]]));
          } else {
            validator = z.array(z.string());
          }
          if (!property.required) {
            validator = validator.optional().nullable();
          }
          break;

        case 'text':
        default:
          validator = z.string({
            required_error: `${property.display_name} is required`,
          });
          
          if (property.required) {
            validator = validator.min(1, `${property.display_name} is required`);
          } else {
            validator = validator.optional().nullable();
          }
          break;
      }

      schemaFields[property.key] = validator;

      // Set default value
      if (property.default_value !== null) {
        switch (property.property_type) {
          case 'number':
            defaultValues[property.key] = Number(property.default_value);
            break;
          case 'boolean':
            defaultValues[property.key] = property.default_value === 'true';
            break;
          case 'multiselect':
            try {
              defaultValues[property.key] = JSON.parse(property.default_value);
            } catch {
              defaultValues[property.key] = [];
            }
            break;
          default:
            defaultValues[property.key] = property.default_value;
        }
      } else {
        // Set appropriate empty values for non-required fields
        switch (property.property_type) {
          case 'number':
            defaultValues[property.key] = property.required ? 0 : null;
            break;
          case 'boolean':
            defaultValues[property.key] = property.required ? false : null;
            break;
          case 'multiselect':
            defaultValues[property.key] = property.required ? [] : null;
            break;
          default:
            defaultValues[property.key] = property.required ? '' : null;
        }
      }
    });

    return {
      fields: fields.sort((a, b) => {
        // Sort by category first, then by display name
        const categoryA = a.category || 'Additional';
        const categoryB = b.category || 'Additional';
        if (categoryA !== categoryB) {
          return categoryA.localeCompare(categoryB);
        }
        return a.displayName.localeCompare(b.displayName);
      }),
      validationSchema: z.object(schemaFields),
      defaultValues,
    };
  }, [properties, enums]); // Add enums as dependency so form updates when enums change

  const isLoading = propertiesLoading || enumsLoading;

  return {
    formSchema,
    isLoading,
    error,
    refetch,
  };
};