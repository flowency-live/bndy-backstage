import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { ArtistMembership, InsertEvent, Event } from "@/types/api";
import { EVENT_TYPES, EVENT_TYPE_CONFIG } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DatePickerModal from "./date-picker-modal";
import DateRangePickerModal from "./date-range-picker-modal";
import TimePickerModal from "./time-picker-modal";

type EventType = typeof EVENT_TYPES[number];

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  selectedEvent?: Event | null;
  eventType: EventType;
  currentUser: ArtistMembership;
  artistId: string;
}

export default function EventModal({ isOpen, onClose, selectedDate, selectedEvent, eventType, currentUser, artistId }: EventModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<InsertEvent>>({
    type: eventType,
    date: selectedDate,
    membershipId: eventType === "unavailable" ? currentUser.id : undefined,
    isPublic: false,
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
      membershipId?: string;
      excludeEventId?: string;
    }) => {
      const response = await apiRequest("POST", `https://api.bndy.co.uk/api/artists/${artistId}/events/check-conflicts`, data);
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
      // Editing existing event - populate with event data
      setIsEditing(true);
      setFormData({
        type: selectedEvent.type as typeof EVENT_TYPES[number],
        date: selectedEvent.date,
        endDate: selectedEvent.endDate,
        membershipId: selectedEvent.membershipId,
        title: selectedEvent.title,
        startTime: selectedEvent.startTime,
        endTime: selectedEvent.endTime,
        location: selectedEvent.location,
        venue: selectedEvent.venue,
        notes: selectedEvent.notes,
        isPublic: selectedEvent.isPublic || false,
      });
    } else {
      // Creating new event - use defaults
      setIsEditing(false);
      setFormData({
        type: eventType,
        date: selectedDate,
        membershipId: eventType === "unavailable" ? currentUser.id : undefined,
        title: undefined,
        startTime: undefined,
        endTime: undefined,
        location: undefined,
        venue: undefined,
        notes: undefined,
        endDate: undefined,
        isPublic: false,
      });
    }
  }, [selectedEvent]); // Only depend on selectedEvent to avoid race conditions

  // Separate useEffect for updating form when creating new events
  useEffect(() => {
    if (!selectedEvent) {
      // Only update if we're creating a new event, not editing
      setFormData(prev => ({
        ...prev,
        type: eventType,
        date: selectedDate,
        membershipId: eventType === "unavailable" ? currentUser.id : undefined,
      }));
    }
  }, [selectedDate, eventType, currentUser.id, selectedEvent]);

  useEffect(() => {
    if (formData.date && formData.type) {
      checkConflictsMutation.mutate({
        date: formData.date,
        endDate: formData.endDate || undefined,
        type: formData.type,
        membershipId: formData.membershipId || undefined,
        excludeEventId: isEditing && selectedEvent ? selectedEvent.id : undefined,
      });
    }
  }, [formData.date, formData.endDate, formData.type, formData.membershipId, isEditing, selectedEvent]);

  const createEventMutation = useMutation({
    mutationFn: async (event: InsertEvent) => {
      return apiRequest("POST", `https://api.bndy.co.uk/api/artists/${artistId}/events`, event);
    },
    onSuccess: () => {
      // Invalidate both events and calendar queries to ensure immediate display
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "calendar"] });
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
      return apiRequest("PATCH", `https://api.bndy.co.uk/api/artists/${artistId}/events/${id}`, event);
    },
    onSuccess: () => {
      // Invalidate both events and calendar queries to ensure immediate display
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "calendar"] });
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
      return apiRequest("DELETE", `https://api.bndy.co.uk/api/artists/${artistId}/events/${id}`);
    },
    onSuccess: () => {
      // Invalidate both events and calendar queries to ensure immediate display
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "calendar"] });
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

    // Validate venue/location based on public/private status
    if (formData.type !== "unavailable") {
      if (formData.isPublic && !formData.venue?.trim()) {
        toast({
          title: "Error",
          description: "Venue is required for public events",
          variant: "destructive",
        });
        return;
      }
      if (!formData.isPublic && !formData.location?.trim()) {
        toast({
          title: "Error",
          description: "Location is required for private events",
          variant: "destructive",
        });
        return;
      }
    }

    const eventData: InsertEvent = {
      type: formData.type,
      date: formData.date,
      endDate: formData.endDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      location: formData.isPublic ? undefined : formData.location,
      venue: formData.isPublic ? formData.venue : undefined,
      notes: formData.notes,
      membershipId: formData.type === "unavailable" ? currentUser.id : undefined,
      title: formData.title,
      isAllDay: formData.type === "unavailable" || (!formData.startTime && !formData.endTime),
      isPublic: formData.isPublic || false,
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

  const selectEventType = (type: EventType) => {
    // Determine if event should be public by default based on type
    const defaultPublic = type === "public_gig" || type === "festival";
    
    setFormData(prev => ({ 
      ...prev, 
      type,
      membershipId: type === "unavailable" ? currentUser.id : undefined,
      startTime: type === "unavailable" ? undefined : prev.startTime,
      endTime: type === "unavailable" ? undefined : prev.endTime,
      location: type === "unavailable" || defaultPublic ? undefined : prev.location,
      venue: type === "unavailable" || !defaultPublic ? undefined : prev.venue,
      isPublic: defaultPublic,
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-slide-up">
          <div className="bg-primary text-primary-foreground p-6 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-serif">{isEditing ? "Edit Event" : "Add New Event"}</h3>
              <button onClick={onClose} className="text-primary-foreground hover:text-primary-foreground/80">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Event Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-3">Event Type</label>
              <div className="grid grid-cols-3 lg:grid-cols-4 gap-2">
                {(() => {
                  // Always include 'unavailable' regardless of artist settings since it's a personal action
                  const artistEventTypes = currentUser.artist?.allowedEventTypes || ['practice', 'public_gig'];
                  const allAvailableTypes = [...artistEventTypes];
                  if (!allAvailableTypes.includes('unavailable')) {
                    allAvailableTypes.push('unavailable');
                  }
                  return allAvailableTypes;
                })().map((type) => {
                  const config = EVENT_TYPE_CONFIG[type as keyof typeof EVENT_TYPE_CONFIG];
                  const isSelected = formData.type === type;
                  
                  return (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => selectEventType(type as EventType)}
                      className={`p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                        isSelected
                          ? `border-2 shadow-md`
                          : "border-border hover:border-border/80 hover:shadow-sm"
                      }`}
                      style={{
                        borderColor: isSelected ? (type === 'unavailable' ? 'hsl(0, 84%, 60%)' : config.color) : undefined,
                        backgroundColor: isSelected ? (type === 'unavailable' ? 'hsl(0, 84%, 60%, 0.15)' : `${config.color}15`) : undefined,
                      }}
                      data-testid={`button-event-type-${type}`}
                    >
                      <div className="text-xl mb-1">{config.icon}</div>
                      <div className={`text-xs font-sans font-semibold ${
                        isSelected ? "text-card-foreground" : "text-muted-foreground"
                      }`} style={{
                        color: isSelected ? config.color : undefined,
                      }}>{config.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Public/Private Toggle (for non-unavailable events) */}
            {formData.type !== "unavailable" && (
              <div className="mb-6">
                <label className="block text-sm font-sans font-semibold text-card-foreground mb-3">Visibility</label>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPublic: false, venue: undefined }))}
                    className={`flex-1 p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                      !formData.isPublic
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="button-private-event"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🔒</span>
                      <span className="font-semibold">Private</span>
                    </div>
                    <div className="text-xs mt-1">Internal band event</div>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isPublic: true, location: undefined }))}
                    className={`flex-1 p-3 rounded-lg border-2 text-center transition-all duration-200 ${
                      formData.isPublic
                        ? "border-brand-accent bg-brand-accent/10 text-brand-accent dark:text-brand-accent"
                        : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="button-public-event"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <span>🌍</span>
                      <span className="font-semibold">Public</span>
                    </div>
                    <div className="text-xs mt-1">Open to the public</div>
                  </button>
                </div>
              </div>
            )}

            {/* Title (for most event types) */}
            {formData.type !== "unavailable" && (
              <div className="mb-6">
                <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">Title (Optional)</label>
                <Input
                  type="text"
                  placeholder={`${EVENT_TYPE_CONFIG[formData.type as EventType]?.label || "Event"} title`}
                  value={formData.title || ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="focus:border-brand-primary focus:ring-brand-primary"
                  data-testid="input-event-title"
                />
              </div>
            )}

            {/* Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">
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
                className="w-full p-3 border border-input rounded-xl text-left bg-background text-foreground hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 relative"
              >
                <span>
                  {/* UK DATE FORMAT RULE: Always use dd/MM/yyyy format for consistency across the entire app */}
                  {formData.type === "unavailable" ? (
                    formData.date ? (
                      formData.endDate && formData.endDate !== formData.date
                        ? `${format(new Date(formData.date + 'T00:00:00'), 'dd/MM/yyyy')} - ${format(new Date(formData.endDate + 'T00:00:00'), 'dd/MM/yyyy')}`
                        : format(new Date(formData.date + 'T00:00:00'), 'dd/MM/yyyy')
                    ) : "Select dates"
                  ) : (
                    formData.date ? format(new Date(formData.date + 'T00:00:00'), 'dd/MM/yyyy') : "Select date"
                  )}
                </span>
                <i className="fas fa-calendar-alt absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
              </button>
            </div>

            {/* Time Selection (for non-unavailable events) */}
            {formData.type !== "unavailable" && (
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">Start Time</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTimePickerType("start");
                        setShowTimePicker(true);
                      }}
                      className="w-full p-3 border border-input rounded-xl text-left bg-background text-foreground hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 relative"
                    >
                      <span>{formData.startTime ? formatTime(formData.startTime) : "Select time"}</span>
                      <i className="fas fa-clock absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">End Time</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTimePickerType("end");
                        setShowTimePicker(true);
                      }}
                      className="w-full p-3 border border-input rounded-xl text-left bg-background text-foreground hover:border-primary focus:border-primary focus:ring-2 focus:ring-primary focus:ring-opacity-20 relative"
                    >
                      <span>{formData.endTime ? formatTime(formData.endTime) : "Select time"}</span>
                      <i className="fas fa-clock absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Venue/Location (for non-unavailable events) */}
            {formData.type !== "unavailable" && (
              <div className="mb-6">
                {formData.isPublic ? (
                  <>
                    <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">Venue *</label>
                    <Input
                      type="text"
                      placeholder="Enter public venue name"
                      value={formData.venue || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
                      className="focus:border-brand-primary focus:ring-brand-primary"
                      data-testid="input-event-venue"
                    />
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-sans font-semibold text-card-foreground mb-2">Location *</label>
                    <Input
                      type="text"
                      placeholder="Enter private location"
                      value={formData.location || ""}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="focus:border-brand-primary focus:ring-brand-primary"
                      data-testid="input-event-location"
                    />
                  </>
                )}
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
                className="focus:border-brand-primary focus:ring-brand-primary"
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
                variant="action"
                disabled={createEventMutation.isPending || updateEventMutation.isPending}
                className="flex-1"
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
