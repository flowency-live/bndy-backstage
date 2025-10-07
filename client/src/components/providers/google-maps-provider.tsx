// GoogleMapsProvider - Lazy load Google Maps API when needed
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { initGoogleMapsCheck } from '@/lib/services/places-service';

interface GoogleMapsContextType {
  isLoaded: boolean;
  isError: boolean;
  loadGoogleMaps: () => Promise<boolean>;
}

const GoogleMapsContext = createContext<GoogleMapsContextType | undefined>(undefined);

export function useGoogleMaps() {
  const context = useContext(GoogleMapsContext);
  if (!context) {
    throw new Error('useGoogleMaps must be used within a GoogleMapsProvider');
  }
  return context;
}

interface GoogleMapsProviderProps {
  children: ReactNode;
  autoLoad?: boolean; // Set to true to load Google Maps on mount
}

export function GoogleMapsProvider({ children, autoLoad = false }: GoogleMapsProviderProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if Google Maps is already available
  useEffect(() => {
    if (initGoogleMapsCheck()) {
      setIsLoaded(true);
    } else if (autoLoad) {
      setIsLoading(true);
      loadGoogleMapsScript();
    }
  }, [autoLoad]);

  const loadGoogleMapsScript = useCallback(() => {
    // Check if script already exists
    if (document.getElementById('google-maps-script')) {
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
      initGoogleMapsCheck();
    };

    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      setIsError(true);
      setIsLoading(false);
    };

    document.head.appendChild(script);
  }, []);

  // Function to manually load Google Maps when needed
  const loadGoogleMaps = useCallback(async (): Promise<boolean> => {
    // If already loaded, return true
    if (isLoaded) return true;

    // If already loading, wait for result
    if (isLoading) {
      return new Promise<boolean>((resolve) => {
        const checkInterval = setInterval(() => {
          if (isLoaded) {
            clearInterval(checkInterval);
            resolve(true);
          }
          if (isError) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve(false);
        }, 10000);
      });
    }

    // Set loading state and load script
    setIsLoading(true);
    loadGoogleMapsScript();

    // Wait for script to load
    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(() => {
        if (isLoaded) {
          clearInterval(checkInterval);
          resolve(true);
        }
        if (isError) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        if (!isLoaded) {
          setIsError(true);
          setIsLoading(false);
        }
        resolve(false);
      }, 10000);
    });
  }, [isLoaded, isLoading, isError, loadGoogleMapsScript]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, isError, loadGoogleMaps }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}
