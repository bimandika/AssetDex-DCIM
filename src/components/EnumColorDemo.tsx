import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEnumColors } from '@/hooks/useEnumColors';
import { useAutoSave, useRestoreForm, useUrlState } from '@/hooks/useAutoSave';
import { useState } from 'react';

export function EnumColorDemo() {
  const [demoState, setDemoState] = useState({});
  useAutoSave(demoState, 'enumColorDemo_state');
  useRestoreForm('enumColorDemo_state', setDemoState);

  const { getColor: getAllocationColor, loading: allocationLoading } = useEnumColors('allocation_type');
  const { getColor: getModelColor, loading: modelLoading } = useEnumColors('model_type');

  // Sample data for demonstration
  const allocationTypes = ['IAAS', 'PAAS', 'SAAS', 'Load Balancer', 'Database'];
  const modelTypes = ['PowerEdge R740', 'PowerEdge R750', 'ProLiant DL380', 'ProLiant DL360'];

  if (allocationLoading || modelLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Enum Color System Demo</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Loading colors...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enum Color System Demo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-medium mb-3">Allocation Types (Logical View)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {allocationTypes.map((type) => {
              const color = getAllocationColor(type) || '#6B7280';
              const textColor = getTextColorForBackground(color);
              
              return (
                <div
                  key={type}
                  className="p-3 rounded-lg text-sm font-medium text-center"
                  style={{ 
                    backgroundColor: color, 
                    color: textColor 
                  }}
                >
                  {type}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Model Types (Physical View)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modelTypes.map((model) => {
              const color = getModelColor(model) || '#374151';
              const textColor = getTextColorForBackground(color);
              
              return (
                <div
                  key={model}
                  className="p-3 rounded-lg text-sm font-medium text-center"
                  style={{ 
                    backgroundColor: color, 
                    color: textColor 
                  }}
                >
                  {model}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-sm text-gray-600">
          <p>
            <strong>Usage:</strong> Toggle the view mode in RoomView to see servers colored by allocation type (logical view) or model type (physical view).
            Click the "Colors" button to manage custom colors.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper function to determine text color based on background
function getTextColorForBackground(backgroundColor: string): string {
  // Convert hex to RGB
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return white text for dark backgrounds, dark text for light backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
