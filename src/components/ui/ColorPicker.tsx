import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
  disabled?: boolean;
}

// Pre-defined color palette
const COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
  '#22C55E', '#F87171', '#FBBF24', '#A78BFA', '#34D399',
  '#60A5FA', '#FB923C', '#A3E635', '#F472B6', '#818CF8'
];

export function ColorPicker({ value, onChange, className, disabled }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(value);
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setIsOpen(false);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      onChange(color);
    }
  };

  const handleCustomColorSubmit = () => {
    if (/^#[0-9A-F]{6}$/i.test(customColor)) {
      onChange(customColor);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`w-8 h-8 p-0 rounded border-2 ${className}`}
          style={{ backgroundColor: value }}
          disabled={disabled}
          title={`Color: ${value}`}
        >
          <span className="sr-only">Pick color</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Choose Color</label>
            <div className="grid grid-cols-5 gap-2">
              {COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded border-2 hover:scale-110 transition-transform ${
                    value === color ? 'border-gray-900 ring-2 ring-blue-500' : 'border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorSelect(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Custom Color</label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                placeholder="#FF0000"
                pattern="^#[0-9A-F]{6}$"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={handleCustomColorSubmit}
                disabled={!/^#[0-9A-F]{6}$/i.test(customColor)}
              >
                Apply
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Format: #RRGGBB (e.g., #FF0000)
            </p>
          </div>
          
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded border border-gray-300"
                style={{ backgroundColor: value }}
              />
              <span className="text-sm font-mono">{value}</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
