import { FALLBACK_ARTIST_TAXONOMY } from '@/lib/artist-taxonomy';

/**
 * Stable storage contracts. UI option lists come from the Artists API at
 * runtime; these unions describe the canonical machine values persisted by the
 * backend and used by existing TypeScript call sites.
 */
export type ArtistType = 'band' | 'solo' | 'duo' | 'trio' | 'group' | 'dj' | 'collective';
export type ActType = 'originals' | 'covers' | 'tribute';

/** @deprecated Prefer useArtistTaxonomy().artistTypes in UI code. */
export const ARTIST_TYPES = FALLBACK_ARTIST_TAXONOMY.artistTypes as ReadonlyArray<{ value: ArtistType; label: string }>;

/** @deprecated Prefer useArtistTaxonomy().actTypes in UI code. */
export const ACT_TYPES = FALLBACK_ARTIST_TAXONOMY.actTypes as ReadonlyArray<{ value: ActType; label: string }>;
