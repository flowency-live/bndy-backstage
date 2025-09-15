import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/contexts/theme-context"

interface ThemeToggleProps {
  className?: string
  variant?: "ghost" | "outline" | "default" | "destructive" | "secondary" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

export function ThemeToggle({ 
  className = "",
  variant = "ghost",
  size = "icon"
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={`${className} transition-colors`}
      data-testid="button-theme-toggle"
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}