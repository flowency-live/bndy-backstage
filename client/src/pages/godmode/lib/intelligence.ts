import type { Artist, Event as BndyEvent, User, Venue } from '@/lib/services/godmode-service';

type UnknownRecord = Record<string, any>;

export interface TrendPoint {
  date: string;
  artists: number;
  venues: number;
  users: number;
}

export interface ActivityPoint {
  date: string;
  gigs: number;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  gigs: number;
}

export interface DistributionPoint {
  band: string;
  count: number;
}

export interface GeographyPoint {
  area: string;
  latitude: number;
  longitude: number;
  gigs: number;
  venues: number;
  artists: number;
}

export interface SourcePoint {
  source: string;
  count: number;
}

export interface HealthMeasure {
  completeness: number;
  freshness: number;
  confidence: number;
  gaps: Array<{ label: string; count: number }>;
}

export interface GodmodeIntelligence {
  generatedAt: string;
  today: string;
  headline: {
    artists: { total: number; month: number; week: number };
    venues: { total: number; month: number; week: number };
    users: { total: number; month: number; week: number };
    gigsMonth: { total: number; changePct: number | null };
    gigsTonight: number;
    activeAreas: number;
  };
  tonight: { gigs: number; venues: number; artists: number; areas: number; busiestArea?: string };
  discovery: { today: number; week: number; month: number };
  growth: { granularity: 'day' | 'week' | 'month'; points: TrendPoint[] };
  gigActivity: {
    daily90: ActivityPoint[];
    monthly12: MonthlyPoint[];
    dayOfWeek: Array<{ day: string; gigs: number }>;
  };
  artists: {
    averageGigs: number;
    medianActiveGigs: number;
    active: number;
    withFutureGig: number;
    distribution: DistributionPoint[];
  };
  venues: {
    averageGigs: number;
    medianActiveGigs: number;
    active: number;
    withFutureGig: number;
    distribution: DistributionPoint[];
  };
  network: {
    relationships: number;
    repeatRelationships: number;
    newRelationshipsMonth: number;
    avgVenuesPerArtist: number;
    avgArtistsPerVenue: number;
  };
  geography: GeographyPoint[];
  sources: SourcePoint[];
  health: { artists: HealthMeasure; venues: HealthMeasure };
}

const DAY_MS = 86_400_000;

function raw(value: unknown): UnknownRecord {
  return value as UnknownRecord;
}

function liveRecord(value: unknown): boolean {
  const scopes = raw(value)?.publicationScopes;
  return !Array.isArray(scopes) || scopes.length === 0 || scopes.includes('live');
}

function visibleRecord(value: unknown): boolean {
  return raw(value)?.hidden !== true && liveRecord(value);
}

function dateOnly(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function recordCreated(value: unknown): string | null {
  const item = raw(value);
  return dateOnly(item.createdAt ?? item.created_at ?? item.created);
}

function recordUpdated(value: unknown): string | null {
  const item = raw(value);
  return dateOnly(
    item.updatedAt ?? item.updated_at ?? item.enrichmentDate ?? item.enrichment_date ?? item.createdAt ?? item.created_at,
  );
}

function ukDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}`;
}

function utcDate(value: string): Date {
  return new Date(`${value}T12:00:00Z`);
}

function addDays(value: string, amount: number): string {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function monthStart(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

function shiftMonth(value: string, amount: number): string {
  const date = new Date(`${value.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}

function endOfMonth(value: string): string {
  return addDays(shiftMonth(value, 1), -1);
}

function inRange(value: string | null, start: string, end: string): boolean {
  return Boolean(value && value >= start && value <= end);
}

function createdSince<T>(items: T[], start: string, end: string): number {
  return items.filter((item) => inRange(recordCreated(item), start, end)).length;
}

function round(value: number, digits = 0): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function percentage(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return round(((current - previous) / previous) * 100, 1);
}

function rangeDays(start: string, end: string, step = 1): string[] {
  const result: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, step)) result.push(cursor);
  if (result[result.length - 1] !== end) result.push(end);
  return result;
}

function isGig(event: BndyEvent): boolean {
  const item = raw(event);
  if (!visibleRecord(event) || item.isPublic === false) return false;
  const type = item.type ?? item.eventType ?? item.event_type;
  return type === 'gig' || (!type && item.isPublic === true);
}

function eventDate(event: BndyEvent): string | null {
  return dateOnly(raw(event).date);
}

function eventArtistIds(event: BndyEvent): string[] {
  const item = raw(event);
  const values = [
    item.artistId,
    ...(Array.isArray(item.artistIds) ? item.artistIds : []),
    ...(Array.isArray(item.collaboratingArtistIds) ? item.collaboratingArtistIds : []),
  ].filter((value): value is string => typeof value === 'string' && value.length > 0);
  return [...new Set(values)];
}

function eventVenueId(event: BndyEvent): string | null {
  const value = raw(event).venueId;
  return typeof value === 'string' && value ? value : null;
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function distribution(counts: number[]): DistributionPoint[] {
  const buckets = [
    { band: '0 gigs', test: (value: number) => value === 0 },
    { band: '1 gig', test: (value: number) => value === 1 },
    { band: '2–3', test: (value: number) => value >= 2 && value <= 3 },
    { band: '4–6', test: (value: number) => value >= 4 && value <= 6 },
    { band: '7+', test: (value: number) => value >= 7 },
  ];
  return buckets.map((bucket) => ({ band: bucket.band, count: counts.filter(bucket.test).length }));
}

function sourceName(event: BndyEvent): string {
  const item = raw(event);
  const value = item.sourceName ?? item.sourceId ?? item.ingestionSource ?? item.source ?? item.createdBySource;
  if (typeof value !== 'string' || !value.trim()) return 'Unknown';
  return value.trim();
}

function hasArtistSocial(artist: Artist): boolean {
  const item = raw(artist);
  return Boolean(
    item.facebookUrl || item.instagramUrl || item.websiteUrl || item.youtubeUrl || item.spotifyUrl ||
      (Array.isArray(item.socialMediaUrls) && item.socialMediaUrls.length > 0),
  );
}

function hasVenueSocial(venue: Venue): boolean {
  const item = raw(venue);
  return Boolean(
    item.facebookUrl || item.instagramUrl || item.website ||
      (Array.isArray(item.socialMediaUrls) && item.socialMediaUrls.length > 0),
  );
}

function healthForArtists(artists: Artist[], today: string): HealthMeasure {
  if (!artists.length) return { completeness: 0, freshness: 0, confidence: 0, gaps: [] };
  const freshAfter = addDays(today, -180);
  const fields = artists.flatMap((artist) => [
    Boolean(artist.location),
    Array.isArray(artist.genres) && artist.genres.length > 0,
    hasArtistSocial(artist),
    Boolean(artist.artistType ?? raw(artist).artist_type),
  ]);
  return {
    completeness: percentage(fields.filter(Boolean).length, fields.length),
    freshness: percentage(artists.filter((artist) => (recordUpdated(artist) ?? '') >= freshAfter).length, artists.length),
    confidence: percentage(
      artists.filter((artist) => raw(artist).needs_review !== true && raw(artist).enrichmentStatus !== 'needs_review').length,
      artists.length,
    ),
    gaps: [
      { label: 'No location', count: artists.filter((artist) => !artist.location).length },
      { label: 'No genres', count: artists.filter((artist) => !artist.genres?.length).length },
      { label: 'No socials', count: artists.filter((artist) => !hasArtistSocial(artist)).length },
      { label: 'Needs review', count: artists.filter((artist) => raw(artist).needs_review === true).length },
    ],
  };
}

function healthForVenues(venues: Venue[], today: string): HealthMeasure {
  if (!venues.length) return { completeness: 0, freshness: 0, confidence: 0, gaps: [] };
  const freshAfter = addDays(today, -180);
  const fields = venues.flatMap((venue) => [
    Boolean(venue.googlePlaceId),
    hasVenueSocial(venue),
    Number.isFinite(Number(venue.latitude)) && Number.isFinite(Number(venue.longitude)),
    Boolean(venue.postcode),
  ]);
  return {
    completeness: percentage(fields.filter(Boolean).length, fields.length),
    freshness: percentage(venues.filter((venue) => (recordUpdated(venue) ?? '') >= freshAfter).length, venues.length),
    confidence: percentage(
      venues.filter((venue) => raw(venue).validated === true || ['high_confidence', 'reviewed'].includes(raw(venue).enrichment_status)).length,
      venues.length,
    ),
    gaps: [
      { label: 'No Place ID', count: venues.filter((venue) => !venue.googlePlaceId).length },
      { label: 'No socials', count: venues.filter((venue) => !hasVenueSocial(venue)).length },
      { label: 'No postcode', count: venues.filter((venue) => !venue.postcode).length },
      { label: 'Not validated', count: venues.filter((venue) => raw(venue).validated !== true).length },
    ],
  };
}

function growthSeries(artists: Artist[], venues: Venue[], users: User[], today: string): GodmodeIntelligence['growth'] {
  const dates = [...artists, ...venues, ...users].map(recordCreated).filter((value): value is string => Boolean(value));
  const earliest = dates.sort()[0] ?? today;
  const span = Math.max(0, Math.round((utcDate(today).getTime() - utcDate(earliest).getTime()) / DAY_MS));
  const step = span > 1095 ? 30 : span > 540 ? 7 : 1;
  const granularity = step === 30 ? 'month' : step === 7 ? 'week' : 'day';

  const artistDates = artists.map(recordCreated).filter((value): value is string => Boolean(value)).sort();
  const venueDates = venues.map(recordCreated).filter((value): value is string => Boolean(value)).sort();
  const userDates = users.map(recordCreated).filter((value): value is string => Boolean(value)).sort();
  const countThrough = (values: string[], date: string) => {
    let low = 0;
    let high = values.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (values[mid] <= date) low = mid + 1;
      else high = mid;
    }
    return low;
  };

  return {
    granularity,
    points: rangeDays(earliest, today, step).map((date) => ({
      date,
      artists: countThrough(artistDates, date),
      venues: countThrough(venueDates, date),
      users: countThrough(userDates, date),
    })),
  };
}

function venueArea(venue: Venue): string {
  const item = raw(venue);
  const named = item.city ?? item.town ?? item.locality;
  if (typeof named === 'string' && named.trim()) return named.trim();
  const postcode = typeof venue.postcode === 'string' ? venue.postcode.trim().toUpperCase() : '';
  const match = postcode.match(/^[A-Z]{1,2}/);
  return match?.[0] ?? 'Unknown';
}

function venueCoordinates(venue: Venue): { lat: number; lng: number } | null {
  const item = raw(venue);
  const lat = Number(item.latitude ?? item.location?.lat);
  const lng = Number(item.longitude ?? item.location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export function buildGodmodeIntelligence(
  artistsInput: Artist[],
  venuesInput: Venue[],
  eventsInput: BndyEvent[],
  usersInput: User[],
  now = new Date(),
): GodmodeIntelligence {
  const today = ukDateString(now);
  const month = monthStart(today);
  const monthEnd = endOfMonth(today);
  const previousMonth = shiftMonth(month, -1);
  const previousMonthEnd = addDays(month, -1);
  const weekStart = addDays(today, -6);
  const rolling28Start = addDays(today, -27);
  const rolling365Start = addDays(today, -364);

  const artists = artistsInput.filter(visibleRecord);
  const venues = venuesInput.filter(visibleRecord);
  const users = usersInput;
  const gigs = eventsInput.filter(isGig).filter((event) => Boolean(eventDate(event)));

  const gigsMonth = gigs.filter((event) => inRange(eventDate(event), month, monthEnd));
  const gigsPreviousMonth = gigs.filter((event) => inRange(eventDate(event), previousMonth, previousMonthEnd));
  const gigsTonight = gigs.filter((event) => eventDate(event) === today);
  const rolling28 = gigs.filter((event) => inRange(eventDate(event), rolling28Start, today));
  const futureGigs = gigs.filter((event) => (eventDate(event) ?? '') >= today);

  const venueById = new Map(venues.map((venue) => [venue.id, venue]));

  const currentAreas = new Map<string, { venueIds: Set<string>; artistIds: Set<string>; gigs: number; latTotal: number; lngTotal: number; coordCount: number }>();
  for (const event of gigsMonth) {
    const venueId = eventVenueId(event);
    if (!venueId) continue;
    const venue = venueById.get(venueId);
    if (!venue) continue;
    const area = venueArea(venue);
    const state = currentAreas.get(area) ?? { venueIds: new Set(), artistIds: new Set(), gigs: 0, latTotal: 0, lngTotal: 0, coordCount: 0 };
    state.gigs += 1;
    state.venueIds.add(venueId);
    eventArtistIds(event).forEach((id) => state.artistIds.add(id));
    const coords = venueCoordinates(venue);
    if (coords) {
      state.latTotal += coords.lat;
      state.lngTotal += coords.lng;
      state.coordCount += 1;
    }
    currentAreas.set(area, state);
  }

  const geography = Array.from(currentAreas.entries())
    .filter(([, state]) => state.coordCount > 0)
    .map(([area, state]) => ({
      area,
      latitude: state.latTotal / state.coordCount,
      longitude: state.lngTotal / state.coordCount,
      gigs: state.gigs,
      venues: state.venueIds.size,
      artists: state.artistIds.size,
    }))
    .sort((a, b) => b.gigs - a.gigs)
    .slice(0, 40);

  const tonightVenueIds = new Set(gigsTonight.map(eventVenueId).filter((value): value is string => Boolean(value)));
  const tonightArtistIds = new Set(gigsTonight.flatMap(eventArtistIds));
  const tonightAreas = new Map<string, number>();
  for (const venueId of tonightVenueIds) {
    const venue = venueById.get(venueId);
    if (!venue) continue;
    const area = venueArea(venue);
    tonightAreas.set(area, (tonightAreas.get(area) ?? 0) + gigsTonight.filter((event) => eventVenueId(event) === venueId).length);
  }
  const busiestArea = Array.from(tonightAreas.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];

  const artistRollingCounts = new Map<string, number>();
  const venueRollingCounts = new Map<string, number>();
  for (const event of rolling28) {
    eventArtistIds(event).forEach((id) => artistRollingCounts.set(id, (artistRollingCounts.get(id) ?? 0) + 1));
    const venueId = eventVenueId(event);
    if (venueId) venueRollingCounts.set(venueId, (venueRollingCounts.get(venueId) ?? 0) + 1);
  }
  const artistCounts = artists.map((artist) => artistRollingCounts.get(artist.id) ?? 0);
  const venueCounts = venues.map((venue) => venueRollingCounts.get(venue.id) ?? 0);
  const futureArtistIds = new Set(futureGigs.flatMap(eventArtistIds));
  const futureVenueIds = new Set(futureGigs.map(eventVenueId).filter((value): value is string => Boolean(value)));

  const relationships = new Map<string, { count: number; firstDate: string }>();
  for (const event of gigs) {
    const venueId = eventVenueId(event);
    const date = eventDate(event);
    if (!venueId || !date) continue;
    for (const artistId of eventArtistIds(event)) {
      const key = `${artistId}|${venueId}`;
      const existing = relationships.get(key);
      relationships.set(key, existing ? { count: existing.count + 1, firstDate: existing.firstDate < date ? existing.firstDate : date } : { count: 1, firstDate: date });
    }
  }
  const artistVenues = new Map<string, Set<string>>();
  const venueArtists = new Map<string, Set<string>>();
  for (const key of relationships.keys()) {
    const [artistId, venueId] = key.split('|');
    const venuesForArtist = artistVenues.get(artistId) ?? new Set<string>();
    venuesForArtist.add(venueId);
    artistVenues.set(artistId, venuesForArtist);
    const artistsForVenue = venueArtists.get(venueId) ?? new Set<string>();
    artistsForVenue.add(artistId);
    venueArtists.set(venueId, artistsForVenue);
  }

  const addedToday = gigs.filter((event) => recordCreated(event) === today).length;
  const addedWeek = gigs.filter((event) => inRange(recordCreated(event), weekStart, today)).length;
  const addedMonth = gigs.filter((event) => inRange(recordCreated(event), month, today)).length;
  const sourceCounts = new Map<string, number>();
  for (const event of gigs.filter((item) => inRange(recordCreated(item), addDays(today, -29), today))) {
    const source = sourceName(event);
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  const daily90Start = addDays(today, -89);
  const dailyCounts = new Map<string, number>();
  for (const event of gigs.filter((item) => inRange(eventDate(item), daily90Start, today))) {
    const date = eventDate(event)!;
    dailyCounts.set(date, (dailyCounts.get(date) ?? 0) + 1);
  }

  const monthlyKeys = Array.from({ length: 12 }, (_, index) => shiftMonth(month, index - 11).slice(0, 7));
  const monthlyCounts = new Map(monthlyKeys.map((key) => [key, 0]));
  for (const event of gigs) {
    const date = eventDate(event);
    const key = date?.slice(0, 7);
    if (key && monthlyCounts.has(key)) monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + 1);
  }

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dow = new Map(days.map((day) => [day, 0]));
  for (const event of gigs.filter((item) => inRange(eventDate(item), rolling365Start, today))) {
    const date = eventDate(event)!;
    const jsDay = utcDate(date).getUTCDay();
    const label = days[(jsDay + 6) % 7];
    dow.set(label, (dow.get(label) ?? 0) + 1);
  }

  return {
    generatedAt: now.toISOString(),
    today,
    headline: {
      artists: { total: artists.length, month: createdSince(artists, month, today), week: createdSince(artists, weekStart, today) },
      venues: { total: venues.length, month: createdSince(venues, month, today), week: createdSince(venues, weekStart, today) },
      users: { total: users.length, month: createdSince(users, month, today), week: createdSince(users, weekStart, today) },
      gigsMonth: { total: gigsMonth.length, changePct: pctChange(gigsMonth.length, gigsPreviousMonth.length) },
      gigsTonight: gigsTonight.length,
      activeAreas: currentAreas.size,
    },
    tonight: {
      gigs: gigsTonight.length,
      venues: tonightVenueIds.size,
      artists: tonightArtistIds.size,
      areas: tonightAreas.size,
      busiestArea,
    },
    discovery: { today: addedToday, week: addedWeek, month: addedMonth },
    growth: growthSeries(artists, venues, users, today),
    gigActivity: {
      daily90: rangeDays(daily90Start, today).map((date) => ({ date, gigs: dailyCounts.get(date) ?? 0 })),
      monthly12: monthlyKeys.map((key) => ({
        month: key,
        label: new Intl.DateTimeFormat('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(new Date(`${key}-01T12:00:00Z`)),
        gigs: monthlyCounts.get(key) ?? 0,
      })),
      dayOfWeek: days.map((day) => ({ day, gigs: dow.get(day) ?? 0 })),
    },
    artists: {
      averageGigs: round(rolling28.length / Math.max(artists.length, 1), 1),
      medianActiveGigs: round(median(Array.from(artistRollingCounts.values())), 1),
      active: artistRollingCounts.size,
      withFutureGig: futureArtistIds.size,
      distribution: distribution(artistCounts),
    },
    venues: {
      averageGigs: round(rolling28.length / Math.max(venues.length, 1), 1),
      medianActiveGigs: round(median(Array.from(venueRollingCounts.values())), 1),
      active: venueRollingCounts.size,
      withFutureGig: futureVenueIds.size,
      distribution: distribution(venueCounts),
    },
    network: {
      relationships: relationships.size,
      repeatRelationships: Array.from(relationships.values()).filter((value) => value.count > 1).length,
      newRelationshipsMonth: Array.from(relationships.values()).filter((value) => inRange(value.firstDate, month, monthEnd)).length,
      avgVenuesPerArtist: round(Array.from(artistVenues.values()).reduce((sum, set) => sum + set.size, 0) / Math.max(artists.length, 1), 1),
      avgArtistsPerVenue: round(Array.from(venueArtists.values()).reduce((sum, set) => sum + set.size, 0) / Math.max(venues.length, 1), 1),
    },
    geography,
    sources: Array.from(sourceCounts.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    health: { artists: healthForArtists(artists, today), venues: healthForVenues(venues, today) },
  };
}
