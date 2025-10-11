import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import DateRangePickerModal from "./date-range-picker-modal";
import DatePickerModal from "./date-picker-modal";

interface UnavailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  userDisplayName: string;
  userId: string;
  artistId?: string;
}

type RecurringType = "none" | "day" | "week" | "month" | "year";
type DurationType = "forever" | "count" | "until";

export default function UnavailabilityModal({
  isOpen,
  onClose,
  selectedDate,
  userDisplayName,
  userId,
  artistId,
}: UnavailabilityModalProps) {
  const { toast } = useToast();
  const [startDate, setStartDate] = useState(selectedDate);
  const [endDate, setEndDate] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState("");

  // Recurring pattern state (Google Calendar style)
  const [recurringType, setRecurringType] = useState<RecurringType>("none");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [durationType, setDurationType] = useState<DurationType>("forever");
  const [durationCount, setDurationCount] = useState(1);
  const [durationUntilDate, setDurationUntilDate] = useState<string>("");

  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showUntilDatePicker, setShowUntilDatePicker] = useState(false);

  useEffect(() => {
    setStartDate(selectedDate);
    setEndDate(undefined);
    setNotes("");
    setRecurringType("none");
    setRecurringInterval(1);
    setDurationType("forever");
    setDurationCount(1);
    setDurationUntilDate("");
  }, [selectedDate, isOpen]);

  const createUnavailabilityMutation = useMutation({
    mutationFn: async (data: {
      date: string;
      endDate?: string;
      notes?: string;
      recurring?: any;
    }) => {
      return apiRequest("POST", `https://api.bndy.co.uk/api/users/me/unavailability`, {
        type: "unavailable",
        date: data.date,
        endDate: data.endDate,
        notes: data.notes,
        recurring: data.recurring,
        isAllDay: true,
      });
    },
    onSuccess: () => {
      if (artistId) {
        queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "calendar"] });
      }
      toast({
        title: "Unavailability marked",
        description: recurringType !== "none" ? "Recurring unavailability saved" : "Date(s) marked unavailable",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark unavailability",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate) {
      toast({
        title: "Error",
        description: "Please select a date",
        variant: "destructive",
      });
      return;
    }

    // Build recurring object if not "none"
    let recurringData = undefined;
    if (recurringType !== "none") {
      recurringData = {
        type: recurringType,
        interval: recurringInterval,
        duration: durationType,
        ...(durationType === "count" && { count: durationCount }),
        ...(durationType === "until" && { until: durationUntilDate }),
      };
    }

    createUnavailabilityMutation.mutate({
      date: startDate,
      endDate: endDate && endDate !== startDate ? endDate : undefined,
      notes: notes.trim() || undefined,
      recurring: recurringData,
    });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slide-up">
          {/* Header - Red/Pink themed */}
          <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif">{userDisplayName} Unavailable</h3>
              <button
                onClick={onClose}
                className="text-white/90 hover:text-white transition-colors"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Date Selection */}
            <div>
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">
                Dates
              </label>
              <button
                type="button"
                onClick={() => setShowDateRangePicker(true)}
                className="w-full p-3 border border-input rounded-xl text-left bg-background text-foreground hover:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 relative transition-colors"
              >
                <span>
                  {startDate ? (
                    endDate && endDate !== startDate ? (
                      `${format(new Date(startDate + "T00:00:00"), "dd/MM/yyyy")} - ${format(new Date(endDate + "T00:00:00"), "dd/MM/yyyy")}`
                    ) : (
                      format(new Date(startDate + "T00:00:00"), "dd/MM/yyyy")
                    )
                  ) : (
                    "Select dates"
                  )}
                </span>
                <i className="fas fa-calendar-alt absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
              </button>
            </div>

            {/* Recurring Pattern - Google Calendar Style */}
            <div>
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-3">
                Repeat
              </label>
              <div className="space-y-2">
                {/* Don't repeat */}
                <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="recurring"
                    value="none"
                    checked={recurringType === "none"}
                    onChange={() => setRecurringType("none")}
                    className="mr-3 accent-red-500"
                  />
                  <span className="text-sm">Don't repeat</span>
                </label>

                {/* Every X day */}
                <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="recurring"
                    value="day"
                    checked={recurringType === "day"}
                    onChange={() => setRecurringType("day")}
                    className="mr-3 accent-red-500"
                  />
                  <span className="text-sm flex items-center gap-2">
                    Every
                    <Input
                      type="number"
                      min={1}
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecurringType("day");
                      }}
                      className="w-16 h-8 text-center px-2"
                    />
                    day{recurringInterval !== 1 ? "s" : ""}
                  </span>
                </label>

                {/* Every X week */}
                <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="recurring"
                    value="week"
                    checked={recurringType === "week"}
                    onChange={() => setRecurringType("week")}
                    className="mr-3 accent-red-500"
                  />
                  <span className="text-sm flex items-center gap-2">
                    Every
                    <Input
                      type="number"
                      min={1}
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecurringType("week");
                      }}
                      className="w-16 h-8 text-center px-2"
                    />
                    week{recurringInterval !== 1 ? "s" : ""}
                  </span>
                </label>

                {/* Every X month */}
                <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="recurring"
                    value="month"
                    checked={recurringType === "month"}
                    onChange={() => setRecurringType("month")}
                    className="mr-3 accent-red-500"
                  />
                  <span className="text-sm flex items-center gap-2">
                    Every
                    <Input
                      type="number"
                      min={1}
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecurringType("month");
                      }}
                      className="w-16 h-8 text-center px-2"
                    />
                    month{recurringInterval !== 1 ? "s" : ""}
                  </span>
                </label>

                {/* Every X year */}
                <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name="recurring"
                    value="year"
                    checked={recurringType === "year"}
                    onChange={() => setRecurringType("year")}
                    className="mr-3 accent-red-500"
                  />
                  <span className="text-sm flex items-center gap-2">
                    Every
                    <Input
                      type="number"
                      min={1}
                      value={recurringInterval}
                      onChange={(e) => setRecurringInterval(parseInt(e.target.value) || 1)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecurringType("year");
                      }}
                      className="w-16 h-8 text-center px-2"
                    />
                    year{recurringInterval !== 1 ? "s" : ""}
                  </span>
                </label>
              </div>

              {/* Duration (only show if recurring is active) */}
              {recurringType !== "none" && (
                <div className="mt-4 pt-4 border-t border-border">
                  <label className="block text-sm font-sans font-semibold text-card-foreground mb-3">
                    Duration
                  </label>
                  <div className="space-y-2">
                    {/* Forever */}
                    <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="duration"
                        value="forever"
                        checked={durationType === "forever"}
                        onChange={() => setDurationType("forever")}
                        className="mr-3 accent-red-500"
                      />
                      <span className="text-sm">Forever</span>
                    </label>

                    {/* Specific number of times */}
                    <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="duration"
                        value="count"
                        checked={durationType === "count"}
                        onChange={() => setDurationType("count")}
                        className="mr-3 accent-red-500"
                      />
                      <span className="text-sm flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={durationCount}
                          onChange={(e) => setDurationCount(parseInt(e.target.value) || 1)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDurationType("count");
                          }}
                          className="w-16 h-8 text-center px-2"
                        />
                        time{durationCount !== 1 ? "s" : ""}
                      </span>
                    </label>

                    {/* Until date */}
                    <label className="flex items-center p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="duration"
                        value="until"
                        checked={durationType === "until"}
                        onChange={() => setDurationType("until")}
                        className="mr-3 accent-red-500"
                      />
                      <span className="text-sm flex items-center gap-2">
                        Until
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDurationType("until");
                            setShowUntilDatePicker(true);
                          }}
                          className="px-3 py-1 border border-input rounded-lg bg-background hover:border-red-500 transition-colors text-sm"
                        >
                          {durationUntilDate ? format(new Date(durationUntilDate + "T00:00:00"), "dd/MM/yyyy") : "Select date"}
                        </button>
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">
                Notes (Optional)
              </label>
              <Textarea
                placeholder="Reason or additional details..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="focus:border-red-500 focus:ring-red-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUnavailabilityMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white border-0"
              >
                {createUnavailabilityMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Mark Unavailable"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Date Range Picker Modal */}
      <DateRangePickerModal
        isOpen={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onDateRangeSelect={(start, end) => {
          setStartDate(start);
          setEndDate(start === end ? undefined : end);
        }}
        initialDate={startDate}
      />

      {/* Until Date Picker Modal */}
      <DatePickerModal
        isOpen={showUntilDatePicker}
        onClose={() => setShowUntilDatePicker(false)}
        onDateSelect={(date) => {
          setDurationUntilDate(date);
          setShowUntilDatePicker(false);
        }}
        initialDate={durationUntilDate || startDate}
      />
    </>
  );
}
