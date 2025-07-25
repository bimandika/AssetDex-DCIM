import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PropertyDefinition {
  id: string;
  key: string;
  name: string;
  display_name: string;
  property_type: string;
  description: string | null;
  category: string | null;
  required: boolean;
  default_value: string | null;
  options: any | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PropertyDefinitionWithSchema extends PropertyDefinition {
  column_exists: boolean;
  column_type: string;
  is_nullable: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'get-form-schema';

    switch (action) {
      case 'get-form-schema':
        return await getFormSchema(supabaseClient);
      
      case 'get-property-definitions':
        return await getPropertyDefinitions(supabaseClient);
      
      case 'get-enhanced-properties':
        return await getEnhancedProperties(supabaseClient);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action. Supported actions: get-form-schema, get-property-definitions, get-enhanced-properties' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
    }

  } catch (error) {
    console.error('Error in property-form-manager:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getFormSchema(supabaseClient: any) {
  try {
    // Get enhanced property definitions with schema information
    const { data: properties, error } = await supabaseClient
      .rpc('get_property_definitions_with_schema');

    if (error) {
      console.error('Error fetching enhanced properties:', error);
      // Fallback to basic property definitions
      return await getPropertyDefinitions(supabaseClient);
    }

    const formSchema = generateFormSchema(properties || []);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: formSchema,
        enhanced: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error generating form schema:', error);
    throw error;
  }
}

async function getPropertyDefinitions(supabaseClient: any) {
  try {
    const { data: properties, error } = await supabaseClient
      .from('property_definitions')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    const formSchema = generateFormSchema(properties || [], false);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: formSchema,
        enhanced: false 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching property definitions:', error);
    throw error;
  }
}

async function getEnhancedProperties(supabaseClient: any) {
  try {
    const { data: properties, error } = await supabaseClient
      .rpc('get_property_definitions_with_schema');

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: properties || [],
        enhanced: true 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error fetching enhanced properties:', error);
    throw error;
  }
}

function generateFormSchema(properties: PropertyDefinition[] | PropertyDefinitionWithSchema[], enhanced: boolean = true) {
  const fields = [];
  const validationRules = {};
  const defaultValues = {};

  properties.forEach((property) => {
    // Create form field definition
    const field = {
      key: property.key,
      name: property.name,
      displayName: property.display_name,
      type: property.property_type,
      required: property.required,
      defaultValue: property.default_value,
      description: property.description,
      category: property.category,
      placeholder: `Enter ${property.display_name.toLowerCase()}`,
      options: null,
    };

    // Handle options for select/multiselect fields
    if (property.options && (property.property_type === 'select' || property.property_type === 'multiselect')) {
      if (Array.isArray(property.options)) {
        field.options = property.options.map((option: any) => ({
          value: typeof option === 'string' ? option : option.value,
          label: typeof option === 'string' ? option : option.label || option.value,
        }));
      } else if (typeof property.options === 'object' && property.options.options) {
        field.options = property.options.options.map((option: any) => ({
          value: typeof option === 'string' ? option : option.value,
          label: typeof option === 'string' ? option : option.label || option.value,
        }));
      }
    }

    // Add enhanced schema information if available
    if (enhanced && 'column_exists' in property) {
      field.columnExists = property.column_exists;
      field.columnType = property.column_type;
      field.isNullable = property.is_nullable;
    }

    fields.push(field);

    // Create validation rules
    const validation = {
      type: property.property_type,
      required: property.required,
    };

    if (property.property_type === 'select' && field.options) {
      validation.enum = field.options.map(opt => opt.value);
    }

    validationRules[property.key] = validation;

    // Set default values
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
      // Set appropriate empty values
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

  // Sort fields by category and name
  fields.sort((a, b) => {
    const categoryA = a.category || 'General';
    const categoryB = b.category || 'General';
    if (categoryA !== categoryB) {
      return categoryA.localeCompare(categoryB);
    }
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    fields,
    validationRules,
    defaultValues,
    categories: [...new Set(fields.map(f => f.category || 'General'))].sort(),
    fieldCount: fields.length,
    requiredFieldCount: fields.filter(f => f.required).length,
  };
}