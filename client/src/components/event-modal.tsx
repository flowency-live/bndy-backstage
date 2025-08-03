import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { BandMember, InsertEvent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DatePickerModal from "./date-picker-modal";
import TimePickerModal from "./time-picker-modal";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  eventType: "practice" | "gig" | "unavailable";
  currentUser: BandMember;
}

export default function EventModal({ isOpen, onClose, selectedDate, eventType, currentUser }: EventModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertEvent>>({
    type: eventType,
    date: selectedDate,
    memberId: eventType === "unavailable" ? currentUser.id : undefined,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<"start" | "end">("start");
  const [conflicts, setConflicts] = useState<BandMember[]>([]);

  // Check for conflicts when date/type changes
  const checkConflictsMutation = useMutation({
    mutationFn: async (data: { date: string; endDate?: string; type: string }) => {
      const response = await apiRequest("POST", "/api/events/check-conflicts", data);
      return response.json();
    },
    onSuccess: (data) => {
      setConflicts(data.conflicts || []);
    },
  });

  useEffect(() => {
    setFormData({
      type: eventType,
      date: selectedDate,
      memberId: eventType === "unavailable" ? currentUser.id : undefined,
      title: undefined,
      startTime: undefined,
      endTime: undefined,
      location: undefined,
      notes: undefined,
      endDate: undefined,
    });
  }, [selectedDate, eventType, currentUser.id]);

  useEffect(() => {
    if (formData.date && formData.type) {
      checkConflictsMutation.mutate({
        date: formData.date,
        endDate: formData.endDate,
        type: formData.type,
      });
    }
  }, [formData.date, formData.endDate, formData.type]);

  const createEventMutation = useMutation({
    mutationFn: async (event: InsertEvent) => {
      return apiRequest("POST", "/api/events", event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.date || !formData.type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if ((formData.type === "practice" || formData.type === "gig") && !formData.location?.trim()) {
      toast({
        title: "Error",
        description: "Location is required for practices and gigs",
        variant: "destructive",
      });
      return;
    }

    const eventData: InsertEvent = {
      type: formData.type,
      date: formData.date,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.location,
      notes: formData.notes,
      memberId: formData.type === "unavailable" ? currentUser.id : undefined,
      title: formData.title,
      isAllDay: formData.type === "unavailable" || (!formData.startTime && !formData.endTime),
    };

    createEventMutation.mutate(eventData);
  };

  const selectEventType = (type: "practice" | "gig" | "unavailable") => {
    setFormData(prev => ({ 
      ...prev, 
      type,
      memberId: type === "unavailable" ? currentUser.id : undefined,
      startTime: type === "unavailable" ? undefined : prev.startTime,
      endTime: type === "unavailable" ? undefined : prev.endTime,
      location: type === "unavailable" ? undefined : prev.location,
    }));
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? "PM" : "AM";
    return `${hour12}:${minutes} ${period}`;
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
          <div className="bg-torrist-green text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif">Add New Event</h3>
              <button onClick={onClose} className="text-white hover:text-gray-200">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Event Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-sans font-semibold text-gray-700 mb-3">Event Type</label>
              <div className="grid grid-cols-3 gap-3">
                <button 
                  type="button"
                  onClick={() => selectEventType("unavailable")}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    formData.type === "unavailable"
                      ? "border-torrist-unavailable bg-pink-50"
                      : "border-gray-200 hover:border-torrist-unavailable hover:bg-pink-50"
                  }`}
                >
                  <i className={`fas fa-ban text-2xl mb-2 ${
                    formData.type === "unavailable" ? "text-gray-600" : "text-gray-400"
                  }`}></i>
                  <div className={`text-sm font-sans font-semibold ${
                    formData.type === "unavailable" ? "text-gray-700" : "text-gray-700"
                  }`}>Unavailable</div>
                </button>
                
                <button 
                  type="button"
                  onClick={() => selectEventType("practice")}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    formData.type === "practice"
                      ? "border-torrist-green bg-torrist-green text-white"
                      : "border-gray-200 hover:border-torrist-green hover:bg-green-50"
                  }`}
                >
                  <i className={`fas fa-music text-2xl mb-2 ${
                    formData.type === "practice" ? "text-white" : "text-gray-400"
                  }`}></i>
                  <div className={`text-sm font-sans font-semibold ${
                    formData.type === "practice" ? "text-white" : "text-gray-700"
                  }`}>Practice</div>
                </button>
                
                <button 
                  type="button"
                  onClick={() => selectEventType("gig")}
                  className={`p-4 rounded-xl border-2 text-center transition-all duration-200 ${
                    formData.type === "gig"
                      ? "border-torrist-orange bg-orange-50"
                      : "border-gray-200 hover:border-torrist-orange hover:bg-orange-50"
                  }`}
                >
                  <i className={`fas fa-star text-2xl mb-2 ${
                    formData.type === "gig" ? "text-torrist-orange" : "text-gray-400"
                  }`}></i>
                  <div className={`text-sm font-sans font-semibold ${
                    formData.type === "gig" ? "text-torrist-orange" : "text-gray-700"
                  }`}>Gig</div>
                </button>
              </div>
            </div>

            {/* Title (for practices and gigs) */}
            {(formData.type === "practice" || formData.type === "gig") && (
              <div className="mb-6">
                <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Title (Optional)</label>
                <Input
                  type="text"
                  placeholder={`${formData.type === "gig" ? "Gig" : "Practice"} title`}
                  value={formData.title || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="focus:border-torrist-green focus:ring-torrist-green"
                />
              </div>
            )}

            {/* Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Date</label>
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20"
              >
                <span>{formData.date ? new Date(formData.date).toLocaleDateString() : "Select date"}</span>
                <i className="fas fa-calendar-alt absolute right-3 top-3 text-gray-400"></i>
              </button>
            </div>

            {/* End Date (for unavailability) */}
            {formData.type === "unavailable" && (
              <div className="mb-6">
                <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">End Date (Optional)</label>
                <button
                  type="button"
                  onClick={() => setShowEndDatePicker(true)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20"
                >
                  <span>{formData.endDate ? new Date(formData.endDate).toLocaleDateString() : "Same day"}</span>
                  <i className="fas fa-calendar-alt absolute right-3 top-3 text-gray-400"></i>
                </button>
              </div>
            )}

            {/* Time Selection (for practices and gigs) */}
            {(formData.type === "practice" || formData.type === "gig") && (
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Start Time</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTimePickerType("start");
                        setShowTimePicker(true);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20"
                    >
                      <span>{formData.startTime ? formatTime(formData.startTime) : "Select time"}</span>
                      <i className="fas fa-clock absolute right-3 top-3 text-gray-400"></i>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">End Time</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTimePickerType("end");
                        setShowTimePicker(true);
                      }}
                      className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20"
                    >
                      <span>{formData.endTime ? formatTime(formData.endTime) : "Select time"}</span>
                      <i className="fas fa-clock absolute right-3 top-3 text-gray-400"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Location (for practices and gigs) */}
            {(formData.type === "practice" || formData.type === "gig") && (
              <div className="mb-6">
                <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Location *</label>
                <Input
                  type="text"
                  placeholder="Enter location"
                  value={formData.location || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="focus:border-torrist-green focus:ring-torrist-green"
                />
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">Notes (Optional)</label>
              <Textarea
                placeholder="Add any additional notes..."
                rows={3}
                value={formData.notes || ""}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="focus:border-torrist-green focus:ring-torrist-green"
              />
            </div>

            {/* Conflict Warning */}
            {conflicts.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-exclamation-triangle text-red-500 text-lg mt-1"></i>
                  <div>
                    <h4 className="font-sans font-semibold text-red-800 mb-1">Scheduling Conflict</h4>
                    <p className="text-sm text-red-700">
                      {conflicts.map(member => member.name).join(" and ")} {conflicts.length === 1 ? "is" : "are"} unavailable on this date.
                    </p>
                  </div>
                </div>
              </div>
            )}

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
                disabled={createEventMutation.isPending}
                className="flex-1 bg-torrist-green hover:bg-torrist-green-dark"
              >
                {createEventMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  "Save Event"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePickerModal
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          selectedDate={formData.date}
          onSelectDate={(date) => {
            setFormData(prev => ({ ...prev, date }));
            setShowDatePicker(false);
          }}
          title="Select Date"
        />
      )}

      {/* End Date Picker Modal */}
      {showEndDatePicker && (
        <DatePickerModal
          isOpen={showEndDatePicker}
          onClose={() => setShowEndDatePicker(false)}
          selectedDate={formData.endDate}
          onSelectDate={(date) => {
            setFormData(prev => ({ ...prev, endDate: date }));
            setShowEndDatePicker(false);
          }}
          title="Select End Date"
          allowClear={true}
          onClear={() => {
            setFormData(prev => ({ ...prev, endDate: undefined }));
            setShowEndDatePicker(false);
          }}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePickerModal
          isOpen={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          selectedTime={timePickerType === "start" ? formData.startTime : formData.endTime}
          onSelectTime={(time) => {
            if (timePickerType === "start") {
              setFormData(prev => ({ ...prev, startTime: time }));
            } else {
              setFormData(prev => ({ ...prev, endTime: time }));
            }
            setShowTimePicker(false);
          }}
          title={`Select ${timePickerType === "start" ? "Start" : "End"} Time`}
        />
      )}
    </>
  );
}
