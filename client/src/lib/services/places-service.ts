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

// Search venues using Google Places API (New) with stored lat/lng for location bias
export async function searchGooglePlaces(
  query: string,
  artistLocation?: string | null,
  artistLocationLat?: number,
  artistLocationLng?: number
): Promise<google.maps.places.PlaceResult[]> {
  // First check if Google Maps is available
  if (!googleMapsAvailable) {
    googleMapsAvailable = initGoogleMapsCheck();
  }

  // If Google Maps is not available, return empty array
  if (!googleMapsAvailable) {
    return [];
  }

  try {
    // Try the newer Place API (matches location autocomplete approach)
    if (google.maps.places.Place && (google.maps.places.Place as any).searchByText) {
      // Build request - simple query with structured location bias
      const request: any = {
        textQuery: query, // Simple query - no location text to avoid fuzzy match confusion
        fields: ['displayName', 'formattedAddress', 'location', 'id', 'websiteURI'],
        maxResultCount: 50, // Get diverse results
      };

      // Add location bias if stored lat/lng available
      if (artistLocationLat && artistLocationLng) {
        request.locationBias = {
          circle: {
            center: { latitude: artistLocationLat, longitude: artistLocationLng },
            radius: 80000.0, // 80km radius for UK coverage
          }
        };
      }

      const { places } = await (google.maps.places.Place as any).searchByText(request);

      if (!places || places.length === 0) {
        return [];
      }

      // Convert new API format to PlaceResult format for compatibility
      const results: google.maps.places.PlaceResult[] = places.map((place: any) => ({
        name: place.displayName,
        formatted_address: place.formattedAddress,
        place_id: place.id,
        website: place.websiteURI || undefined,
        geometry: {
          location: place.location,
        },
      }));

      return results;
    } else {
      // Fallback: If new API not available, return empty (requires Maps JavaScript API)
      // This prevents the ApiNotActivatedMapError
      return [];
    }
  } catch (error) {
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
            resolve(null);
          }
        }
      );
    });

    return placeDetails;
  } catch (error) {
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
    website: place.website || '',
    source: 'google_places',
  };
}

// Search for locations (cities/regions) with Google Places Autocomplete
export async function searchLocationAutocomplete(
  query: string
): Promise<google.maps.places.AutocompletePrediction[]> {
  // Check if Google Maps is available
  if (!googleMapsAvailable) {
    googleMapsAvailable = initGoogleMapsCheck();
  }

  // If Google Maps is not available, return empty array
  if (!googleMapsAvailable) {
    return [];
  }

  try {
    // Try the newer AutocompleteSuggestion API first (recommended as of March 2025)
    if (google.maps.places.AutocompleteSuggestion) {
      const request: google.maps.places.AutocompleteSuggestionRequest = {
        input: query,
        includedRegionCodes: ['gb'], // UK only
        includedPrimaryTypes: ['locality', 'administrative_area_level_3'], // Cities and towns
      };

      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

      if (!suggestions || suggestions.length === 0) {
        return [];
      }

      // Convert suggestions to AutocompletePrediction format for compatibility
      const predictions = suggestions.map((suggestion: any) => {
        const description = suggestion.placePrediction?.text?.text || '';

        // Try to get structured format, but fallback to splitting description if empty
        let mainText = suggestion.placePrediction?.structuredFormat?.mainText?.text || '';
        let secondaryText = suggestion.placePrediction?.structuredFormat?.secondaryText?.text || '';

        // If structured format is empty but we have a description, split it
        if (!mainText && description) {
          const parts = description.split(',').map((p: string) => p.trim());
          mainText = parts[0] || description;
          secondaryText = parts.slice(1).join(', ') || '';
        }

        return {
          description,
          place_id: suggestion.placePrediction?.placeId || '',
          structured_formatting: {
            main_text: mainText,
            secondary_text: secondaryText,
          },
        };
      }) as google.maps.places.AutocompletePrediction[];

      return predictions;
    } else {
      // Fallback to older AutocompleteService if new API not available
      const autocompleteService = new google.maps.places.AutocompleteService();

      const predictions = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve) => {
        const timeoutId = setTimeout(() => {
          resolve([]);
        }, 10000);

        autocompleteService.getPlacePredictions(
          {
            input: query,
            types: ['(cities)'], // Cities and towns
            componentRestrictions: { country: 'gb' }
          },
          (predictions, status) => {
            clearTimeout(timeoutId);

            if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
              resolve(predictions);
            } else {
              resolve([]);
            }
          }
        );
      });

      return predictions;
    }
  } catch (error) {
    return [];
  }
}
