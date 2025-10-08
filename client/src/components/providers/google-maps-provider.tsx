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
    console.log('[GoogleMaps] loadGoogleMapsScript called');

    // Check if script already exists
    if (document.getElementById('google-maps-script')) {
      console.log('[GoogleMaps] Script already exists in DOM');
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    console.log('[GoogleMaps] API Key configured:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO - MISSING!');

    if (!apiKey) {
      console.error('[GoogleMaps] VITE_GOOGLE_MAPS_API_KEY is not configured!');
      setIsError(true);
      setIsLoading(false);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;

    console.log('[GoogleMaps] Creating script tag:', script.src.replace(apiKey, 'API_KEY_HIDDEN'));

    script.onload = () => {
      console.log('[GoogleMaps] Script loaded successfully');
      setIsLoaded(true);
      setIsLoading(false);
      const available = initGoogleMapsCheck();
      console.log('[GoogleMaps] Google Maps available after load:', available);
    };

    script.onerror = (error) => {
      console.error('[GoogleMaps] Failed to load Google Maps script:', error);
      setIsError(true);
      setIsLoading(false);
    };

    document.head.appendChild(script);
    console.log('[GoogleMaps] Script tag appended to document head');
  }, []);

  // Function to manually load Google Maps when needed
  const loadGoogleMaps = useCallback(async (): Promise<boolean> => {
    console.log('[GoogleMaps] loadGoogleMaps called. isLoaded:', isLoaded, 'isLoading:', isLoading, 'isError:', isError);

    // If already loaded, return true
    if (isLoaded) {
      console.log('[GoogleMaps] Already loaded, returning true');
      return true;
    }

    // If already loading, wait for result
    if (isLoading) {
      console.log('[GoogleMaps] Already loading, waiting for result...');
      return new Promise<boolean>((resolve) => {
        const checkInterval = setInterval(() => {
          if (isLoaded) {
            console.log('[GoogleMaps] Load complete while waiting');
            clearInterval(checkInterval);
            resolve(true);
          }
          if (isError) {
            console.log('[GoogleMaps] Error occurred while waiting');
            clearInterval(checkInterval);
            resolve(false);
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          console.warn('[GoogleMaps] Timeout waiting for script (10s)');
          clearInterval(checkInterval);
          resolve(false);
        }, 10000);
      });
    }

    // Set loading state and load script
    console.log('[GoogleMaps] Starting new load...');
    setIsLoading(true);
    loadGoogleMapsScript();

    // Wait for script to load
    return new Promise<boolean>((resolve) => {
      let checkCount = 0;
      const checkInterval = setInterval(() => {
        checkCount++;
        if (checkCount % 10 === 0) {
          console.log(`[GoogleMaps] Still waiting... (${checkCount * 100}ms)`);
        }

        if (isLoaded) {
          console.log('[GoogleMaps] Load successful');
          clearInterval(checkInterval);
          resolve(true);
        }
        if (isError) {
          console.error('[GoogleMaps] Load failed with error');
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);

      // Timeout after 10 seconds
      setTimeout(() => {
        console.error('[GoogleMaps] Timeout loading script (10s)');
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
