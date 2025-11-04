import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Check, X, Edit2, Globe, Facebook, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getAllVenues, updateVenue, type Venue } from '@/lib/services/godmode-service';

interface EnrichmentData {
  suggested_website: string | null;
  suggested_facebook: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  notes: string;
  date: string;
}

export default function EnrichmentQueuePage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingVenue, setEditingVenue] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{website: string | null; facebook: string | null}>({
    website: null,
    facebook: null
  });

  const fetchVenuesNeedingReview = async () => {
    setLoading(true);
    setError(null);
    try {
      const allVenues = await getAllVenues();
      const needsReview = allVenues.filter(
        v => v.enrichment_status === 'needs_review' && v.enrichment_data
      );
      setVenues(needsReview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenuesNeedingReview();
  }, []);

  const handleAccept = async (venue: Venue) => {
    if (!venue.enrichment_data) return;

    const enrichmentData = venue.enrichment_data as EnrichmentData;

    try {
      const updates: Partial<Venue> = {
        enrichment_status: 'reviewed'
      };

      // Add website if suggested
      if (enrichmentData.suggested_website) {
        updates.website = enrichmentData.suggested_website;
      }

      // Add Facebook to socialMediaUrls if suggested
      if (enrichmentData.suggested_facebook) {
        const socialMediaUrls = venue.socialMediaUrls || [];
        const hasFacebook = socialMediaUrls.some((url: string) =>
          url && typeof url === 'string' && url.includes('facebook.com')
        );

        if (!hasFacebook) {
          updates.socialMediaUrls = [
            ...socialMediaUrls,
            enrichmentData.suggested_facebook
          ];
        }
      }

      await updateVenue(venue.id, updates);
      setVenues(venues.filter(v => v.id !== venue.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept suggestions');
    }
  };

  const handleReject = async (venue: Venue) => {
    try {
      await updateVenue(venue.id, {
        enrichment_status: 'rejected',
        enrichment_data: null
      });
      setVenues(venues.filter(v => v.id !== venue.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject suggestions');
    }
  };

  const handleEditStart = (venue: Venue) => {
    if (!venue.enrichment_data) return;
    const enrichmentData = venue.enrichment_data as EnrichmentData;

    setEditingVenue(venue.id);
    setEditForm({
      website: enrichmentData.suggested_website,
      facebook: enrichmentData.suggested_facebook
    });
  };

  const handleEditSave = async (venue: Venue) => {
    try {
      const updates: Partial<Venue> = {
        enrichment_status: 'reviewed'
      };

      // Add edited website
      if (editForm.website) {
        updates.website = editForm.website;
      }

      // Add edited Facebook
      if (editForm.facebook) {
        const socialMediaUrls = venue.socialMediaUrls || [];
        const hasFacebook = socialMediaUrls.some((url: string) =>
          url && typeof url === 'string' && url.includes('facebook.com')
        );

        if (!hasFacebook) {
          updates.socialMediaUrls = [
            ...socialMediaUrls,
            editForm.facebook
          ];
        } else {
          // Replace existing Facebook URL
          updates.socialMediaUrls = socialMediaUrls.map((url: string) =>
            url && typeof url === 'string' && url.includes('facebook.com')
              ? editForm.facebook!
              : url
          );
        }
      }

      await updateVenue(venue.id, updates);
      setVenues(venues.filter(v => v.id !== venue.id));
      setEditingVenue(null);
      setEditForm({ website: null, facebook: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save edits');
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'MEDIUM':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Medium Confidence</Badge>;
      case 'LOW':
        return <Badge variant="secondary" className="bg-red-500/10 text-red-700 border-red-500/20">Low Confidence</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            Enrichment Queue
          </h1>
          <p className="text-muted-foreground mt-1">
            Review AI-suggested social media URLs that need verification
          </p>
        </div>
        <Button onClick={fetchVenuesNeedingReview} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {loading && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto" />
        </div>
      )}

      {error && (
        <div className="text-destructive text-center py-12 flex items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {!loading && !error && venues.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No venues need review</p>
            <p className="text-sm mt-2">All AI suggestions have been processed</p>
          </div>
        </Card>
      )}

      {!loading && !error && venues.length > 0 && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            {venues.length} venue{venues.length !== 1 ? 's' : ''} pending review
          </div>

          {venues.map(venue => {
            const enrichmentData = venue.enrichment_data as EnrichmentData;
            const isEditing = editingVenue === venue.id;

            return (
              <Card key={venue.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{venue.name}</h3>
                      <p className="text-sm text-muted-foreground">{venue.address}</p>
                    </div>
                    {getConfidenceBadge(enrichmentData.confidence)}
                  </div>

                  {enrichmentData.notes && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm font-medium mb-1">AI Notes:</p>
                      <p className="text-sm text-muted-foreground">{enrichmentData.notes}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Website */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Globe className="h-4 w-4" />
                        Suggested Website
                      </div>
                      {isEditing ? (
                        <Input
                          value={editForm.website || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://example.com"
                        />
                      ) : (
                        <div className="text-sm">
                          {enrichmentData.suggested_website ? (
                            <a
                              href={enrichmentData.suggested_website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                            >
                              {enrichmentData.suggested_website}
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic">None found</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Facebook */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Facebook className="h-4 w-4" />
                        Suggested Facebook
                      </div>
                      {isEditing ? (
                        <Input
                          value={editForm.facebook || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, facebook: e.target.value }))}
                          placeholder="https://facebook.com/..."
                        />
                      ) : (
                        <div className="text-sm">
                          {enrichmentData.suggested_facebook ? (
                            <a
                              href={enrichmentData.suggested_facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 hover:underline break-all"
                            >
                              {enrichmentData.suggested_facebook}
                            </a>
                          ) : (
                            <span className="text-muted-foreground italic">None found</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleEditSave(venue)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingVenue(null);
                            setEditForm({ website: null, facebook: null });
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(venue)}
                        >
                          <Check className="h-4 w-4 mr-2" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditStart(venue)}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(venue)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
