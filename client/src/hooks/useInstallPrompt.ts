import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UseInstallPromptReturn {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
  isInstalled: boolean;
  isIOS: boolean;
  dismissPrompt: () => void;
  isDismissed: boolean;
}

const DISMISS_KEY = 'bndy-install-prompt-dismissed';

export function useInstallPrompt(): UseInstallPromptReturn {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Detect if app is already installed (running in standalone mode)
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkInstalled();

    // Check if user has dismissed the prompt permanently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Capture beforeinstallprompt event (Android/Chrome)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Detect iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  // Trigger install prompt (Android/Chrome only)
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[useInstallPrompt] No deferred prompt available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        console.log('[useInstallPrompt] User accepted install prompt');
      } else {
        console.log('[useInstallPrompt] User dismissed install prompt');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('[useInstallPrompt] Error showing install prompt:', error);
    }
  }, [deferredPrompt]);

  // Dismiss prompt permanently
  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setIsDismissed(true);
  }, []);

  // Can show install prompt if:
  // 1. Not already installed
  // 2. Not already dismissed
  // 3. Either have deferred prompt (Android) OR is iOS (show manual instructions)
  const canInstall = !isInstalled && !isDismissed && (!!deferredPrompt || isIOS);

  return {
    canInstall,
    promptInstall,
    isInstalled,
    isIOS,
    dismissPrompt,
    isDismissed,
  };
}
