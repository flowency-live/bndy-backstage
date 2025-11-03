import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

const ONBOARDING_STORAGE_KEY = 'bndy-onboarding-complete';

export function OnboardingTour() {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true);

  useEffect(() => {
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
      overlayOpacity: 0.2,
      smoothScroll: true,
      steps: [
        {
          element: '[data-testid="nav-dashboard"]',
          popover: {
            title: 'Welcome to bndy!',
            description: 'Your command center for managing events, songs, and band activities.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-testid="nav-calendar"]',
          popover: {
            title: 'Calendar',
            description: 'View and manage all your gigs, rehearsals, and availability in one place.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-testid="nav-playbook"]',
          popover: {
            title: 'Playbook',
            description: 'Your song library and setlists - perfect for planning performances.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-testid="nav-pipeline"]',
          popover: {
            title: 'Pipeline',
            description: 'Collaborate on new songs with voting and practice tracking.',
            side: 'right',
            align: 'center'
          }
        },
        {
          element: '[data-testid="nav-admin"]',
          popover: {
            title: 'Admin',
            description: 'Manage your artist profile, band members, and settings.',
            side: 'right',
            align: 'center'
          }
        },
        {
          popover: {
            title: 'Ready to rock!',
            description: 'You can restart this tour anytime from your profile menu.',
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
