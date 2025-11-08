// Artist Type Selector Component
// Single-select radio button group for artist type
// Created: 2025-11-07

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ARTIST_TYPES, type ArtistType } from '@/lib/constants/artist';

interface ArtistTypeSelectorProps {
  selectedType?: ArtistType;
  onChange: (type: ArtistType) => void;
  className?: string;
  required?: boolean;
  error?: string;
}

export function ArtistTypeSelector({
  selectedType,
  onChange,
  className = '',
  required = false,
  error
}: ArtistTypeSelectorProps) {
  return (
    <div className={className}>
      <Label className="text-sm font-medium mb-2 block">
        Artist Type {required && <span className="text-destructive">*</span>}
      </Label>

      <RadioGroup
        value={selectedType}
        onValueChange={(value) => onChange(value as ArtistType)}
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
      >
        {ARTIST_TYPES.map((type) => (
          <div key={type.value} className="flex items-center space-x-2">
            <RadioGroupItem value={type.value} id={type.value} />
            <Label
              htmlFor={type.value}
              className="text-sm font-normal cursor-pointer"
            >
              {type.label}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {error && (
        <p className="text-sm text-destructive mt-2">{error}</p>
      )}
    </div>
  );
}
