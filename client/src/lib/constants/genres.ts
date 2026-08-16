import { FALLBACK_ARTIST_TAXONOMY } from '@/lib/artist-taxonomy';

/**
 * @deprecated Runtime UI should use useArtistTaxonomy().genres.
 * Kept as a compatibility export for any older code not yet migrated; it is
 * derived from the single Backstage resilience snapshot rather than carrying
 * another independently maintained genre list.
 */
export const GENRES = FALLBACK_ARTIST_TAXONOMY.genres;

export type Genre = string;
