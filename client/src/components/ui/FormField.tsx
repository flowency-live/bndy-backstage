import { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}

/**
 * FormField - Standardized form field wrapper
 *
 * Provides consistent layout for form labels, inputs, and error messages.
 *
 * **Features:**
 * - Label with optional required indicator (*)
 * - Error message display below input
 * - Consistent spacing (space-y-2)
 * - Accessibility support (htmlFor linking)
 *
 * @param label - Field label text
 * @param required - Show required indicator (*)
 * @param error - Error message (displays in red)
 * @param children - Input component (Input, Textarea, Select, etc.)
 * @param htmlFor - ID of input for accessibility
 *
 * @example
 * ```tsx
 * <FormField
 *   label="Venue Name"
 *   required
 *   error={errors.name?.message}
 *   htmlFor="venue-name"
 * >
 *   <Input
 *     id="venue-name"
 *     {...register('name')}
 *   />
 * </FormField>
 *
 * // With Select
 * <FormField label="Genre" required>
 *   <Select {...register('genre')}>
 *     <option>Rock</option>
 *     <option>Jazz</option>
 *   </Select>
 * </FormField>
 *
 * // With custom component
 * <FormField label="Location" error={errors.location}>
 *   <LocationAutocomplete
 *     value={location}
 *     onChange={setLocation}
 *   />
 * </FormField>
 * ```
 */
export function FormField({
  label,
  required,
  error,
  children,
  htmlFor
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
