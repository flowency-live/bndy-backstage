import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Smartphone, X } from 'lucide-react';

interface InstallPromptProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

export function InstallPrompt({
  isOpen,
  onClose,
  title = "Add BNDY to Your Home Screen",
  description = "Get quick access to your band calendar, setlists, and more!"
}: InstallPromptProps) {
  const { canInstall, promptInstall, isIOS, dismissPrompt } = useInstallPrompt();

  if (!isOpen || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOS) {
      // iOS - instructions are shown, user will manually add
      return;
    }

    // Android/Chrome - trigger native prompt
    await promptInstall();
    onClose();
  };

  const handleDismiss = () => {
    dismissPrompt();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl animate-slide-up">
        <CardHeader className="relative pb-3">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-brand-accent rounded-xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {isIOS ? (
            // iOS Instructions
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-medium">
                Follow these steps to add BNDY to your home screen:
              </p>
              <ol className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button{' '}
                    <svg className="inline w-4 h-4 mx-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                    </svg>
                    {' '}at the bottom of your screen
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>"Add to Home Screen"</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-brand-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>
                    Tap <strong>"Add"</strong> in the top right corner
                  </span>
                </li>
              </ol>
            </div>
          ) : (
            // Android/Chrome - native install prompt
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Install BNDY as an app for quick access from your home screen.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            {!isIOS && (
              <Button
                onClick={handleInstall}
                className="w-full bg-brand-accent hover:bg-brand-accent-light text-white"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Install App
              </Button>
            )}

            <div className="flex gap-2">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
              >
                {isIOS ? 'Got It' : 'Maybe Later'}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                className="flex-1 text-muted-foreground"
              >
                Don't Show Again
              </Button>
            </div>
          </div>

          {isIOS && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              Once installed, you can launch BNDY directly from your home screen!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
