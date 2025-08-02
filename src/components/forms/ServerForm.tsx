import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import RackAvailabilityChecker from '@/components/RackAvailabilityChecker';

// Validation schema
const serverFormSchema = z.object({
  hostname: z.string().min(1, 'Hostname is required'),
  rack: z.string().min(1, 'Rack is required'),
  position: z.number().min(1).max(42, 'Position must be between 1 and 42'),
  unitHeight: z.number().min(1).max(42, 'Unit height must be between 1 and 42'),
  model: z.string().min(1, 'Model is required'),
  manufacturer: z.string().min(1, 'Manufacturer is required'),
  serialNumber: z.string().optional(),
  ipAddress: z.string().optional(),
  ipOOB: z.string().optional(),
  type: z.enum(['Server', 'Network', 'Storage']),
  status: z.enum(['Active', 'Maintenance', 'Offline']),
});

type ServerFormData = z.infer<typeof serverFormSchema>;

interface ServerFormProps {
  mode: 'add' | 'edit';
  initialData?: Partial<ServerFormData>;
  onSubmit: (data: ServerFormData) => Promise<void>;
  onCancel: () => void;
  excludeServerId?: string; // For edit mode
}

const ServerForm: React.FC<ServerFormProps> = ({
  mode,
  initialData,
  onSubmit,
  onCancel,
  excludeServerId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ServerFormData>({
    resolver: zodResolver(serverFormSchema),
    defaultValues: {
      hostname: initialData?.hostname || '',
      rack: initialData?.rack || '',
      position: initialData?.position || 1,
      unitHeight: initialData?.unitHeight || 1,
      model: initialData?.model || '',
      manufacturer: initialData?.manufacturer || '',
      serialNumber: initialData?.serialNumber || '',
      ipAddress: initialData?.ipAddress || '',
      ipOOB: initialData?.ipOOB || '',
      type: initialData?.type || 'Server',
      status: initialData?.status || 'Active',
    },
  });

  const handleSubmit = async (data: ServerFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit(data);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionApply = (position: number) => {
    form.setValue('position', position);
  };

  // Watch form values for real-time availability checking
  const watchedRack = form.watch('rack');
  const watchedPosition = form.watch('position');
  const watchedUnitHeight = form.watch('unitHeight');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{mode === 'add' ? 'Add New Server' : 'Edit Server'}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hostname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hostname</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., web-prod-01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rack</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., RACK-37" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Position and Unit Height */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position (Unit)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="42" 
                        placeholder="e.g., 42"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unitHeight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit Height</FormLabel>
                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select height" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((height) => (
                          <SelectItem key={height} value={height.toString()}>
                            {height}U
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Rack Availability Checker */}
            {watchedRack && watchedPosition && watchedUnitHeight && (
              <RackAvailabilityChecker
                rack={watchedRack}
                position={watchedPosition}
                unitHeight={watchedUnitHeight}
                excludeServerId={excludeServerId}
                onSuggestionApply={handleSuggestionApply}
                className="my-4"
              />
            )}

            {/* Hardware Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Dell, HP, Cisco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., PowerEdge R740" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Server">Server</SelectItem>
                        <SelectItem value="Network">Network</SelectItem>
                        <SelectItem value="Storage">Storage</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Offline">Offline</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Optional Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ipOOB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP OOB</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 10.0.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'add' ? 'Add Server' : 'Update Server'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default ServerForm;
