// Act Type Selector Component
// Multi-select checkbox group for act type (originals, covers, tribute)
// Created: 2025-11-07

import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ACT_TYPES, type ActType } from '@/lib/constants/artist';

interface ActTypeSelectorProps {
  selectedTypes: ActType[];
  onChange: (types: ActType[]) => void;
  className?: string;
  required?: boolean;
  error?: string;
}

export function ActTypeSelector({
  selectedTypes = [],
  onChange,
  className = '',
  required = false,
  error
}: ActTypeSelectorProps) {
  const toggleActType = (actType: ActType) => {
    const isSelected = selectedTypes.includes(actType);

    if (isSelected) {
      // Don't allow deselection if this is the last selected item and required
      if (required && selectedTypes.length === 1) {
        return;
      }
      onChange(selectedTypes.filter(t => t !== actType));
    } else {
      onChange([...selectedTypes, actType]);
    }
  };

  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">
        Act Type {required && <span className="text-destructive">*</span>}
      </Label>

      <p className="text-xs text-muted-foreground mb-3">
        Select all that apply
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {ACT_TYPES.map((type) => {
          const isSelected = selectedTypes.includes(type.value as ActType);
          const isOnlySelected = isSelected && selectedTypes.length === 1 && required;

          return (
            <div key={type.value} className="flex items-center space-x-2">
              <Checkbox
                id={type.value}
                checked={isSelected}
                onCheckedChange={() => toggleActType(type.value as ActType)}
                disabled={isOnlySelected}
              />
              <Label
                htmlFor={type.value}
                className={`text-sm font-normal cursor-pointer ${
                  isOnlySelected ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {type.label}
              </Label>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}

      {required && selectedTypes.length === 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Please select at least one act type
        </p>
      )}
    </div>
  );
}
