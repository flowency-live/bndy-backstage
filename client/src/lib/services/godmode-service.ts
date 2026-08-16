import legacyGodmodeService, { type Artist } from './godmode-service-legacy';
import { canonicalActTypes, canonicalArtistType } from '@/lib/artist-taxonomy';

/**
 * Godmode service boundary.
 *
 * The historical service is preserved byte-for-byte in godmode-service-legacy.
 * This wrapper canonicalises Artist classification on every Artist-returning
 * read/write while delegating every non-Artist operation unchanged.
 */

export * from './godmode-service-legacy';

function normaliseArtist(artist: Artist): Artist {
  const legacyActs = canonicalActTypes(artist.actType);
  return {
    ...artist,
    artistType: canonicalArtistType(artist.artistType) ?? artist.artistType,
    actType: legacyActs.actTypes,
    acoustic: artist.acoustic === true || legacyActs.acousticFromLegacy,
  };
}

const artistOverrides: Record<string, (...args: any[]) => Promise<any>> = {
  async getAllArtists() {
    return (await legacyGodmodeService.getAllArtists()).map(normaliseArtist);
  },

  async getArtistById(artistId: string) {
    const artist = await legacyGodmodeService.getArtistById(artistId);
    return artist ? normaliseArtist(artist) : null;
  },

  async createArtist(artistData: any) {
    return normaliseArtist(await legacyGodmodeService.createArtist(artistData));
  },

  async updateArtist(artistId: string, artistData: any) {
    return normaliseArtist(await legacyGodmodeService.updateArtist(artistId, artistData));
  },

  async markArtistAsReviewed(artistId: string) {
    return normaliseArtist(await legacyGodmodeService.markArtistAsReviewed(artistId));
  },

  async acceptArtistEnrichment(artistId: string, fields?: string[]) {
    return normaliseArtist(await legacyGodmodeService.acceptArtistEnrichment(artistId, fields));
  },

  async rejectArtistEnrichment(artistId: string) {
    return normaliseArtist(await legacyGodmodeService.rejectArtistEnrichment(artistId));
  },
};

export const godmodeService = new Proxy(legacyGodmodeService, {
  get(target, prop, receiver) {
    if (typeof prop === 'string' && artistOverrides[prop]) return artistOverrides[prop];
    const value = Reflect.get(target, prop, receiver);
    return typeof value === 'function' ? value.bind(target) : value;
  },
}) as typeof legacyGodmodeService;

export default godmodeService;

// Explicit artist exports override the star re-exports above. Existing callers
// therefore get canonical Artist objects without needing any screen-level fix.
export const getAllArtists = () => godmodeService.getAllArtists();
export const getArtistById = (artistId: string) => godmodeService.getArtistById(artistId);
export const createArtist = (artistData: Parameters<typeof legacyGodmodeService.createArtist>[0]) => godmodeService.createArtist(artistData);
export const updateArtist = (artistId: string, artistData: Parameters<typeof legacyGodmodeService.updateArtist>[1]) => godmodeService.updateArtist(artistId, artistData);
export const deleteArtist = (artistId: string, force?: boolean) => godmodeService.deleteArtist(artistId, force);
export const markArtistAsReviewed = (artistId: string) => godmodeService.markArtistAsReviewed(artistId);
export const acceptArtistEnrichment = (artistId: string, fields?: string[]) => godmodeService.acceptArtistEnrichment(artistId, fields);
export const rejectArtistEnrichment = (artistId: string) => godmodeService.rejectArtistEnrichment(artistId);
