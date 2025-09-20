import BndyLogo from "@/components/ui/bndy-logo";

interface BndySpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spin" | "grow" | "pulse";
}

/**
 * BndySpinner - Animated loading spinner using the bndy logo
 * Orange logo with background-colored holes, multiple animation options
 */
export function BndySpinner({ 
  className = "", 
  size = "md", 
  variant = "grow" 
}: BndySpinnerProps) {
  
  const sizeClasses = {
    sm: "h-6 w-auto",
    md: "h-8 w-auto", 
    lg: "h-12 w-auto",
    xl: "h-16 w-auto"
  };

  const animationClasses = {
    spin: "animate-spin",
    grow: "animate-pulse",
    pulse: "animate-bounce"
  };

  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      data-testid="bndy-spinner"
    >
      <BndyLogo 
        className={`${sizeClasses[size]} ${animationClasses[variant]} transition-all duration-200`}
        color="#f97316" // Orange-500 for consistent bndy branding
        holeColor="var(--background)" // Use CSS variable for dynamic background
      />
    </div>
  );
}

/**
 * BndySpinnerOverlay - Full screen loading overlay with bndy spinner
 */
export function BndySpinnerOverlay({ message = "Loading..." }: { message?: string }) {
  return (
    <div 
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4"
      data-testid="bndy-spinner-overlay"
    >
      <BndySpinner size="xl" variant="grow" />
      <p className="text-muted-foreground text-sm font-medium">{message}</p>
    </div>
  );
}

/**
 * BndySpinnerInline - Compact inline spinner for buttons, etc.
 */
export function BndySpinnerInline({ className = "" }: { className?: string }) {
  return (
    <BndySpinner 
      size="sm" 
      variant="spin" 
      className={`inline-flex ${className}`}
    />
  );
}