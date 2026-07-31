import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface AvailabilitySectionProps {
  availabilityMode: 'selected_dates_only' | 'free_weekends';
  contactMethod: 'phone' | 'whatsapp';
  phoneNumber: string | null;
  whatsappNumber: string | null;
  publishAvailability: boolean;
  onAvailabilityModeChange: (mode: 'selected_dates_only' | 'free_weekends') => void;
  onContactMethodChange: (method: 'phone' | 'whatsapp') => void;
  onPhoneNumberChange: (number: string | null) => void;
  onWhatsappNumberChange: (number: string | null) => void;
}

export default function AvailabilitySection({
  availabilityMode,
  contactMethod,
  phoneNumber,
  whatsappNumber,
  publishAvailability,
  onAvailabilityModeChange,
  onContactMethodChange,
  onPhoneNumberChange,
  onWhatsappNumberChange
}: AvailabilitySectionProps) {
  return (
    <div className="border-t pt-6 mt-6">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground">Availability Settings</h3>

      {/* Availability Mode */}
      <div className="space-y-3 mb-6">
        <Label className="text-card-foreground font-semibold">Availability Mode</Label>
        <div className="space-y-2">
          <Label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="availabilityMode"
              value="selected_dates_only"
              checked={availabilityMode === 'selected_dates_only'}
              onChange={() => onAvailabilityModeChange('selected_dates_only')}
              disabled={!publishAvailability}
              className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-card-foreground">Selected dates only, marked on calendar</div>
              <div className="text-sm text-muted-foreground">
                Only show dates you manually mark as available
              </div>
            </div>
          </Label>

          <Label className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="availabilityMode"
              value="free_weekends"
              checked={availabilityMode === 'free_weekends'}
              onChange={() => onAvailabilityModeChange('free_weekends')}
              disabled={!publishAvailability}
              className="mt-0.5 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium text-card-foreground">Show all free Fri, Sat, Sun</div>
              <div className="text-sm text-muted-foreground">
                Automatically show all weekend days (each day evaluated independently)
              </div>
            </div>
          </Label>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4 mb-6">
        <Label className="text-card-foreground font-semibold">Contact Information</Label>

        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="text-sm text-card-foreground">
            Phone Number
          </Label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+44 7123 456789"
            value={phoneNumber || ''}
            onChange={(e) => onPhoneNumberChange(e.target.value || null)}
            disabled={!publishAvailability}
            className="max-w-md"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsappNumber" className="text-sm text-card-foreground">
            WhatsApp Number
          </Label>
          <Input
            id="whatsappNumber"
            type="tel"
            placeholder="+44 7987 654321"
            value={whatsappNumber || ''}
            onChange={(e) => onWhatsappNumberChange(e.target.value || null)}
            disabled={!publishAvailability}
            className="max-w-md"
          />
        </div>
      </div>

      {/* Preferred Contact Method */}
      <div className="space-y-3">
        <Label className="text-card-foreground font-semibold">Preferred Contact Method</Label>
        <div className="flex gap-4">
          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="contactMethod"
              value="phone"
              checked={contactMethod === 'phone'}
              onChange={() => onContactMethodChange('phone')}
              disabled={!publishAvailability}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-card-foreground">Phone</span>
          </Label>

          <Label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="contactMethod"
              value="whatsapp"
              checked={contactMethod === 'whatsapp'}
              onChange={() => onContactMethodChange('whatsapp')}
              disabled={!publishAvailability}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-card-foreground">WhatsApp</span>
          </Label>
        </div>
      </div>
    </div>
  );
}
