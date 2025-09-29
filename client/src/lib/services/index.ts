// src/lib/services/index.ts - Service layer exports
export { authService } from './auth-service';
export { bandsService } from './bands-service';
export { spotifyService } from './spotify-service';

export type {
  User,
  Band as AuthBand,
  AuthSession,
  AuthResponse,
} from './auth-service';

export type {
  Band,
  BandMember,
  BandEvent,
  Song,
} from './bands-service';

export type {
  SpotifyUser,
  SpotifyPlaylist,
  SpotifyTrack,
  SpotifySearchResult,
} from './spotify-service';