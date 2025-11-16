import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StandardModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * StandardModal - Neutral header modal for edit/view actions
 *
 * Use for editing existing records, viewing details, and simple forms.
 * For creation/multi-step flows, use WizardModal instead.
 *
 * **Features:**
 * - Neutral background header (bg-background)
 * - Close button (X) in top-right
 * - Optional footer with action buttons
 * - Responsive max-width
 * - Auto-scrolling content area
 *
 * @param open - Modal visibility state
 * @param onClose - Close handler
 * @param title - Modal title (text-2xl)
 * @param children - Modal content (p-6 spacing)
 * @param footer - Optional footer with buttons
 * @param maxWidth - Responsive width (default: 'lg')
 *
 * @example
 * ```tsx
 * <StandardModal
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Edit Venue"
 *   footer={
 *     <>
 *       <Button variant="outline" onClick={onClose}>Cancel</Button>
 *       <Button onClick={handleSave}>Save</Button>
 *     </>
 *   }
 * >
 *   <form className="space-y-4">
 *     {/* Form fields *\/}
 *   </form>
 * </StandardModal>
 * ```
 */
export function StandardModal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'lg'
}: StandardModalProps) {
  if (!open) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-background rounded-2xl ${widthClasses[maxWidth]} w-full max-h-[90vh] overflow-y-auto shadow-xl`}>
        {/* Header - Neutral background */}
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {children}
        </div>

        {/* Footer (optional) */}
        {footer && (
          <div className="border-t px-6 py-4 flex gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
