import { useState, useEffect } from 'react';
import { MapPin, CheckCircle, AlertCircle, RefreshCw, X, ExternalLink, Globe, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import {
  getEventQueue,
  approveQueueItem,
  rejectQueueItem,
  loadPOCResults,
  extractFromGigsNews,
  extractFromHTML,
  type QueueItem
} from '@/lib/services/godmode-service';
import { useConfirm } from '@/hooks/use-confirm';

export default function AgentEventsPage() {
  const { confirm, ConfirmDialog } = useConfirm();

  // Event Queue State
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [processingQueue, setProcessingQueue] = useState<string | null>(null);
  const [htmlInput, setHtmlInput] = useState('');
  const [showHtmlInput, setShowHtmlInput] = useState(false);
  const [queuePhase, setQueuePhase] = useState<'venues' | 'artists' | 'events'>('venues');

  const fetchEventQueue = async () => {
    setQueueLoading(true);
    setQueueError(null);
    try {
      const data = await getEventQueue();
      setQueueItems(data);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleLoadPOCResults = async () => {
    const confirmed = await confirm({
      title: 'Load POC Results',
      description: 'This will load the POC results from poc-results.json into the review queue. Continue?',
      confirmText: 'Load',
      variant: 'default',
    });
    if (!confirmed) return;

    setQueueLoading(true);
    try {
      await loadPOCResults();
      await fetchEventQueue();
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to load POC results');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleExtractFromGigsNews = async () => {
    const confirmed = await confirm({
      title: 'Extract Events from gigs-news.uk',
      description: 'This will fetch the latest HTML from gigs-news.uk, extract events with LLM, resolve venues/artists, and populate the review queue. This may take 2-3 minutes. Continue?',
      confirmText: 'Extract',
      variant: 'default',
    });
    if (!confirmed) return;

    setQueueLoading(true);
    setQueueError(null);
    try {
      const result = await extractFromGigsNews();
      await fetchEventQueue();
      console.log(`Extracted ${result.extracted} events, ${result.queued} added to queue`);
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to extract events from gigs-news');
    } finally {
      setQueueLoading(false);
    }
  };

  const handleExtractFromHTML = async () => {
    if (!htmlInput.trim()) {
      setQueueError('Please paste HTML content first');
      return;
    }

    const confirmed = await confirm({
      title: 'Extract Events from HTML',
      description: `This will extract events from the pasted HTML (${Math.round(htmlInput.length / 1024)}KB), resolve venues/artists, and populate the review queue. This takes ~60 seconds. Continue?`,
      confirmText: 'Extract',
      variant: 'default',
    });
    if (!confirmed) return;

    setQueueLoading(true);
    setQueueError(null);
    try {
      await extractFromHTML(htmlInput);
      await fetchEventQueue();
      setHtmlInput('');
      setShowHtmlInput(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('503')) {
        console.log('API Gateway timeout (expected) - reloading queue in 10s...');
        setTimeout(async () => {
          await fetchEventQueue();
          setHtmlInput('');
          setShowHtmlInput(false);
          setQueueLoading(false);
        }, 10000);
        return;
      }
      setQueueError(errorMessage);
      setQueueLoading(false);
    }
  };

  const handleApproveQueueItem = async (queueId: string) => {
    setProcessingQueue(queueId);
    try {
      await approveQueueItem(queueId);
      setQueueItems(queueItems.filter(item => item.queue_id !== queueId));
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setProcessingQueue(null);
    }
  };

  const handleRejectQueueItem = async (queueId: string) => {
    setProcessingQueue(queueId);
    try {
      await rejectQueueItem(queueId);
      setQueueItems(queueItems.filter(item => item.queue_id !== queueId));
    } catch (err) {
      setQueueError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setProcessingQueue(null);
    }
  };

  useEffect(() => {
    if (queueItems.length === 0) fetchEventQueue();
  }, []);

  // Group queue items by venue_group_key and artist_group_key
  const groupedVenues = queueItems.reduce((acc, item) => {
    const key = item.venue_group_key || item.venueName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, QueueItem[]>);

  const groupedArtists = queueItems.reduce((acc, item) => {
    const key = item.artist_group_key || item.artistName;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, QueueItem[]>);

  const uniqueVenueGroups = Object.keys(groupedVenues);
  const uniqueArtistGroups = Object.keys(groupedArtists);

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agentic Event Ingestion</h1>
        <p className="text-muted-foreground">Review and approve LLM-extracted events with automated venue/artist matching</p>
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Process in order: Venues → Artists → Events
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowHtmlInput(!showHtmlInput)} size="sm" variant="outline">
              {showHtmlInput ? 'Hide' : 'Paste HTML'}
            </Button>
            <Button onClick={handleLoadPOCResults} size="sm" variant="outline">
              Load POC Results
            </Button>
            <Button onClick={fetchEventQueue} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* HTML Input Area */}
      {showHtmlInput && (
        <Card className="p-4 mb-4">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Paste HTML from gigs-news.uk</label>
              <p className="text-xs text-muted-foreground mb-2">
                Open gigs-news.uk, right-click → "Save As" → "Webpage, HTML Only", then paste the contents here
              </p>
              <textarea
                value={htmlInput}
                onChange={(e) => setHtmlInput(e.target.value)}
                className="w-full h-40 p-3 border rounded font-mono text-xs"
                placeholder="<html>...</html>"
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {htmlInput.length > 0 && `${Math.round(htmlInput.length / 1024)}KB pasted`}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setHtmlInput('')} size="sm" variant="outline" disabled={!htmlInput}>
                  Clear
                </Button>
                <Button onClick={handleExtractFromHTML} size="sm" variant="default" disabled={!htmlInput.trim()}>
                  Extract Events
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {queueLoading && <div className="text-center py-12"><RefreshCw className="h-8 w-8 animate-spin mx-auto" /></div>}
      {queueError && <div className="text-destructive text-center py-12">{queueError}</div>}

      {!queueLoading && !queueError && queueItems.length === 0 && (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No events in the review queue</p>
            <Button onClick={handleLoadPOCResults} size="sm" variant="outline" className="mt-4">
              Load POC Results to Test
            </Button>
          </div>
        </Card>
      )}

      {!queueLoading && !queueError && queueItems.length > 0 && (
        <Tabs value={queuePhase} onValueChange={(val) => setQueuePhase(val as 'venues' | 'artists' | 'events')} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="venues">
              Phase 1: Venues ({uniqueVenueGroups.length})
            </TabsTrigger>
            <TabsTrigger value="artists">
              Phase 2: Artists ({uniqueArtistGroups.length})
            </TabsTrigger>
            <TabsTrigger value="events">
              Phase 3: Events ({queueItems.length})
            </TabsTrigger>
          </TabsList>

          {/* PHASE 1: VENUES TAB */}
          <TabsContent value="venues" className="mt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold">Phase 1: Venues</h3>
              <p className="text-sm text-muted-foreground">
                {uniqueVenueGroups.length} unique venues. Approve to create/match venues and enrich with Facebook URLs.
              </p>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Venue Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Confidence</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Facebook</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Website</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Events</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {uniqueVenueGroups.map(groupKey => {
                      const items = groupedVenues[groupKey];
                      const firstItem = items[0];
                      const isMatch = firstItem.venueResolution.action === 'MATCH_EXISTING';
                      const isCreate = firstItem.venueResolution.action === 'CREATE_NEW';
                      const hasExistingFB = firstItem.venueResolution.matched_venue?.facebookUrl;
                      const willEnrichFB = isMatch && !hasExistingFB && firstItem.facebookUrl;

                      return (
                        <tr key={groupKey} className="hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{firstItem.venueName}</div>
                            {firstItem.venueResolution.enrichments?.address && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {firstItem.venueResolution.enrichments.address}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                              isMatch ? 'bg-green-100 text-green-800' :
                              isCreate ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {isMatch ? 'Match' : isCreate ? 'New' : 'Review'}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">
                              {Math.round(firstItem.venueResolution.confidence * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {firstItem.venueResolution.reasons.slice(0, 2).join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {willEnrichFB ? (
                              <div className="flex items-center gap-1 text-green-600">
                                <CheckCircle className="h-3 w-3" />
                                <span className="text-xs">Will add</span>
                              </div>
                            ) : hasExistingFB ? (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <CheckCircle className="h-3 w-3" />
                                <span className="text-xs">Has URL</span>
                              </div>
                            ) : firstItem.facebookUrl ? (
                              <a
                                href={firstItem.facebookUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Facebook className="h-3 w-3" />
                                Event
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {firstItem.venueResolution.enrichments?.website ? (
                              <a
                                href={firstItem.venueResolution.enrichments.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Globe className="h-3 w-3" />
                                Link
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium">{items.length}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  items.forEach(item => handleRejectQueueItem(item.queue_id));
                                }}
                                disabled={processingQueue !== null}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  handleApproveQueueItem(firstItem.queue_id);
                                }}
                                disabled={processingQueue !== null}
                              >
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* PHASE 2: ARTISTS TAB */}
          <TabsContent value="artists" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Process Unique Artists</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {uniqueArtistGroups.length} unique artists found. Complete venue processing first.
              </p>
              <div className="space-y-4">
                {uniqueArtistGroups.map(groupKey => {
                  const items = groupedArtists[groupKey];
                  const firstItem = items[0];
                  return (
                    <div key={groupKey} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-lg">{firstItem.artistName}</h4>
                          <div className="text-sm text-muted-foreground mt-1">
                            Appears in {items.length} event{items.length > 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className={`px-3 py-1 rounded text-xs font-medium ${
                          firstItem.artistResolution.action === 'MATCH_EXISTING' ? 'bg-green-100 text-green-800' :
                          firstItem.artistResolution.action === 'CREATE_NEW' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {firstItem.artistResolution.action}
                        </div>
                      </div>

                      <div className="space-y-2 text-sm mb-4">
                        <div>
                          <span className="text-muted-foreground">Confidence: </span>
                          <span className="font-medium">{Math.round(firstItem.artistResolution.confidence * 100)}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reasons: </span>
                          <span className="font-medium">{firstItem.artistResolution.reasons.join(', ')}</span>
                        </div>
                        {firstItem.artistResolution.artist_id && (
                          <div>
                            <span className="text-muted-foreground">Matched ID: </span>
                            <span className="font-mono text-xs">{firstItem.artistResolution.artist_id.substring(0, 8)}...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            items.forEach(item => handleRejectQueueItem(item.queue_id));
                          }}
                          disabled={processingQueue !== null}
                        >
                          <X className="h-3 w-3 mr-2" />
                          Dismiss All ({items.length})
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            handleApproveQueueItem(firstItem.queue_id);
                          }}
                          disabled={processingQueue !== null}
                        >
                          <CheckCircle className="h-3 w-3 mr-2" />
                          Approve Artist
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* PHASE 3: EVENTS TAB */}
          <TabsContent value="events" className="mt-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Review Individual Events</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {queueItems.length} events ready for review. Complete venues and artists first.
              </p>
              <div className="space-y-4">
                {queueItems.map(item => (
                  <Card key={item.queue_id} className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Extracted Data */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Extracted Event</h3>
                        <div className="space-y-2">
                          <div>
                            <div className="text-sm text-muted-foreground">Artist</div>
                            <div className="font-medium">{item.artistName}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Venue</div>
                            <div className="font-medium">{item.venueName}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Date</div>
                              <div className="font-medium">{item.date}</div>
                            </div>
                            {item.time && (
                              <div>
                                <div className="text-sm text-muted-foreground">Time</div>
                                <div className="font-medium">{item.time}</div>
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <div>
                              <div className="text-sm text-muted-foreground">Notes</div>
                              <div className="text-sm">{item.notes}</div>
                            </div>
                          )}
                          {item.facebookUrl && (
                            <div>
                              <div className="text-sm text-muted-foreground">Facebook URL</div>
                              <a href={item.facebookUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                Event Link
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right Column - Resolution Details */}
                      <div className="space-y-4">
                        {/* Venue Resolution */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Venue Resolution</h4>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              item.venueResolution.action === 'MATCH_EXISTING' ? 'bg-green-100 text-green-800' :
                              item.venueResolution.action === 'CREATE_NEW' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.venueResolution.action}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className="font-medium">{Math.round(item.venueResolution.confidence * 100)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reasons: </span>
                              <span className="font-medium">{item.venueResolution.reasons.join(', ')}</span>
                            </div>
                            {item.venueResolution.venue_id && (
                              <div>
                                <span className="text-muted-foreground">Matched Venue ID: </span>
                                <span className="font-mono text-xs">{item.venueResolution.venue_id}</span>
                              </div>
                            )}
                            {item.venueResolution.enrichments && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-muted-foreground mb-1">Enrichments:</div>
                                {item.venueResolution.enrichments.address && (
                                  <div className="text-xs">{item.venueResolution.enrichments.address}</div>
                                )}
                                {item.venueResolution.enrichments.website && (
                                  <a href={item.venueResolution.enrichments.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:text-blue-800">
                                    {item.venueResolution.enrichments.website}
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Artist Resolution */}
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold">Artist Resolution</h4>
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              item.artistResolution.action === 'MATCH_EXISTING' ? 'bg-green-100 text-green-800' :
                              item.artistResolution.action === 'CREATE_NEW' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.artistResolution.action}
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Confidence: </span>
                              <span className="font-medium">{Math.round(item.artistResolution.confidence * 100)}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reasons: </span>
                              <span className="font-medium">{item.artistResolution.reasons.join(', ')}</span>
                            </div>
                            {item.artistResolution.artist_id && (
                              <div>
                                <span className="text-muted-foreground">Matched Artist ID: </span>
                                <span className="font-mono text-xs">{item.artistResolution.artist_id}</span>
                              </div>
                            )}
                            {item.artistResolution.suggestion && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-muted-foreground mb-1">Suggestion:</div>
                                <div className="text-xs">{item.artistResolution.suggestion}</div>
                              </div>
                            )}
                            {item.artistResolution.candidates && item.artistResolution.candidates.length > 0 && (
                              <div className="mt-2 pt-2 border-t">
                                <div className="text-muted-foreground mb-1">Candidates:</div>
                                {item.artistResolution.candidates.slice(0, 3).map((candidate, idx) => (
                                  <div key={idx} className="text-xs py-1">
                                    {candidate.artist.name} ({Math.round(candidate.score * 100)}%) - {candidate.reasons.join(', ')}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 mt-6 pt-6 border-t">
                      <Button
                        variant="outline"
                        onClick={() => handleRejectQueueItem(item.queue_id)}
                        disabled={processingQueue === item.queue_id}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        variant="default"
                        onClick={() => handleApproveQueueItem(item.queue_id)}
                        disabled={processingQueue === item.queue_id}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve & Create Event
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog />
    </div>
  );
}
