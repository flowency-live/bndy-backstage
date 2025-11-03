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

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      setIsError(true);
      setIsLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setIsLoaded(true);
      setIsLoading(false);
      const available = initGoogleMapsCheck();
    };

    script.onerror = (error) => {
      setIsError(true);
      setIsLoading(false);
    };

    document.head.appendChild(script);
  }, []);

  // Function to manually load Google Maps when needed
  const loadGoogleMaps = useCallback(async (): Promise<boolean> => {
    // If already loaded, return true
    if (isLoaded) {
      return true;
    }

    // Check if script element exists and Google Maps is available
    const scriptExists = document.getElementById('google-maps-script');
    const googleMapsAvailable = initGoogleMapsCheck();

    if (scriptExists && googleMapsAvailable) {
      setIsLoaded(true);
      setIsLoading(false);
      return true;
    }

    // If already loading, wait for result by checking DOM directly
    if (isLoading || scriptExists) {
      return new Promise<boolean>((resolve) => {
        let checkCount = 0;
        const checkInterval = setInterval(() => {
          checkCount++;
          // Check actual Google Maps availability, not stale state
          const available = initGoogleMapsCheck();

          if (available) {
            clearInterval(checkInterval);
            setIsLoaded(true);
            setIsLoading(false);
            resolve(true);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          const available = initGoogleMapsCheck();
          if (available) {
            setIsLoaded(true);
            setIsLoading(false);
            resolve(true);
          } else {
            setIsError(true);
            setIsLoading(false);
            resolve(false);
          }
        }, 10000);
      });
    }

    // Set loading state and load script
    setIsLoading(true);
    loadGoogleMapsScript();

    // Wait for script to load by checking DOM directly
    return new Promise<boolean>((resolve) => {
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        // Check actual Google Maps availability, not stale state
        const available = initGoogleMapsCheck();

        if (available) {
          clearInterval(checkInterval);
          setIsLoaded(true);
          setIsLoading(false);
          resolve(true);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        const available = initGoogleMapsCheck();
        if (available) {
          setIsLoaded(true);
          setIsLoading(false);
          resolve(true);
        } else {
          setIsError(true);
          setIsLoading(false);
          resolve(false);
        }
      }, 10000);
    });
  }, [isLoaded, isLoading, isError, loadGoogleMapsScript]);

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, isError, loadGoogleMaps }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}
