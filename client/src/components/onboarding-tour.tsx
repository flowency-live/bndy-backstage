import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ONBOARDING_STORAGE_KEY = 'bndy-onboarding-complete';

export function OnboardingTour() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
    // Temporarily disabled - Driver.js/Tippy.js causing crashes on desktop
    // TODO: Re-enable once fixed
    return;

    // Check if user has completed onboarding
    const completed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (!completed) {
      setHasCompletedOnboarding(false);
      // Small delay to ensure DOM elements are rendered
      setTimeout(() => startTour(), 500);
    }
  }, []);

  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      animate: true,
      overlayOpacity: 0.5,
      smoothScroll: true,
      steps: [
        {
          popover: {
            title: 'Welcome to bndy!',
            description: 'Let\'s take a quick tour of your dashboard',
          }
        },
        {
          element: '[data-testid="tile-calendar"]',
          popover: {
            title: 'Calendar',
            description: 'View and manage all your gigs, rehearsals, and availability',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-testid="tile-playbook"]',
          popover: {
            title: 'Playbook',
            description: 'Your song library and setlists',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-testid="tile-pipeline"]',
          popover: {
            title: 'Pipeline',
            description: 'Collaborate on new songs with voting',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          element: '[data-testid="tile-admin"]',
          popover: {
            title: 'Admin',
            description: 'Manage your artist profile and band members',
            side: 'bottom',
            align: 'center'
          }
        },
        {
          popover: {
            title: 'Ready to rock!',
            description: 'Restart this tour anytime from your profile menu',
          }
        }
      ],
      onDestroyed: () => {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
        setHasCompletedOnboarding(true);
      },
    });

    driverObj.drive();
  };

  // Expose restart function for use in other components
  useEffect(() => {
    (window as any).restartBndyTour = startTour;
    return () => {
      delete (window as any).restartBndyTour;
    };
  }, []);

  return null;
}

export function restartOnboardingTour() {
  if ((window as any).restartBndyTour) {
    (window as any).restartBndyTour();
  }
}
