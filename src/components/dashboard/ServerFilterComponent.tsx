import React, { useState, useEffect } from 'react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Filter } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ServerFilterConfig, FilterValidationResult } from '@/types/filterTypes'
import { useServerFilterOptions } from '@/hooks/useServerFilterOptions'

interface ServerFilterComponentProps {
  filters: ServerFilterConfig
  onChange: (filters: ServerFilterConfig) => void
  onValidate?: (result: FilterValidationResult) => void
  className?: string
}

const ServerFilterComponent: React.FC<ServerFilterComponentProps> = ({
  filters,
  onChange,
  onValidate,
  className = ''
}) => {
  const {
    filterOptions,
    hierarchicalState,
    isLoading,
    error,
    updateHierarchicalFilters,
    validateFilters
  } = useServerFilterOptions()

  const [validationResult, setValidationResult] = useState<FilterValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Handle filter changes
  const updateFilter = (key: keyof ServerFilterConfig, value: any) => {
    const newFilters = { ...filters, [key]: value }
    onChange(newFilters)
  }

  // Handle multi-select changes
  const handleMultiSelectChange = (key: keyof ServerFilterConfig, value: string, checked: boolean) => {
    const currentValues = (filters[key] as string[]) || []
    let newValues: string[]

    if (checked) {
      newValues = [...currentValues, value]
    } else {
      newValues = currentValues.filter(v => v !== value)
    }

    updateFilter(key, newValues.length > 0 ? newValues : undefined)
  }

  // Handle hierarchical DC filtering
  const handleDCChange = async (level: 'site' | 'building' | 'floor' | 'room', value: string) => {
    if (level === 'site') {
      updateFilter('dc_sites', [value])
      updateFilter('dc_buildings', undefined)
      updateFilter('dc_floors', undefined)
      updateFilter('dc_rooms', undefined)
      await updateHierarchicalFilters(value)
    } else if (level === 'building') {
      updateFilter('dc_buildings', [value])
      updateFilter('dc_floors', undefined)
      updateFilter('dc_rooms', undefined)
      await updateHierarchicalFilters(hierarchicalState.selectedSite, value)
    } else if (level === 'floor') {
      updateFilter('dc_floors', [value])
      updateFilter('dc_rooms', undefined)
      await updateHierarchicalFilters(
        hierarchicalState.selectedSite,
        hierarchicalState.selectedBuilding,
        value
      )
    } else if (level === 'room') {
      updateFilter('dc_rooms', [value])
    }
  }

  // Clear all filters
  const clearAllFilters = () => {
    onChange({
      logic: filters.logic || 'AND',
      hierarchical_filtering: filters.hierarchical_filtering !== false
    })
  }

  // Validate filters when they change
  useEffect(() => {
    const validateCurrentFilters = async () => {
      if (Object.keys(filters).some(key => 
        key !== 'logic' && key !== 'hierarchical_filtering' && filters[key as keyof ServerFilterConfig]
      )) {
        setIsValidating(true)
        try {
          const result = await validateFilters(filters)
          setValidationResult(result)
          onValidate?.(result)
        } catch (err) {
          console.error('Filter validation error:', err)
        } finally {
          setIsValidating(false)
        }
      } else {
        setValidationResult(null)
        onValidate?.({ isValid: true, errors: [], warnings: [] })
      }
    }

    const debounceTimer = setTimeout(validateCurrentFilters, 500)
    return () => clearTimeout(debounceTimer)
  }, [filters, validateFilters, onValidate])

  // Count active filters
  const activeFilterCount = Object.keys(filters).filter(key => 
    key !== 'logic' && key !== 'hierarchical_filtering' && filters[key as keyof ServerFilterConfig]
  ).length

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="text-center text-sm text-muted-foreground">
            Loading filter options...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load filter options: {error}
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4" />
            <CardTitle className="text-base">Server Selection</CardTitle>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount} active
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="h-8 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Filter servers by model, data center location, allocation, and environment
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Filter Logic */}
        <div className="space-y-2">
          <Label>Filter Logic</Label>
          <Select
            value={filters.logic || 'AND'}
            onValueChange={(value: 'AND' | 'OR') => updateFilter('logic', value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AND">AND (All)</SelectItem>
              <SelectItem value="OR">OR (Any)</SelectItem>
            </SelectContent>
          </Select>
          <div style={{ marginBottom: '10px' }} />
        </div>

        <Separator />

        {/* Model Filter */}
        <div className="space-y-3" style={{ marginBottom: '10px' }}>
          <Label>Models</Label>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.models.map((model) => (
              <div key={model} className="flex items-center space-x-2">
                <Checkbox
                  id={`model-${model}`}
                  checked={(filters.models || []).includes(model)}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange('models', model, checked as boolean)
                  }
                />
                <Label htmlFor={`model-${model}`} className="text-sm font-normal">
                  {model}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator style={{ marginBottom: '10px' }} />

        {/* Data Center Hierarchy */}
        <div className="space-y-4" style={{ marginBottom: '10px' }}>
          <div className="flex items-center space-x-2">
            <Label>Data Center Location</Label>
            <Checkbox
              id="hierarchical-filtering"
              checked={filters.hierarchical_filtering !== false}
              onCheckedChange={(checked) => 
                updateFilter('hierarchical_filtering', checked as boolean)
              }
            />
            <Label htmlFor="hierarchical-filtering" className="text-sm font-normal">
              Hierarchical filtering
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Site */}
            <div className="space-y-2">
              <Label>Site</Label>
              <Select
                value={hierarchicalState.selectedSite || ''}
                onValueChange={(value) => handleDCChange('site', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select site" />
                </SelectTrigger>
                <SelectContent>
                  {filterOptions.dc_sites.map((site) => (
                    <SelectItem key={site} value={site}>{site}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Building */}
            <div className="space-y-2">
              <Label>Building</Label>
              <Select
                value={hierarchicalState.selectedBuilding || ''}
                onValueChange={(value) => handleDCChange('building', value)}
                disabled={filters.hierarchical_filtering !== false && !hierarchicalState.selectedSite}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select building" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchicalState.availableBuildings.map((building) => (
                    <SelectItem key={building} value={building}>{building}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Floor */}
            <div className="space-y-2">
              <Label>Floor</Label>
              <Select
                value={hierarchicalState.selectedFloor || ''}
                onValueChange={(value) => handleDCChange('floor', value)}
                disabled={filters.hierarchical_filtering !== false && !hierarchicalState.selectedBuilding}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select floor" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchicalState.availableFloors.map((floor) => (
                    <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Room */}
            <div className="space-y-2">
              <Label>Room</Label>
              <Select
                value={filters.dc_rooms?.[0] || ''}
                onValueChange={(value) => handleDCChange('room', value)}
                disabled={filters.hierarchical_filtering !== false && !hierarchicalState.selectedFloor}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {hierarchicalState.availableRooms.map((room) => (
                    <SelectItem key={room} value={room}>{room}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator style={{ marginBottom: '10px' }} />

        {/* Allocation Types */}
        <div className="space-y-3" style={{ marginBottom: '10px' }}>
          <Label>Allocation Types</Label>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.allocations.map((allocation) => (
              <div key={allocation} className="flex items-center space-x-2">
                <Checkbox
                  id={`allocation-${allocation}`}
                  checked={(filters.allocations || []).includes(allocation)}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange('allocations', allocation, checked as boolean)
                  }
                />
                <Label htmlFor={`allocation-${allocation}`} className="text-sm font-normal">
                  {allocation}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator style={{ marginBottom: '10px' }} />

        {/* Environments */}
        <div className="space-y-3" style={{ marginBottom: '10px' }}>
          <Label>Environments</Label>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.environments.map((environment) => (
              <div key={environment} className="flex items-center space-x-2">
                <Checkbox
                  id={`environment-${environment}`}
                  checked={(filters.environments || []).includes(environment)}
                  onCheckedChange={(checked) => 
                    handleMultiSelectChange('environments', environment, checked as boolean)
                  }
                />
                <Label htmlFor={`environment-${environment}`} className="text-sm font-normal">
                  {environment}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <Separator style={{ marginBottom: '10px' }} />

        {/* Status */}
        <div className="space-y-3" style={{ marginBottom: '10px' }}>
          <Label>Status</Label>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.status.map((status) => (
              <div key={status} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${status}`}
                  checked={(filters.status || []).includes(status)}
                  onCheckedChange={(checked) =>
                    handleMultiSelectChange('status', status, checked as boolean)
                  }
                />
                <Label htmlFor={`status-${status}`} className="text-sm font-normal">
                  {status}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-2">
            {validationResult.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationResult.errors.join(', ')}
                </AlertDescription>
              </Alert>
            )}
            
            {validationResult.warnings.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validationResult.warnings.join(', ')}
                </AlertDescription>
              </Alert>
            )}
            
            {validationResult.isValid && validationResult.resultCount !== undefined && (
              <div className="text-sm text-muted-foreground">
                {isValidating ? 'Validating...' : `${validationResult.resultCount} servers match these filters`}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ServerFilterComponent