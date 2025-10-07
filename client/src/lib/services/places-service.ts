// Google Places API Service for Backstage
// Venue search with Google Places integration

// Flag for checking if Google Maps is available
let googleMapsAvailable = false;

// Check if Google Maps API is loaded
export function isGoogleMapsAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.google !== undefined &&
    window.google.maps !== undefined &&
    window.google.maps.places !== undefined
  );
}

// Initialize Google Maps check
export function initGoogleMapsCheck() {
  googleMapsAvailable = isGoogleMapsAvailable();
  return googleMapsAvailable;
}

// Search venues using Google Places Text Search
export async function searchGooglePlaces(
  query: string
): Promise<google.maps.places.PlaceResult[]> {
  // First check if Google Maps is available
  if (!googleMapsAvailable) {
    googleMapsAvailable = initGoogleMapsCheck();
  }

  // If Google Maps is not available, return empty array
  if (!googleMapsAvailable) {
    console.warn('Google Maps Places API is not available for venue search');
    return [];
  }

  try {
    console.log('[Google Places] Searching for:', query);

    // Create a dummy div for the Places service
    const dummyDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(dummyDiv);

    // UK center for location bias
    const ukCenter = new google.maps.LatLng(54.5, -2.0);

    const results = await new Promise<google.maps.places.PlaceResult[]>((resolve) => {
      service.textSearch(
        {
          query: `${query} music venue OR bar OR pub OR nightclub OR entertainment`,
          location: ukCenter,
          radius: 500000, // 500km radius from UK center
        },
        (results, status) => {
          console.log('[Google Places] Status:', status);
          console.log('[Google Places] Results count:', results?.length || 0);

          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            console.log('[Google Places] First 3 results:', results.slice(0, 3).map(r => ({
              name: r.name,
              address: r.formatted_address,
              placeId: r.place_id
            })));
            resolve(results);
          } else if (status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            console.log('[Google Places] Zero results returned');
            resolve([]);
          } else {
            console.warn(`[Google Places] Error: ${status}`);
            resolve([]); // Return empty array instead of rejecting
          }
        }
      );
    });

    return results;
  } catch (error) {
    console.error('[Google Places] Error searching places:', error);
    return [];
  }
}

// Get place details from a place_id
export async function getPlaceDetails(
  placeId: string,
  fields: string[] = ['name', 'formatted_address', 'geometry', 'place_id', 'formatted_phone_number']
): Promise<google.maps.places.PlaceResult | null> {
  // Check if Google Maps is available
  if (!googleMapsAvailable) {
    googleMapsAvailable = initGoogleMapsCheck();
  }

  // If Google Maps is not available, return null
  if (!googleMapsAvailable) {
    console.warn('Google Maps Places API is not available for place details');
    return null;
  }

  try {
    // Create a dummy div for the Places Details service
    const dummyDiv = document.createElement('div');
    const placesService = new google.maps.places.PlacesService(dummyDiv);

    const placeDetails = await new Promise<google.maps.places.PlaceResult | null>((resolve) => {
      placesService.getDetails(
        {
          placeId,
          fields,
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place) {
            resolve(place);
          } else {
            console.warn(`Place Details API error: ${status}`);
            resolve(null);
          }
        }
      );
    });

    return placeDetails;
  } catch (error) {
    console.error('Error getting place details:', error);
    return null;
  }
}

// Convert Google PlaceResult to venue data structure
export function placeResultToVenueData(place: google.maps.places.PlaceResult) {
  return {
    name: place.name || '',
    address: place.formatted_address || '',
    googlePlaceId: place.place_id || '',
    latitude: place.geometry?.location?.lat() || 0,
    longitude: place.geometry?.location?.lng() || 0,
    location: {
      lat: place.geometry?.location?.lat() || 0,
      lng: place.geometry?.location?.lng() || 0,
    },
    phone: place.formatted_phone_number || '',
    source: 'google_places',
  };
}
