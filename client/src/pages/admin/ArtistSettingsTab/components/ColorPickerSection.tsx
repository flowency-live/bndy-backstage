import { Label } from '@/components/ui/label';

const COLOR_PRESETS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#64748b'
];

interface ColorPickerSectionProps {
  color: string;
  onColorChange: (color: string) => void;
}

export default function ColorPickerSection({ color, onColorChange }: ColorPickerSectionProps) {
  return (
    <div>
      <Label className="text-card-foreground font-semibold mb-3 block">Display Colour</Label>
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
        {COLOR_PRESETS.map((presetColor) => (
          <button
            key={presetColor}
            type="button"
            onClick={() => onColorChange(presetColor)}
            className={`
              w-10 h-10 rounded-lg transition-all
              ${color === presetColor
                ? 'ring-2 ring-offset-2 ring-primary scale-110'
                : 'hover:scale-105'
              }
            `}
            style={{ backgroundColor: presetColor }}
            aria-label={`Select color ${presetColor}`}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        <div
          className="w-8 h-8 rounded border"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-muted-foreground">
          Current: {color}
        </span>
      </div>
    </div>
  );
}
