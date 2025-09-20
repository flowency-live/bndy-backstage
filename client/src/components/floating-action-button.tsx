import { Button } from "@/components/ui/button"

interface FloatingActionButtonProps {
  onClick: () => void
  hidden?: boolean
}

export default function FloatingActionButton({ onClick, hidden = false }: FloatingActionButtonProps) {
  if (hidden) return null

  return (
    <Button
      onClick={onClick}
      variant="action"
      size="lg"
      className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow p-0"
      data-testid="floating-add-button"
      aria-label="Add new event"
    >
      <i className="fas fa-plus text-lg"></i>
    </Button>
  )
}