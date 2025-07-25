import React from 'react';
import { Controller, Control, FieldError } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DynamicFormField } from '@/hooks/useDynamicFormSchema';

interface DynamicFormFieldProps {
  field: DynamicFormField;
  control: Control<any>;
  error?: FieldError;
  className?: string;
}

export const DynamicFormFieldRenderer: React.FC<DynamicFormFieldProps> = ({
  field,
  control,
  error,
  className = '',
}) => {
  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => (
              <Input
                {...controllerField}
                value={controllerField.value || ''}
                placeholder={field.placeholder}
                className={cn(error && 'border-red-500')}
              />
            )}
          />
        );

      case 'number':
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => (
              <Input
                {...controllerField}
                type="number"
                value={controllerField.value || ''}
                placeholder={field.placeholder}
                className={cn(error && 'border-red-500')}
                onChange={(e) => {
                  const value = e.target.value;
                  controllerField.onChange(value === '' ? null : Number(value));
                }}
              />
            )}
          />
        );

      case 'boolean':
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => (
              <div className="flex items-center space-x-2">
                <Switch
                  checked={controllerField.value || false}
                  onCheckedChange={controllerField.onChange}
                  className={cn(error && 'border-red-500')}
                />
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {controllerField.value ? 'Yes' : 'No'}
                </Label>
              </div>
            )}
          />
        );

      case 'date':
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !controllerField.value && 'text-muted-foreground',
                      error && 'border-red-500'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {controllerField.value ? (
                      format(new Date(controllerField.value), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={controllerField.value ? new Date(controllerField.value) : undefined}
                    onSelect={(date) => {
                      controllerField.onChange(date ? date.toISOString() : null);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          />
        );

      case 'select':
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => (
              <Select
                value={controllerField.value || ''}
                onValueChange={controllerField.onChange}
              >
                <SelectTrigger className={cn(error && 'border-red-500')}>
                  <SelectValue placeholder={field.placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {!field.required && (
                    <SelectItem value="">
                      <span className="text-muted-foreground">None</span>
                    </SelectItem>
                  )}
                  {field.options?.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        );

      case 'multiselect':
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => {
              const selectedValues = controllerField.value || [];
              
              return (
                <div className="space-y-2">
                  <div className="border rounded-md p-3 min-h-[40px] max-h-32 overflow-y-auto">
                    {selectedValues.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {selectedValues.map((value: string) => {
                          const option = field.options?.find(opt => opt.value === value);
                          return (
                            <span
                              key={value}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {option?.label || value}
                              <button
                                type="button"
                                className="ml-1 text-blue-600 hover:text-blue-800"
                                onClick={() => {
                                  const newValues = selectedValues.filter((v: string) => v !== value);
                                  controllerField.onChange(newValues);
                                }}
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No items selected</span>
                    )}
                  </div>
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value && !selectedValues.includes(value)) {
                        controllerField.onChange([...selectedValues, value]);
                      }
                    }}
                  >
                    <SelectTrigger className={cn(error && 'border-red-500')}>
                      <SelectValue placeholder="Add item..." />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          disabled={selectedValues.includes(option.value)}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            }}
          />
        );

      default:
        return (
          <Controller
            name={field.key}
            control={control}
            render={({ field: controllerField }) => (
              <Textarea
                {...controllerField}
                value={controllerField.value || ''}
                placeholder={field.placeholder}
                className={cn(error && 'border-red-500')}
                rows={3}
              />
            )}
          />
        );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={field.key} className="text-sm font-medium">
        {field.displayName}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      
      {renderField()}
      
      {error && (
        <p className="text-xs text-red-500">{error.message}</p>
      )}
    </div>
  );
};