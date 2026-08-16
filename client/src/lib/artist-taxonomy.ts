import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '@/config/api';

export interface TaxonomyOption {
  value: string;
  label: string;
}

export interface PerformanceCapability extends TaxonomyOption {
  field: string;
  type: 'boolean';
}

export interface ArtistTaxonomy {
  version: string;
  genres: string[];
  artistTypes: TaxonomyOption[];
  actTypes: TaxonomyOption[];
  performanceCapabilities: PerformanceCapability[];
}

/**
 * Resilience snapshot only. The Artists API is authoritative; this exists so
 * profile administration is not unusable during a transient API/deploy
 * mismatch. Do not maintain a second product taxonomy here.
 */
export const FALLBACK_ARTIST_TAXONOMY: ArtistTaxonomy = {
  version: '2026-08-16-fallback',
  genres: [
    'Rock', 'Rock n Roll', 'Grunge', 'Metal', 'Punk', 'Alternative', 'New Wave',
    'Pop', 'Indie', 'Britpop', 'Mod',
    'Blues', 'R&B', 'Country', 'Americana',
    'Folk', 'Soul', 'Funk', 'Motown',
    'Electronic', 'Dance',
    'Jazz', 'Classical', 'Reggae', 'Latin',
    'Other',
  ],
  artistTypes: [
    { value: 'band', label: 'Band' },
    { value: 'solo', label: 'Solo Act' },
    { value: 'duo', label: 'Duo' },
    { value: 'trio', label: 'Trio' },
    { value: 'group', label: 'Group' },
    { value: 'dj', label: 'DJ' },
    { value: 'collective', label: 'Collective' },
  ],
  actTypes: [
    { value: 'originals', label: 'Originals' },
    { value: 'covers', label: 'Covers' },
    { value: 'tribute', label: 'Tribute Act' },
  ],
  performanceCapabilities: [
    { value: 'acoustic', label: 'Acoustic performances', field: 'acoustic', type: 'boolean' },
  ],
};

function isTaxonomy(value: unknown): value is ArtistTaxonomy {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ArtistTaxonomy>;
  return typeof candidate.version === 'string'
    && Array.isArray(candidate.genres)
    && Array.isArray(candidate.artistTypes)
    && Array.isArray(candidate.actTypes)
    && Array.isArray(candidate.performanceCapabilities);
}

export async function fetchArtistTaxonomy(): Promise<ArtistTaxonomy> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/artists/taxonomy`, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`taxonomy ${response.status}`);
    const body: unknown = await response.json();
    if (!isTaxonomy(body)) throw new Error('invalid taxonomy response');
    return body;
  } catch {
    return FALLBACK_ARTIST_TAXONOMY;
  }
}

export function useArtistTaxonomy() {
  const query = useQuery({
    queryKey: ['artist-taxonomy'],
    queryFn: fetchArtistTaxonomy,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  return { ...query, data: query.data ?? FALLBACK_ARTIST_TAXONOMY };
}

export function artistTypeLabel(value?: string | null, taxonomy: ArtistTaxonomy = FALLBACK_ARTIST_TAXONOMY): string | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  return taxonomy.artistTypes.find((option) => option.value.toLowerCase() === key || option.label.toLowerCase() === key)?.label ?? value;
}

export function canonicalArtistType(value?: string | null, taxonomy: ArtistTaxonomy = FALLBACK_ARTIST_TAXONOMY): string | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  return taxonomy.artistTypes.find((option) => option.value.toLowerCase() === key || option.label.toLowerCase() === key)?.value;
}

export function canonicalActTypes(
  values?: string[] | null,
  taxonomy: ArtistTaxonomy = FALLBACK_ARTIST_TAXONOMY,
): { actTypes: string[]; acousticFromLegacy: boolean } {
  const actTypes: string[] = [];
  let acousticFromLegacy = false;
  const seen = new Set<string>();

  for (const raw of values ?? []) {
    const key = String(raw).trim().toLowerCase();
    if (!key) continue;
    if (key === 'acoustic') {
      acousticFromLegacy = true;
      continue;
    }
    const option = taxonomy.actTypes.find((item) => item.value.toLowerCase() === key || item.label.toLowerCase() === key);
    if (option && !seen.has(option.value)) {
      seen.add(option.value);
      actTypes.push(option.value);
    }
  }

  return { actTypes, acousticFromLegacy };
}
