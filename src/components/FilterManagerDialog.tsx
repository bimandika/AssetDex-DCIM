import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Settings, Loader2 } from 'lucide-react';
import { useFilterableColumns } from '@/hooks/useFilterableColumns';
import { usePersistentFilterPreferences } from '@/hooks/usePersistentFilterPreferences';
import { useToast } from '@/hooks/use-toast';

interface FilterManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFiltersUpdated?: () => void;
}

export const FilterManagerDialog: React.FC<FilterManagerDialogProps> = ({
  open,
  onOpenChange,
  onFiltersUpdated
}) => {
  const { coreFilters, allAvailableFilters, isLoading: filtersLoading } = useFilterableColumns();
  const { 
    preferences, 
    isLoading: preferencesLoading, 
    updatePreference,
    isFilterEnabled,
    getPreferenceType 
  } = usePersistentFilterPreferences();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = filtersLoading || preferencesLoading;

  const handleToggleFilter = async (filterKey: string, enabled: boolean) => {
    // Don't allow disabling core filters
    if (coreFilters.some(f => f.key === filterKey)) {
      return;
    }

    setIsSaving(true);
    try {
      const success = await updatePreference(filterKey, enabled, 'user');
      if (success && onFiltersUpdated) {
        onFiltersUpdated();
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    toast({
      title: "Filter Settings Saved",
      description: "Your filter preferences have been updated and will sync across all your devices.",
      duration: 3000
    });
    onOpenChange(false);
    
    // Trigger refresh in the parent component
    window.dispatchEvent(new CustomEvent('filterPreferencesUpdated'));
  };

  // Separate core and dynamic filters
  const dynamicFilters = allAvailableFilters.filter(f => !f.isCore);

  const getPreferenceTypeLabel = (filterKey: string) => {
    const type = getPreferenceType(filterKey);
    switch (type) {
      case 'auto': return 'Auto-enabled';
      case 'admin': return 'Admin default';
      case 'user': return 'User choice';
      default: return 'Available';
    }
  };

  const getPreferenceTypeBadge = (filterKey: string) => {
    const type = getPreferenceType(filterKey);
    switch (type) {
      case 'auto': return <Badge variant="default" className="text-xs">Auto</Badge>;
      case 'admin': return <Badge variant="secondary" className="text-xs">Admin</Badge>;
      case 'user': return <Badge variant="outline" className="text-xs">User</Badge>;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Manage Filter Columns
          </DialogTitle>
          <DialogDescription>
            Choose which columns to show as filters. Your preferences will sync across all devices.
            Core filters are always enabled and cannot be disabled.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading filter preferences...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Core Filters Section */}
            <div>
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Core Filters (Always Enabled)
              </h3>
              <div className="space-y-3">
                {coreFilters.map(filter => (
                  <div key={filter.key} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                    <div className="flex items-center space-x-3">
                      <Checkbox checked disabled />
                      <div>
                        <Label className="font-medium">{filter.displayName}</Label>
                        <p className="text-xs text-muted-foreground">Column: {filter.key}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Core</Badge>
                      <Badge variant="outline">{filter.options.length} options</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Filters Section */}
            {dynamicFilters.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground mb-3">
                    Available Column Filters
                  </h3>
                  <div className="space-y-3">
                    {dynamicFilters.map(filter => (
                      <div key={filter.key} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <Checkbox 
                            checked={isFilterEnabled(filter.key)}
                            onCheckedChange={(checked) => handleToggleFilter(filter.key, !!checked)}
                            disabled={isSaving}
                          />
                          <div>
                            <Label className="font-medium cursor-pointer">{filter.displayName}</Label>
                            <p className="text-xs text-muted-foreground">Column: {filter.key}</p>
                            {filter.category && (
                              <p className="text-xs text-blue-600">Category: {filter.category}</p>
                            )}
                            <p className="text-xs text-green-600">{getPreferenceTypeLabel(filter.key)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getPreferenceTypeBadge(filter.key)}
                          {filter.isAutoDetected && (
                            <Badge variant="default" className="text-xs">Auto-detected</Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {filter.options.length} options
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* No Dynamic Filters Message */}
            {dynamicFilters.length === 0 && !isLoading && (
              <>
                <Separator />
                <div className="text-center py-8 text-muted-foreground">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No additional filterable columns detected.</p>
                  <p className="text-xs mt-1">
                    Add enum-type columns in Server Properties to see them here.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Changes are saved automatically and sync across devices
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button onClick={handleSave}>
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FilterManagerDialog;
