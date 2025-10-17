import { useState } from 'react';
import { Upload, MapPin, CheckCircle, XCircle, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import LocationAutocomplete from '@/components/ui/location-autocomplete';

interface ExtractedVenue {
  name: string;
  address: string;
  website?: string;
  googlePlaceId?: string;
  location: {
    lat: number;
    lng: number;
  };
  status: 'IN_BNDY' | 'NEW_VENUE';
  confidence: number;
  selected: boolean;
}

export default function VenueImportPage() {
  const { toast } = useToast();

  // Form state
  const [sourceInput, setSourceInput] = useState('');
  const [locationContext, setLocationContext] = useState('');
  const [locationLat, setLocationLat] = useState<number | undefined>();
  const [locationLng, setLocationLng] = useState<number | undefined>();
  const [searchRadius, setSearchRadius] = useState('10');
  const [sourceName, setSourceName] = useState('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedVenues, setExtractedVenues] = useState<ExtractedVenue[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState<{success: number; failed: number} | null>(null);

  // Backfill state
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResults, setBackfillResults] = useState<{success: number; failed: number; noWebsite: number} | null>(null);

  const handleExtractAndMatch = async () => {
    if (!sourceInput.trim() || !locationContext.trim()) {
      toast({
        title: 'Missing information',
        description: 'Please provide both source input and location context',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setExtractedVenues([]);
    setImportResults(null);

    try {
      const response = await fetch('https://api.bndy.co.uk/api/admin/venues/extract-and-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          source: sourceInput,
          locationContext,
          locationLat,
          locationLng,
          searchRadius: parseInt(searchRadius),
          sourceName: sourceName || 'Manual import',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to extract and match venues');
      }

      const data = await response.json();
      setExtractedVenues(data.venues.map((v: ExtractedVenue) => ({ ...v, selected: v.status === 'NEW_VENUE' })));

      toast({
        title: 'Extraction complete',
        description: `Found ${data.venues.length} venues (${data.venues.filter((v: ExtractedVenue) => v.status === 'NEW_VENUE').length} new)`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extract venues',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleVenue = (index: number) => {
    setExtractedVenues(prev => prev.map((v, i) => i === index ? { ...v, selected: !v.selected } : v));
  };

  const handleSelectAll = () => {
    const hasUnselected = extractedVenues.some(v => v.status === 'NEW_VENUE' && !v.selected);
    setExtractedVenues(prev => prev.map(v => v.status === 'NEW_VENUE' ? { ...v, selected: hasUnselected } : v));
  };

  const handleImport = async () => {
    const selectedVenues = extractedVenues.filter(v => v.selected && v.status === 'NEW_VENUE');

    if (selectedVenues.length === 0) {
      toast({
        title: 'No venues selected',
        description: 'Please select at least one venue to import',
        variant: 'destructive',
      });
      return;
    }

    setIsImporting(true);

    let successCount = 0;
    let failedCount = 0;

    for (const venue of selectedVenues) {
      try {
        const response = await fetch('https://api.bndy.co.uk/api/venues/find-or-create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: venue.name,
            address: venue.address,
            latitude: venue.location.lat,
            longitude: venue.location.lng,
            googlePlaceId: venue.googlePlaceId,
            website: venue.website,
            source: sourceName || 'godmode_import',
          }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
      }
    }

    setImportResults({ success: successCount, failed: failedCount });
    setIsImporting(false);

    toast({
      title: 'Import complete',
      description: `Successfully imported ${successCount} venues${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
    });

    // Clear extracted venues after successful import
    if (successCount > 0) {
      setExtractedVenues([]);
      setSourceInput('');
    }
  };

  const handleBackfillWebsites = async () => {
    setIsBackfilling(true);
    setBackfillResults(null);

    try {
      const response = await fetch('https://api.bndy.co.uk/api/admin/venues/backfill-websites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          maxVenues: 50, // Process 50 at a time
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to backfill websites');
      }

      const data = await response.json();
      setBackfillResults({
        success: data.success,
        failed: data.failed,
        noWebsite: data.noWebsite,
      });

      toast({
        title: 'Backfill complete',
        description: `Enriched ${data.success} venues with websites`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to backfill websites',
        variant: 'destructive',
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  const newVenuesCount = extractedVenues.filter(v => v.status === 'NEW_VENUE').length;
  const existingVenuesCount = extractedVenues.filter(v => v.status === 'IN_BNDY').length;
  const selectedCount = extractedVenues.filter(v => v.selected).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Venue Import Tool</h2>
        <p className="text-muted-foreground">
          Bulk import venues from external sources with automatic Google Places enrichment
        </p>
      </div>

      {/* Backfill Section */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backfill Existing Venues
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Enrich existing venues with website URLs from Google Places API. Processes venues with Google Place IDs but missing websites.
            </p>
            {backfillResults && (
              <div className="text-sm space-y-1">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{backfillResults.success} venues enriched</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{backfillResults.noWebsite} venues had no website</span>
                </div>
                {backfillResults.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{backfillResults.failed} failed</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={handleBackfillWebsites}
            disabled={isBackfilling}
            className="flex items-center gap-2"
          >
            {isBackfilling ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Run Backfill (50 venues)
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Source Input Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Source Input
        </h3>

        <div className="space-y-4">
          <div>
            <Label htmlFor="source-input">Paste URL or raw text</Label>
            <Textarea
              id="source-input"
              placeholder="Paste a URL (e.g., https://www.gigs-news.uk/stockport) or raw text containing venue names..."
              value={sourceInput}
              onChange={(e) => setSourceInput(e.target.value)}
              rows={6}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location-context">Location Context *</Label>
              <LocationAutocomplete
                value={locationContext}
                onChange={(location, lat, lng) => {
                  setLocationContext(location);
                  setLocationLat(lat);
                  setLocationLng(lng);
                }}
                placeholder="e.g., Stockport, Manchester, London"
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label htmlFor="search-radius">Search Radius (km)</Label>
              <Input
                id="search-radius"
                type="number"
                placeholder="10"
                value={searchRadius}
                onChange={(e) => setSearchRadius(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="source-name">Source Name (optional)</Label>
            <Input
              id="source-name"
              placeholder="e.g., gigs-news.uk Stockport"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleExtractAndMatch}
            disabled={isProcessing || !sourceInput.trim() || !locationContext.trim()}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-2" />
                Extract & Match Venues
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Results Section */}
      {extractedVenues.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Review Extracted Venues</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {newVenuesCount} new • {existingVenuesCount} existing • {selectedCount} selected
              </span>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {extractedVenues.filter(v => v.status === 'NEW_VENUE').every(v => v.selected) ? 'Deselect All' : 'Select All New'}
              </Button>
              <Button
                onClick={handleImport}
                disabled={isImporting || selectedCount === 0}
                size="sm"
              >
                {isImporting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  `Import Selected (${selectedCount})`
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {extractedVenues.map((venue, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  venue.status === 'IN_BNDY' ? 'bg-muted/50' : 'bg-background'
                }`}
              >
                {venue.status === 'NEW_VENUE' && (
                  <Checkbox
                    checked={venue.selected}
                    onCheckedChange={() => handleToggleVenue(index)}
                    className="mt-1"
                  />
                )}
                {venue.status === 'IN_BNDY' && (
                  <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{venue.name}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        venue.status === 'NEW_VENUE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {venue.status === 'NEW_VENUE' ? 'NEW VENUE' : 'IN BNDY'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {venue.confidence}% confidence
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">{venue.address}</div>
                  {venue.website && (
                    <div className="text-sm text-blue-600 mt-1">{venue.website}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {importResults && (
            <div className="mt-4 p-4 rounded-lg bg-muted">
              <h4 className="font-medium mb-2">Import Results</h4>
              <div className="flex gap-4 text-sm">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>{importResults.success} imported</span>
                </div>
                {importResults.failed > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{importResults.failed} failed</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
