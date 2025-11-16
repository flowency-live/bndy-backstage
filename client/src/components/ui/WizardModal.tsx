import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WizardModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  currentStep: number;
  totalSteps: number;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * WizardModal - Orange header modal for create/add multi-step flows
 *
 * Use for creating new records and guided multi-step workflows.
 * For editing or viewing, use StandardModal instead.
 *
 * **Features:**
 * - Orange background header (bg-orange-500)
 * - Progress bar showing completion
 * - Step indicators (numbered circles)
 * - Mobile-optimized (full-screen on mobile)
 * - Touch-friendly buttons (56px minimum on mobile)
 *
 * @param open - Modal visibility state
 * @param onClose - Close handler
 * @param title - Wizard title
 * @param currentStep - Current step index (0-based)
 * @param totalSteps - Total number of steps
 * @param children - Step content
 * @param footer - Navigation buttons (Back/Next/Create)
 *
 * @example
 * ```tsx
 * <WizardModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Add New Gig"
 *   currentStep={currentStep}
 *   totalSteps={5}
 *   footer={
 *     <>
 *       <Button onClick={handleBack} disabled={currentStep === 0}>
 *         Back
 *       </Button>
 *       <Button onClick={handleNext}>
 *         {currentStep === 4 ? 'Create' : 'Next'}
 *       </Button>
 *     </>
 *   }
 * >
 *   {renderCurrentStep()}
 * </WizardModal>
 * ```
 */
export function WizardModal({
  open,
  onClose,
  title,
  currentStep,
  totalSteps,
  children,
  footer
}: WizardModalProps) {
  if (!open) return null;

  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-0 md:p-4">
      <div className="bg-background w-full h-full md:h-auto md:max-w-2xl md:max-h-[90vh] md:rounded-2xl flex flex-col">
        {/* Orange Header with Progress */}
        <div className="bg-orange-500 text-white p-4 md:p-6 md:rounded-t-2xl">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl md:text-2xl font-semibold">{title}</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex gap-2 mt-3">
            {Array.from({ length: totalSteps }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  i < currentStep
                    ? 'bg-white text-orange-500'
                    : i === currentStep
                    ? 'bg-white/30 text-white border-2 border-white'
                    : 'bg-white/10 text-white/50'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>

        {/* Footer */}
        <div className="border-t bg-background p-4 md:p-6 flex gap-3 justify-between">
          {footer}
        </div>
      </div>
    </div>
  );
}
