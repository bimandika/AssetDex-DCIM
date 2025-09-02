import React, { useEffect } from 'react';
import { Control, FieldErrors, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DynamicFormFieldRenderer } from './DynamicFormField';
import { DynamicFormField } from '@/hooks/useDynamicFormSchema';

interface DynamicFormRendererProps {
  fields: DynamicFormField[];
  control: Control<any>;
  setValue: UseFormSetValue<any>;
  errors: FieldErrors;
  className?: string;
  showCategories?: boolean;
  columnsPerRow?: 1 | 2 | 3;
}

export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
  fields,
  control,
  setValue,
  errors,
  className = '',
  showCategories = true,
  columnsPerRow = 2,
}) => {
  // Auto-save form data every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      const values: Record<string, any> = {};
      fields.forEach(field => {
        values[field.key] = control.getValues()[field.key];
      });
      localStorage.setItem('form_dynamicFormRenderer', JSON.stringify(values));
    }, 5000);
    return () => clearInterval(timer);
  }, [fields, control]);

  // Restore form data on mount
  useEffect(() => {
    const saved = localStorage.getItem('form_dynamicFormRenderer');
    if (saved && saved !== "undefined") {
      try {
        const values = JSON.parse(saved);
        Object.entries(values).forEach(([key, value]) => {
          setValue(key, value);
        });
      } catch (error) {
        console.warn('Failed to restore form data:', error);
      }
    }
  }, [setValue]);

  if (!fields.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No dynamic properties configured
      </div>
    );
  }

  const groupedFields = showCategories 
    ? fields.reduce((acc, field) => {
        const category = field.category || 'Additional';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(field);
        return acc;
      }, {} as Record<string, DynamicFormField[]>)
    : { 'All Fields': fields };

  const getGridClass = () => {
    switch (columnsPerRow) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-1 md:grid-cols-2';
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      default:
        return 'grid-cols-1 md:grid-cols-2';
    }
  };

  const renderFieldsGrid = (categoryFields: DynamicFormField[]) => (
    <div className={`grid gap-4 ${getGridClass()}`}>
      {categoryFields.map((field) => (
        <DynamicFormFieldRenderer
          key={field.key}
          field={field}
          control={control}
          error={errors[field.key] as any}
        />
      ))}
    </div>
  );

  const renderCategorySection = (category: string, categoryFields: DynamicFormField[], index: number) => {
    if (!showCategories) {
      return renderFieldsGrid(categoryFields);
    }

    return (
      <div key={category}>
        {index > 0 && <Separator className="my-6" />}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-medium">
              {category}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({categoryFields.length} field{categoryFields.length !== 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderFieldsGrid(categoryFields)}
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={className}>
      {Object.entries(groupedFields)
        .sort(([a], [b]) => {
          if (a === 'Additional') return -1;
          if (b === 'Additional') return 1;
          return a.localeCompare(b);
        })
        .map(([category, categoryFields], index) =>
          renderCategorySection(category, categoryFields, index)
        )}
    </div>
  );
};

export default DynamicFormRenderer;