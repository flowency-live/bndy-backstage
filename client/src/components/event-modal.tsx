import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { BandMember, InsertEvent, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DatePickerModal from "./date-picker-modal";
import DateRangePickerModal from "./date-range-picker-modal";
import TimePickerModal from "./time-picker-modal";

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedEvent?: Event | null;
  eventType: "practice" | "gig" | "unavailable";
  currentUser: BandMember;
}

export default function EventModal({ isOpen, onClose, selectedDate, selectedEvent, eventType, currentUser }: EventModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertEvent>>({
    type: eventType,
    date: selectedDate,
    memberId: eventType === "unavailable" ? currentUser.id : undefined,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerType, setTimePickerType] = useState<"start" | "end">("start");
  const [conflicts, setConflicts] = useState<{
    bandEventConflicts: Event[];
    unavailabilityConflicts: Event[];
    affectedBandEvents: Event[];
  }>({
    bandEventConflicts: [],
    unavailabilityConflicts: [],
    affectedBandEvents: []
  });

  // Check for conflicts when date/type changes
  const checkConflictsMutation = useMutation({
    mutationFn: async (data: { 
      date: string; 
      endDate?: string; 
      type: string; 
      memberId?: string;
      excludeEventId?: string;
    }) => {
      const response = await apiRequest("POST", "/api/events/check-conflicts", data);
      return response.json();
    },
    onSuccess: (data) => {
      setConflicts({
        bandEventConflicts: data.bandEventConflicts || [],
        unavailabilityConflicts: data.unavailabilityConflicts || [],
        affectedBandEvents: data.affectedBandEvents || []
      });
    },
  });

  useEffect(() => {
    if (selectedEvent) {
      // Editing existing event
      setIsEditing(true);
      setFormData({
        type: selectedEvent.type,
        date: selectedEvent.date,
        endDate: selectedEvent.endDate,
        memberId: selectedEvent.memberId,
        title: selectedEvent.title,
        startTime: selectedEvent.startTime,
        endTime: selectedEvent.endTime,
        location: selectedEvent.location,
        notes: selectedEvent.notes,
      });
    } else {
      // Creating new event
      setIsEditing(false);
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
    }
  }, [selectedDate, eventType, currentUser.id, selectedEvent]);

  useEffect(() => {
    if (formData.date && formData.type) {
      checkConflictsMutation.mutate({
        date: formData.date,
        endDate: formData.endDate || undefined,
        type: formData.type,
        memberId: formData.memberId || undefined,
        excludeEventId: isEditing && selectedEvent ? selectedEvent.id : undefined,
      });
    }
  }, [formData.date, formData.endDate, formData.type, formData.memberId, isEditing, selectedEvent]);

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

  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...event }: { id: string } & Partial<InsertEvent>) => {
      return apiRequest("PATCH", `/api/events/${id}`, event);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event deleted successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete event",
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

    if (isEditing && selectedEvent) {
      updateEventMutation.mutate({ id: selectedEvent.id, ...eventData });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleDelete = () => {
    if (selectedEvent && confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate(selectedEvent.id);
    }
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
              <h3 className="text-2xl font-serif">{isEditing ? "Edit Event" : "Add New Event"}</h3>
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
              <label className="block text-sm font-sans font-semibold text-gray-700 mb-2">
                {formData.type === "unavailable" ? "Dates" : "Date"}
              </label>
              <button
                type="button"
                onClick={() => {
                  if (formData.type === "unavailable") {
                    setShowDateRangePicker(true);
                  } else {
                    setShowDatePicker(true);
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20 relative"
              >
                <span>
                  {formData.type === "unavailable" ? (
                    formData.date ? (
                      formData.endDate && formData.endDate !== formData.date
                        ? `${new Date(formData.date + 'T00:00:00').toLocaleDateString()} - ${new Date(formData.endDate + 'T00:00:00').toLocaleDateString()}`
                        : new Date(formData.date + 'T00:00:00').toLocaleDateString()
                    ) : "Select dates"
                  ) : (
                    formData.date ? new Date(formData.date + 'T00:00:00').toLocaleDateString() : "Select date"
                  )}
                </span>
                <i className="fas fa-calendar-alt absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
              </button>
            </div>

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
                      className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20 relative"
                    >
                      <span>{formData.startTime ? formatTime(formData.startTime) : "Select time"}</span>
                      <i className="fas fa-clock absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
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
                      className="w-full p-3 border border-gray-300 rounded-xl text-left bg-white hover:border-torrist-green focus:border-torrist-green focus:ring-2 focus:ring-torrist-green focus:ring-opacity-20 relative"
                    >
                      <span>{formData.endTime ? formatTime(formData.endTime) : "Select time"}</span>
                      <i className="fas fa-clock absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
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

            {/* Conflict Warnings */}
            {(conflicts.bandEventConflicts.length > 0 || 
              conflicts.unavailabilityConflicts.length > 0 || 
              conflicts.affectedBandEvents.length > 0) && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-exclamation-triangle text-yellow-600 text-lg mt-1"></i>
                  <div className="space-y-2">
                    <h4 className="font-sans font-semibold text-yellow-800">Scheduling Warnings</h4>
                    
                    {conflicts.bandEventConflicts.length > 0 && (
                      <p className="text-sm text-yellow-700">
                        <strong>Existing band events:</strong> {conflicts.bandEventConflicts.map(event => 
                          event.title || (event.type === "gig" ? "Gig" : "Practice")
                        ).join(", ")} already scheduled for this date.
                      </p>
                    )}
                    
                    {conflicts.unavailabilityConflicts.length > 0 && (
                      <p className="text-sm text-yellow-700">
                        <strong>Member availability:</strong> {conflicts.unavailabilityConflicts.length} member(s) marked unavailable during this period.
                      </p>
                    )}
                    
                    {conflicts.affectedBandEvents.length > 0 && (
                      <div className="text-sm text-yellow-700">
                        <p className="mb-2">
                          <strong>This affects existing events:</strong>
                        </p>
                        {conflicts.affectedBandEvents.map((event, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded p-2 mb-1">
                            <span>
                              {event.title || (event.type === "gig" ? "Gig" : "Practice")} on {format(new Date(event.date + 'T00:00:00'), "MMM d")}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Cancel ${event.title || (event.type === "gig" ? "gig" : "practice")} on ${format(new Date(event.date + 'T00:00:00'), "MMM d")}?`)) {
                                  deleteEventMutation.mutate(event.id);
                                }
                              }}
                              className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                            >
                              Cancel Event
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              {isEditing && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteEventMutation.isPending}
                  className="flex-1"
                >
                  {deleteEventMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              )}
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
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                className="flex-1 bg-torrist-green hover:bg-torrist-green-dark"
              >
                {(createEventMutation.isPending || updateEventMutation.isPending) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {isEditing ? "Updating..." : "Saving..."}
                  </>
                ) : (
                  isEditing ? "Update Event" : "Save Event"
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

      {/* Date Range Picker Modal */}
      <DateRangePickerModal
        isOpen={showDateRangePicker}
        onClose={() => setShowDateRangePicker(false)}
        onDateRangeSelect={(startDate, endDate) => {
          setFormData(prev => ({ 
            ...prev, 
            date: startDate,
            endDate: startDate === endDate ? undefined : endDate
          }));
        }}
        initialDate={formData.date}
      />

      {/* Time Picker Modal */}
      {showTimePicker && (
        <TimePickerModal
          isOpen={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          selectedTime={timePickerType === "start" ? formData.startTime || undefined : formData.endTime || undefined}
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
