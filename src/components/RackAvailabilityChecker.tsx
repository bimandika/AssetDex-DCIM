import React, { useEffect, useState } from 'react';
import { useRackAvailability } from '@/hooks/useRackAvailability';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, CheckCircle, Info, Lightbulb } from 'lucide-react';

interface ServerInRack {
  id: string;
  hostname: string;
  unit: number;
  unit_height: number;
}

interface AvailableSpace {
  startUnit: number;
  endUnit: number;
  size: number;
}

interface AvailabilityResult {
  available: boolean;
  conflictingServers?: ServerInRack[];
  availableSpaces?: AvailableSpace[];
  suggestion?: {
    position: number;
    reason: string;
  };
}

interface RackAvailabilityCheckerProps {
  rack: string;
  position: number;
  unitHeight: number;
  excludeServerId?: string;
  onSuggestionApply?: (position: number) => void;
  className?: string;
}

const RackAvailabilityChecker: React.FC<RackAvailabilityCheckerProps> = ({
  rack,
  position,
  unitHeight,
  excludeServerId,
  onSuggestionApply,
  className = ''
}) => {
  const { checkAvailability, loading, error } = useRackAvailability();
  const [result, setResult] = useState<AvailabilityResult | null>(null);

  useEffect(() => {
    const checkSpace = async () => {
      if (!rack || !position || !unitHeight) {
        setResult(null);
        return;
      }

      try {
        const availabilityResult = await checkAvailability(rack, position, unitHeight, excludeServerId);
        setResult(availabilityResult);
      } catch (err) {
        console.error('Error checking availability:', err);
      }
    };

    // Debounce the check to avoid too many API calls
    const timeoutId = setTimeout(checkSpace, 300);
    return () => clearTimeout(timeoutId);
  }, [rack, position, unitHeight, excludeServerId, checkAvailability]);

  if (!rack || !position || !unitHeight) {
    return null;
  }

  if (loading) {
    return (
      <div className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-600">Checking rack availability...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error checking rack availability: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!result) {
    return null;
  }

  const { available, conflictingServers, availableSpaces, suggestion } = result;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Main Status - Clean and Compact */}
      <Alert variant={available ? "default" : "destructive"} className="py-1.5 px-3">
        <div className="flex items-center gap-2">
          {available ? (
            <CheckCircle className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )}
          <AlertDescription className="m-0">
            {available ? (
              <span className="text-green-700 text-sm font-medium">
                U{position} available in {rack}
              </span>
            ) : (
              <span className="text-sm font-medium">
                U{position} conflicts with {conflictingServers?.map(s => s.hostname).join(', ')}
              </span>
            )}
          </AlertDescription>
        </div>
      </Alert>

      {/* Suggestion - Compact Design */}
      {!available && suggestion && (
        <Alert className="py-1.5 px-3 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                Suggested: U{suggestion.position}
              </span>
            </div>
            {onSuggestionApply && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSuggestionApply(suggestion.position)}
                className="text-xs h-6 px-2 border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Use U{suggestion.position}
              </Button>
            )}
          </div>
        </Alert>
      )}

      {/* Available Spaces - Inline and Compact */}
      {availableSpaces && availableSpaces.length > 0 && (
        <Alert className="py-1.5 px-3 bg-gray-50 border-gray-200">
          <div className="flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-gray-600" />
            <span className="text-xs text-gray-600 font-medium">Available:</span>
            <div className="flex flex-wrap gap-1">
              {availableSpaces
                .filter((space: AvailableSpace) => space.size >= unitHeight)
                .slice(0, 4) // Show up to 4 spaces
                .map((space: AvailableSpace, index: number) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 border-green-200"
                  >
                    U{space.startUnit}-U{space.endUnit}
                  </Badge>
                ))}
              {availableSpaces.filter((space: AvailableSpace) => space.size >= unitHeight).length > 4 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600">
                  +{availableSpaces.filter((space: AvailableSpace) => space.size >= unitHeight).length - 4}
                </Badge>
              )}
            </div>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default RackAvailabilityChecker;
