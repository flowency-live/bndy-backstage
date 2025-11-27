import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

interface BulkAvailabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (params: {
    startDate: string;
    endDate: string;
    rules: string[];
    notes?: string;
  }) => void;
  isLoading?: boolean;
}

const RULE_OPTIONS = [
  { id: 'monday', label: 'Mondays' },
  { id: 'tuesday', label: 'Tuesdays' },
  { id: 'wednesday', label: 'Wednesdays' },
  { id: 'thursday', label: 'Thursdays' },
  { id: 'friday', label: 'Fridays' },
  { id: 'saturday', label: 'Saturdays' },
  { id: 'sunday', label: 'Sundays' },
  { id: 'weekdays', label: 'All Weekdays (Mon-Fri)' },
  { id: 'weekends', label: 'All Weekends (Fri-Sun)' },
];

export function BulkAvailabilityDrawer({
  isOpen,
  onClose,
  onApply,
  isLoading = false,
}: BulkAvailabilityDrawerProps) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const handleRuleToggle = (ruleId: string) => {
    setSelectedRules((prev) =>
      prev.includes(ruleId)
        ? prev.filter((r) => r !== ruleId)
        : [...prev, ruleId]
    );
  };

  const handleApply = () => {
    if (!startDate || !endDate || selectedRules.length === 0) {
      return;
    }

    onApply({
      startDate,
      endDate,
      rules: selectedRules,
      notes: notes || undefined,
    });

    // Reset form
    setSelectedRules([]);
    setNotes('');
  };

  const handleClose = () => {
    setSelectedRules([]);
    setNotes('');
    onClose();
  };

  const isValid = startDate && endDate && selectedRules.length > 0 && endDate >= startDate;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <SheetHeader>
          <SheetTitle className="text-blue-600 dark:text-blue-400">Bulk Set Availability</SheetTitle>
          <SheetDescription>
            Mark multiple days as available based on rules
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Date Range</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Select Days</h3>
            <div className="space-y-2">
              {RULE_OPTIONS.map((rule) => (
                <label
                  key={rule.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background hover:bg-accent cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => handleRuleToggle(rule.id)}
                    className="w-4 h-4 text-brand-accent rounded border-border focus:ring-brand-accent"
                  />
                  <span className="text-sm text-foreground">{rule.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground block">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this availability..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent transition-colors"
              rows={3}
            />
          </div>

          {/* Preview */}
          {selectedRules.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Rules selected: {selectedRules.length}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedRules.map((r) => RULE_OPTIONS.find((o) => o.id === r)?.label).join(', ')}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              onClick={handleClose}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={!isValid || isLoading}
              className="flex-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            >
              {isLoading ? 'Applying...' : 'Apply'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
