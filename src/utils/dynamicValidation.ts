import * as z from 'zod';
import { PropertyDefinition } from '@/hooks/usePropertyDefinitions';

/**
 * Generates a Zod validation schema from property definitions
 */
export const generateDynamicValidationSchema = (properties: PropertyDefinition[]): z.ZodSchema => {
  if (!properties.length) {
    return z.object({});
  }

  const schemaFields: Record<string, z.ZodSchema> = {};

  properties.forEach((property) => {
    let validator: z.ZodSchema;

    switch (property.property_type) {
      case 'number':
        validator = z.number({
          required_error: `${property.display_name} is required`,
          invalid_type_error: `${property.display_name} must be a number`,
        });
        
        // Add number-specific validations if they exist in options
        if (property.options && typeof property.options === 'object') {
          if (property.options.min !== undefined) {
            validator = (validator as z.ZodNumber).min(
              property.options.min, 
              `${property.display_name} must be at least ${property.options.min}`
            );
          }
          if (property.options.max !== undefined) {
            validator = (validator as z.ZodNumber).max(
              property.options.max, 
              `${property.display_name} must be at most ${property.options.max}`
            );
          }
          if (property.options.step !== undefined) {
            validator = (validator as z.ZodNumber).step(
              property.options.step,
              `${property.display_name} must be a multiple of ${property.options.step}`
            );
          }
        }
        
        if (!property.required) {
          validator = validator.optional().nullable();
        }
        break;

      case 'boolean':
        validator = z.boolean({
          required_error: `${property.display_name} is required`,
          invalid_type_error: `${property.display_name} must be true or false`,
        });
        
        if (!property.required) {
          validator = validator.optional().nullable();
        }
        break;

      case 'date':
        validator = z.string({
          required_error: `${property.display_name} is required`,
        }).datetime({ 
          message: `${property.display_name} must be a valid date`,
          offset: true 
        });
        
        if (!property.required) {
          validator = validator.optional().nullable();
        }
        break;

      case 'select':
        if (property.options) {
          let validValues: string[] = [];
          
          if (Array.isArray(property.options)) {
            validValues = property.options.map((option: any) => 
              typeof option === 'string' ? option : option.value
            );
          } else if (typeof property.options === 'object' && property.options.options) {
            validValues = property.options.options.map((option: any) => 
              typeof option === 'string' ? option : option.value
            );
          }
          
          if (validValues.length > 0) {
            validator = z.enum(validValues as [string, ...string[]], {
              required_error: `${property.display_name} is required`,
              invalid_type_error: `${property.display_name} must be one of: ${validValues.join(', ')}`,
            });
          } else {
            validator = z.string({
              required_error: `${property.display_name} is required`,
            });
          }
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
        if (property.options) {
          let validValues: string[] = [];
          
          if (Array.isArray(property.options)) {
            validValues = property.options.map((option: any) => 
              typeof option === 'string' ? option : option.value
            );
          } else if (typeof property.options === 'object' && property.options.options) {
            validValues = property.options.options.map((option: any) => 
              typeof option === 'string' ? option : option.value
            );
          }
          
          if (validValues.length > 0) {
            validator = z.array(z.enum(validValues as [string, ...string[]]));
          } else {
            validator = z.array(z.string());
          }
        } else {
          validator = z.array(z.string());
        }
        
        // Add array-specific validations if they exist in options
        if (property.options && typeof property.options === 'object') {
          if (property.options.minItems !== undefined) {
            validator = (validator as z.ZodArray<any>).min(
              property.options.minItems,
              `${property.display_name} must have at least ${property.options.minItems} item(s)`
            );
          }
          if (property.options.maxItems !== undefined) {
            validator = (validator as z.ZodArray<any>).max(
              property.options.maxItems,
              `${property.display_name} must have at most ${property.options.maxItems} item(s)`
            );
          }
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
        
        // Add string-specific validations if they exist in options
        if (property.options && typeof property.options === 'object') {
          if (property.options.minLength !== undefined) {
            validator = (validator as z.ZodString).min(
              property.options.minLength,
              `${property.display_name} must be at least ${property.options.minLength} character(s)`
            );
          }
          if (property.options.maxLength !== undefined) {
            validator = (validator as z.ZodString).max(
              property.options.maxLength,
              `${property.display_name} must be at most ${property.options.maxLength} character(s)`
            );
          }
          if (property.options.pattern !== undefined) {
            try {
              const regex = new RegExp(property.options.pattern);
              validator = (validator as z.ZodString).regex(
                regex,
                property.options.patternMessage || `${property.display_name} format is invalid`
              );
            } catch (error) {
              console.warn(`Invalid regex pattern for ${property.key}:`, property.options.pattern);
            }
          }
        }
        
        if (property.required) {
          validator = (validator as z.ZodString).min(1, `${property.display_name} is required`);
        } else {
          validator = validator.optional().nullable();
        }
        break;
    }

    schemaFields[property.key] = validator;
  });

  return z.object(schemaFields);
};

/**
 * Generates default values for form fields based on property definitions
 */
export const generateDefaultValues = (properties: PropertyDefinition[]): Record<string, any> => {
  const defaultValues: Record<string, any> = {};

  properties.forEach((property) => {
    if (property.default_value !== null && property.default_value !== undefined) {
      // Parse default value based on property type
      switch (property.property_type) {
        case 'number':
          defaultValues[property.key] = Number(property.default_value);
          break;
        case 'boolean':
          defaultValues[property.key] = property.default_value === 'true' || property.default_value === true;
          break;
        case 'multiselect':
          try {
            defaultValues[property.key] = Array.isArray(property.default_value) 
              ? property.default_value 
              : JSON.parse(property.default_value);
          } catch {
            defaultValues[property.key] = [];
          }
          break;
        case 'date':
          // Ensure date is in ISO format
          try {
            defaultValues[property.key] = new Date(property.default_value).toISOString();
          } catch {
            defaultValues[property.key] = null;
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
        case 'date':
          defaultValues[property.key] = null;
          break;
        default:
          defaultValues[property.key] = property.required ? '' : null;
      }
    }
  });

  return defaultValues;
};

/**
 * Validates form data against dynamic property definitions
 */
export const validateDynamicFormData = async (
  data: Record<string, any>,
  properties: PropertyDefinition[]
): Promise<{ success: boolean; errors?: Record<string, string[]>; data?: Record<string, any> }> => {
  try {
    const schema = generateDynamicValidationSchema(properties);
    const validatedData = await schema.parseAsync(data);
    
    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string[]> = {};
      
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!errors[path]) {
          errors[path] = [];
        }
        errors[path].push(err.message);
      });
      
      return {
        success: false,
        errors,
      };
    }
    
    return {
      success: false,
      errors: {
        general: ['Validation failed with unknown error'],
      },
    };
  }
};

/**
 * Transforms form data for submission to the server
 */
export const transformFormDataForSubmission = (
  data: Record<string, any>,
  properties: PropertyDefinition[]
): Record<string, any> => {
  const transformed: Record<string, any> = { ...data };

  properties.forEach((property) => {
    const value = transformed[property.key];
    
    if (value === null || value === undefined) {
      return;
    }

    switch (property.property_type) {
      case 'date':
        // Ensure date is in proper format for database
        if (typeof value === 'string') {
          try {
            transformed[property.key] = new Date(value).toISOString();
          } catch {
            transformed[property.key] = null;
          }
        }
        break;
      
      case 'multiselect':
        // Ensure multiselect is stored as JSON string if needed
        if (Array.isArray(value)) {
          transformed[property.key] = value;
        } else {
          transformed[property.key] = [];
        }
        break;
      
      case 'number':
        // Ensure number is properly typed
        if (typeof value === 'string' && value !== '') {
          transformed[property.key] = Number(value);
        } else if (value === '') {
          transformed[property.key] = null;
        }
        break;
      
      case 'boolean':
        // Ensure boolean is properly typed
        transformed[property.key] = Boolean(value);
        break;
      
      default:
        // For text and select, keep as-is but handle empty strings
        if (typeof value === 'string' && value === '' && !property.required) {
          transformed[property.key] = null;
        }
    }
  });

  return transformed;
};