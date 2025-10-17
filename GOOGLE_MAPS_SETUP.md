# Google Maps API Setup for BNDY Backstage

## Required Google Cloud APIs

The BNDY Backstage application requires the following Google Cloud APIs to be enabled:

### 1. **Places API (New)** ✅
- **Purpose**: Autocomplete for city/town selection
- **Used in**: LocationAutocomplete component
- **Endpoint**: `https://maps.googleapis.com/maps/api/js?libraries=places`

### 2. **Maps JavaScript API** ✅
- **Purpose**: Geocoding (convert place names to coordinates)
- **Used in**: LocationAutocomplete component when user selects a location
- **Method**: Uses `google.maps.Geocoder()` from JavaScript SDK
- **Note**: No REST API calls, no CORS issues

## API Keys Used

### Frontend (Backstage Client)
- **Key**: `bndy_places_APIKey` (AIzaSyB_I7xhBq0ZS4bZ9bn4sJv9Iq7_a5x4b1I)
- **Purpose**: Looking up towns & cities in LocationAutocomplete
- **Used in**: `/admin`, `/profile`, and godmode `/venue-import`
- **Env var**: `VITE_GOOGLE_MAPS_API_KEY`

### Backend (Venues Lambda)
- **Key**: `bndy_Venues_key` (AIzaSyCXtOe0EV-UTTuE62XTV6Z7K18XDEYGv8Q)
- **Purpose**: Looking up venues (places where events are held)
- **Used in**: Venue import extract-and-match, backfill-websites
- **Env var**: `GOOGLE_MAPS_API_KEY` in Lambda

## Recent Fix (2025-10-17)

**Problem**: LocationAutocomplete was making direct REST API calls to the Geocoding API, causing `REQUEST_DENIED` errors due to HTTP referrer restrictions.

**Solution**: Changed to use the Google Maps JavaScript SDK Geocoder (`google.maps.Geocoder()`), which:
- Uses the same API key already loaded for Places Autocomplete
- Avoids CORS and referrer restriction issues
- More reliable and consistent with other Google Maps features
- No additional API configuration needed

## API Key Configuration

The API key is configured in:
- **File**: `bndy-backstage/client/.env`
- **Variable**: `VITE_GOOGLE_MAPS_API_KEY`

## Cost Estimate

- **Places Autocomplete**: $2.83 per 1,000 requests
- **Geocoding API**: $5.00 per 1,000 requests
- **Expected usage**: Low (only used in admin godmode interface)

## Security

The API key should have these restrictions:
- **Application restrictions**: HTTP referrers
- **Allowed referrers**:
  - `https://backstage.bndy.co.uk/*`
  - `http://localhost:*` (for development)
- **API restrictions**:
  - Places API (New)
  - Geocoding API
  - Maps JavaScript API

## Testing

After enabling the Geocoding API:

1. Go to **Godmode** > **Import** tab
2. Click on "Location Context" field
3. Type a city name (e.g., "Stockport")
4. Select from the dropdown
5. Check browser console - should see:
   ```
   [LocationAutocomplete] Geocoded to: 53.4083714, -2.1575332
   ```

## References

- [Geocoding API Documentation](https://developers.google.com/maps/documentation/geocoding/overview)
- [Places API Documentation](https://developers.google.com/maps/documentation/places/web-service/overview)
