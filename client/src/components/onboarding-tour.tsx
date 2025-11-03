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
      steps: [
        {
          element: '[data-testid="nav-dashboard"]',
          popover: {
            title: 'Welcome to bndy!',
            description: 'Let\'s take a quick tour of your artist management platform. The Dashboard is your command center - see upcoming events, recent activity, and key metrics at a glance.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-testid="nav-calendar"]',
          popover: {
            title: 'Calendar',
            description: 'Never miss a gig! View all your events in a beautiful calendar layout. Add new events, manage dates, and keep your schedule organized.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-testid="nav-playbook"]',
          popover: {
            title: 'Playbook',
            description: 'Your musical arsenal. Manage your setlists, songs, and repertoire. Perfect for planning performances and tracking your material.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-testid="nav-pipeline"]',
          popover: {
            title: 'Pipeline',
            description: 'Track your opportunities from inquiry to booking. Manage leads, quotes, and potential gigs in one organized workspace.',
            side: 'right',
            align: 'start'
          }
        },
        {
          element: '[data-testid="nav-admin"]',
          popover: {
            title: 'Admin',
            description: 'Control your artist profile, manage band members, and handle settings. Your band\'s headquarters for everything administrative.',
            side: 'right',
            align: 'start'
          }
        },
        {
          popover: {
            title: 'You\'re all set!',
            description: 'That\'s it! You can restart this tour anytime from your profile menu. Ready to rock? Let\'s get started!',
          }
        }
      ],
      onDestroyed: () => {
        // Mark onboarding as complete when tour ends (completed or skipped)
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
