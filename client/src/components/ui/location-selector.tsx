import { useState, useRef, useEffect } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// UK Regions - Keep this list synchronized between codebases
const UK_REGIONS = [
  { value: 'UK', label: 'All of UK', type: 'national' },
  { value: 'England', label: 'England', type: 'country' },
  { value: 'Scotland', label: 'Scotland', type: 'country' },
  { value: 'Wales', label: 'Wales', type: 'country' },
  { value: 'Northern Ireland', label: 'Northern Ireland', type: 'country' },
  { value: 'North East England', label: 'North East', type: 'region' },
  { value: 'North West England', label: 'North West', type: 'region' },
  { value: 'Yorkshire and the Humber', label: 'Yorkshire and the Humber', type: 'region' },
  { value: 'East Midlands', label: 'East Midlands', type: 'region' },
  { value: 'West Midlands', label: 'West Midlands', type: 'region' },
  { value: 'East of England', label: 'East of England', type: 'region' },
  { value: 'London', label: 'London', type: 'region' },
  { value: 'South East England', label: 'South East', type: 'region' },
  { value: 'South West England', label: 'South West', type: 'region' },
] as const;

interface LocationSelectorProps {
  value: string;
  onChange: (location: string, locationType: 'national' | 'region' | 'city') => void;
  onCitySearch?: (query: string) => Promise<Array<{ place_id: string; description: string; structured_formatting?: { main_text: string; secondary_text: string } }>>;
  className?: string;
  required?: boolean;
}

export function LocationSelector({ value, onChange, onCitySearch, className, required = false }: LocationSelectorProps) {
  const [locationType, setLocationType] = useState<'national' | 'city'>(() => {
    // Detect initial type from value
    const isNationalOrRegion = UK_REGIONS.some(r => r.value === value);
    return isNationalOrRegion ? 'national' : 'city';
  });
  const [citySearch, setCitySearch] = useState(value);
  const [cityPredictions, setCityPredictions] = useState<Array<{ place_id: string; description: string; structured_formatting?: { main_text: string; secondary_text: string } }>>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const cityWrapperRef = useRef<HTMLDivElement>(null);

  // Sync citySearch with value when value changes externally
  useEffect(() => {
    if (locationType === 'city') {
      setCitySearch(value);
    }
  }, [value, locationType]);

  // Handle city search with debouncing
  useEffect(() => {
    if (locationType !== 'city' || !onCitySearch) return;
    if (citySearch.length < 2) {
      setCityPredictions([]);
      setShowCityDropdown(false);
      return;
    }

    const searchCities = async () => {
      setCityLoading(true);
      try {
        const results = await onCitySearch(citySearch);
        setCityPredictions(results);
        setShowCityDropdown(results.length > 0);
      } catch (error) {
        console.error('Error searching cities:', error);
        setCityPredictions([]);
        setShowCityDropdown(false);
      } finally {
        setCityLoading(false);
      }
    };

    const timeoutId = setTimeout(searchCities, 300);
    return () => clearTimeout(timeoutId);
  }, [citySearch, locationType, onCitySearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityWrapperRef.current && !cityWrapperRef.current.contains(event.target as Node)) {
        setShowCityDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLocationTypeChange = (type: 'national' | 'city') => {
    setLocationType(type);
    if (type === 'national') {
      // Default to UK when switching to national
      onChange('UK', 'national');
    } else {
      // Clear city search
      setCitySearch('');
      onChange('', 'city');
    }
  };

  const handleRegionSelect = (region: string, type: 'national' | 'region') => {
    onChange(region, type);
  };

  const handleCitySelect = (prediction: { place_id: string; description: string }) => {
    setCitySearch(prediction.description);
    onChange(prediction.description, 'city');
    setShowCityDropdown(false);
    setCityPredictions([]);
  };

  return (
    <div className={className}>
      {/* Step 1: Location Type Selector */}
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--foreground)' }}>
          Where does this artist perform? {required && <span style={{ color: 'var(--destructive)' }}>*</span>}
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => handleLocationTypeChange('national')}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '0.5rem',
              border: `2px solid ${locationType === 'national' ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: locationType === 'national' ? 'var(--primary-translucent)' : 'var(--background)',
              color: locationType === 'national' ? 'var(--primary)' : 'var(--foreground)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
          >
            National/Regional
          </button>
          <button
            type="button"
            onClick={() => handleLocationTypeChange('city')}
            style={{
              padding: '0.75rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              borderRadius: '0.5rem',
              border: `2px solid ${locationType === 'city' ? 'var(--primary)' : 'var(--border)'}`,
              backgroundColor: locationType === 'city' ? 'var(--primary-translucent)' : 'var(--background)',
              color: locationType === 'city' ? 'var(--primary)' : 'var(--foreground)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center'
            }}
          >
            Specific Location
          </button>
        </div>
      </div>

      {/* Step 2a: National/Regional Dropdown */}
      {locationType === 'national' && (
        <div style={{ marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--foreground)' }}>
            Area
          </label>
          <select
            value={value}
            onChange={(e) => {
              const selected = UK_REGIONS.find(r => r.value === e.target.value);
              if (selected) {
                // Map 'country' to 'region' for the callback
                const mappedType = selected.type === 'country' ? 'region' : selected.type;
                handleRegionSelect(selected.value, mappedType);
              }
            }}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              fontSize: '0.875rem',
              borderRadius: '0.5rem',
              border: '2px solid var(--border)',
              backgroundColor: 'var(--background)',
              color: 'var(--foreground)',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {UK_REGIONS.map((region) => (
              <option key={region.value} value={region.value}>
                {region.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
            Choose this if the band tours across the UK or a specific region
          </p>
        </div>
      )}

      {/* Step 2b: City Autocomplete */}
      {locationType === 'city' && (
        <div ref={cityWrapperRef} style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', display: 'block', color: 'var(--foreground)' }}>
            City/Town
          </label>
          <div style={{ position: 'relative' }}>
            <MapPin style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="e.g., Manchester, UK"
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '0.5rem 2.5rem 0.5rem 2.5rem',
                fontSize: '0.875rem',
                borderRadius: '0.5rem',
                border: '2px solid var(--border)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none'
              }}
            />
            {cityLoading && (
              <Loader2 style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '1rem', height: '1rem', color: 'var(--muted-foreground)', animation: 'spin 1s linear infinite' }} />
            )}
          </div>

          {/* City Dropdown */}
          {showCityDropdown && cityPredictions.length > 0 && (
            <div style={{
              position: 'absolute',
              zIndex: 50,
              width: '100%',
              marginTop: '0.25rem',
              overflow: 'hidden',
              borderRadius: '0.375rem',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--card-bg)',
              padding: '0.25rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
            }}>
              {cityPredictions.map((prediction) => (
                <div
                  key={prediction.place_id}
                  onClick={() => handleCitySelect(prediction)}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    cursor: 'pointer',
                    userSelect: 'none',
                    alignItems: 'center',
                    gap: '0.5rem',
                    borderRadius: '0.125rem',
                    padding: '0.5rem',
                    fontSize: '0.875rem',
                    outline: 'none',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <MapPin style={{ width: '1rem', height: '1rem', color: 'var(--muted-foreground)' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem', color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {prediction.structured_formatting?.main_text || prediction.description}
                    </div>
                    {prediction.structured_formatting?.secondary_text && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prediction.structured_formatting.secondary_text}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', marginTop: '0.25rem' }}>
            Choose this if the band primarily performs in one city or town
          </p>
        </div>
      )}
    </div>
  );
}
