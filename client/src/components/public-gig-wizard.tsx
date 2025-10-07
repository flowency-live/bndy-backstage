// PublicGigWizard - Mobile-first 4-step wizard for creating public gigs
// Production-ready with auto-save, conflict detection, and venue deduplication

import { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { ArtistMembership } from '@/types/api';
import VenueSearchStep from '@/components/wizard-steps/venue-search-step';
import DateTimeStep from '@/components/wizard-steps/date-time-step';
import DetailsStep from '@/components/wizard-steps/details-step';
import ReviewStep from '@/components/wizard-steps/review-step';

// Wizard step definitions
const STEPS = [
  { id: 1, name: 'Venue', label: 'Find Venue' },
  { id: 2, name: 'Date & Time', label: 'When' },
  { id: 3, name: 'Details', label: 'Details' },
  { id: 4, name: 'Review', label: 'Review' },
] as const;

export interface PublicGigFormData {
  // Step 1: Venue
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  venueLocation?: { lat: number; lng: number };
  googlePlaceId?: string;

  // Step 2: Date & Time
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  doorsTime?: string; // HH:mm

  // Step 3: Details
  title?: string;
  description?: string;
  ticketUrl?: string;
  ticketPrice?: string;

  // Step 4: Visibility
  isPublic?: boolean; // Default true

  // Metadata
  lastSavedAt?: string;
  completedSteps?: number[];
}

interface PublicGigWizardProps {
  isOpen: boolean;
  onClose: () => void;
  artistId: string;
  currentUser: ArtistMembership;
  initialData?: PublicGigFormData;
}

export default function PublicGigWizard({
  isOpen,
  onClose,
  artistId,
  currentUser,
  initialData,
}: PublicGigWizardProps) {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PublicGigFormData>(initialData || {});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Extract artist name from membership
  const artistName = currentUser.artist?.name || 'Artist';

  // LocalStorage key for auto-save
  const STORAGE_KEY = `public-gig-draft-${artistId}`;

  // Load draft from localStorage on mount
  useEffect(() => {
    if (!initialData) {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          setFormData(draft);
          toast({
            title: 'Draft restored',
            description: 'Your previous work has been restored',
          });
        } catch (error) {
          console.error('Failed to parse saved draft:', error);
        }
      }
    }
  }, [initialData, STORAGE_KEY]);

  // Auto-save to localStorage whenever formData changes
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      const dataToSave = {
        ...formData,
        lastSavedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [formData, STORAGE_KEY]);

  // Update form data helper
  const updateFormData = useCallback((updates: Partial<PublicGigFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Mark step as completed
  const markStepComplete = useCallback((step: number) => {
    setFormData((prev) => ({
      ...prev,
      completedSteps: [...(prev.completedSteps || []), step].filter(
        (value, index, self) => self.indexOf(value) === index
      ),
    }));
  }, []);

  // Navigation handlers
  const goToNextStep = useCallback(() => {
    if (currentStep < STEPS.length) {
      markStepComplete(currentStep);
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, markStepComplete]);

  const goToPrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Validate current step
  const canProceedFromStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // Venue step
        return !!(formData.venueId && formData.venueName);
      case 2: // Date & Time step
        return !!(formData.date && formData.startTime && formData.endTime);
      case 3: // Details step
        return true; // All fields optional
      case 4: // Review step
        return true;
      default:
        return false;
    }
  }, [formData]);

  // Submit handler
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Call the public-gigs endpoint
      const response = await fetch(
        `https://api.bndy.co.uk/api/artists/${artistId}/public-gigs`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            venueId: formData.venueId,
            type: 'gig',
            date: formData.date,
            startTime: formData.startTime,
            endTime: formData.endTime,
            doorsTime: formData.doorsTime,
            title: formData.title,
            description: formData.description,
            ticketUrl: formData.ticketUrl,
            ticketPrice: formData.ticketPrice,
            isPublic: formData.isPublic !== undefined ? formData.isPublic : true,
            source: 'backstage_wizard',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create public gig');
      }

      const createdEvent = await response.json();

      // Clear localStorage draft
      localStorage.removeItem(STORAGE_KEY);

      toast({
        title: 'Success!',
        description: 'Public gig created successfully',
      });

      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create public gig',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close and clear draft
  const handleClose = () => {
    if (Object.keys(formData).length > 0) {
      const confirmed = confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    localStorage.removeItem(STORAGE_KEY);
    onClose();
  };

  if (!isOpen) return null;

  // Progress percentage
  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 md:p-4">
      {/* Mobile: Full screen, Desktop: Centered modal */}
      <div className="bg-background w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] md:rounded-2xl flex flex-col shadow-xl">

        {/* Header with progress */}
        <div className="bg-primary text-primary-foreground p-4 md:p-6 md:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-serif">Create Public Gig</h2>
            <button
              onClick={handleClose}
              className="text-primary-foreground hover:text-primary-foreground/80"
              aria-label="Close wizard"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-primary-foreground/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary-foreground h-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex flex-col items-center text-xs md:text-sm ${
                  step.id === currentStep
                    ? 'text-primary-foreground font-semibold'
                    : step.id < currentStep
                    ? 'text-primary-foreground/80'
                    : 'text-primary-foreground/50'
                }`}
                disabled={step.id > currentStep + 1}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    step.id < currentStep
                      ? 'bg-primary-foreground text-primary'
                      : step.id === currentStep
                      ? 'bg-primary-foreground text-primary border-2 border-primary-foreground'
                      : 'bg-primary-foreground/30'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {currentStep === 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 1: Find Venue</h3>
              <p className="text-muted-foreground mb-4">
                Search for the venue where your gig will take place
              </p>
              <VenueSearchStep
                formData={formData}
                onUpdate={updateFormData}
                artistName={artistName}
              />
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 2: Date & Time</h3>
              <p className="text-muted-foreground mb-4">
                When is your gig happening?
              </p>
              <DateTimeStep
                formData={formData}
                onUpdate={updateFormData}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 3: Event Details</h3>
              <p className="text-muted-foreground mb-4">
                Add more information about your gig
              </p>
              <DetailsStep
                formData={formData}
                onUpdate={updateFormData}
                artistName={artistName}
              />
            </div>
          )}

          {currentStep === 4 && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Step 4: Review & Confirm</h3>
              <p className="text-muted-foreground mb-4">
                Review your gig details before creating
              </p>
              <ReviewStep
                formData={formData}
                artistId={artistId}
                artistName={artistName}
                onUpdate={updateFormData}
              />
            </div>
          )}
        </div>

        {/* Footer navigation - fixed at bottom on mobile */}
        <div className="border-t bg-background p-4 md:p-6 flex-shrink-0 md:rounded-b-2xl">
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={goToPrevStep}
              disabled={currentStep === 1}
              className="min-h-[56px] md:min-h-[44px]" // 56px touch target on mobile
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                variant="action"
                onClick={goToNextStep}
                disabled={!canProceedFromStep(currentStep)}
                className="min-h-[56px] md:min-h-[44px] flex-1 md:flex-none"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="action"
                onClick={handleSubmit}
                disabled={isSubmitting || !canProceedFromStep(currentStep)}
                className="min-h-[56px] md:min-h-[44px] flex-1 md:flex-none"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Gig
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
