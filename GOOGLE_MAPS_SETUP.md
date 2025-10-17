# Google Maps API Setup for BNDY Backstage

## Required Google Cloud APIs

The BNDY Backstage application requires the following Google Cloud APIs to be enabled:

### 1. **Places API (New)** ✅
- **Purpose**: Autocomplete for city/town selection
- **Used in**: LocationAutocomplete component
- **Endpoint**: `https://maps.googleapis.com/maps/api/js?libraries=places`

### 2. **Geocoding API** ⚠️ REQUIRED
- **Purpose**: Convert place names to coordinates (lat/lng)
- **Used in**: LocationAutocomplete component when user selects a location
- **Endpoint**: `https://maps.googleapis.com/maps/api/geocode/json`
- **Error if missing**: `REQUEST_DENIED` in browser console

### 3. **Maps JavaScript API** (Optional)
- **Purpose**: Display maps in UI (if needed in future)
- **Currently**: Used for loading the Places library

## Current Issue

The **Geocoding API is not enabled** in the Google Cloud project, causing the error:
```
[LocationAutocomplete] Geocoding failed: REQUEST_DENIED
```

## How to Fix

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with API key `AIzaSyB_I7xhBq0ZS4bZ9bn4sJv9Iq7_a5x4b1I`)
3. Navigate to **APIs & Services** > **Library**
4. Search for "**Geocoding API**"
5. Click **Enable**

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
