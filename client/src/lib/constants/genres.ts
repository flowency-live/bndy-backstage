// Shared genre constants for BNDY platform
// Used across backstage and frontstage applications
// DO NOT duplicate this list - import from here

export const GENRES = [
  // Core Rock Genres
  'Rock',
  'Rock n Roll',
  'Hard Rock',
  'Soft Rock',
  'Classic Rock',
  'Grunge',
  'Psychedelic Rock',

  // Metal
  'Metal',
  'Heavy Metal',

  // Pop & Indie
  'Pop',
  'Indie',
  'Britpop',
  'Alternative',
  'Pop Punk',

  // Punk
  'Punk',

  // Blues & Country
  'Blues',
  'Country',
  'Americana',

  // Folk & Acoustic
  'Folk',
  'Acoustic',

  // Soul, R&B, Funk
  'Soul',
  'R&B',
  'Funk',
  'Motown',

  // Electronic & Dance
  'Electronic',
  'Dance',
  '90s Dance',

  // Hip Hop & Rap
  'Hip Hop',

  // Jazz & Classical
  'Jazz',
  'Classical',

  // World & Latin
  'Reggae',
  'Latin',

  // Other
  'Covers',
  'Tribute',
  'Disco',
  'Other',
] as const;

export type Genre = typeof GENRES[number];

// Genre categories for organized display
export interface GenreCategory {
  name: string;
  genres: readonly Genre[];
}

export const GENRE_CATEGORIES: readonly GenreCategory[] = [
  {
    name: 'Rock',
    genres: ['Rock', 'Rock n Roll', 'Hard Rock', 'Soft Rock', 'Classic Rock', 'Grunge', 'Psychedelic Rock']
  },
  {
    name: 'Metal',
    genres: ['Metal', 'Heavy Metal']
  },
  {
    name: 'Pop & Indie',
    genres: ['Pop', 'Indie', 'Britpop', 'Alternative', 'Pop Punk']
  },
  {
    name: 'Punk',
    genres: ['Punk']
  },
  {
    name: 'Blues & Country',
    genres: ['Blues', 'Country', 'Americana']
  },
  {
    name: 'Folk & Acoustic',
    genres: ['Folk', 'Acoustic']
  },
  {
    name: 'Soul, R&B & Funk',
    genres: ['Soul', 'R&B', 'Motown', 'Funk']
  },
  {
    name: 'Electronic & Dance',
    genres: ['Electronic', 'Dance', '90s Dance']
  },
  {
    name: 'Hip Hop',
    genres: ['Hip Hop']
  },
  {
    name: 'Jazz & Classical',
    genres: ['Jazz', 'Classical']
  },
  {
    name: 'World & Latin',
    genres: ['Reggae', 'Latin']
  },
  {
    name: 'Other',
    genres: ['Covers', 'Tribute', 'Disco', 'Other']
  }
] as const;

// Helper function to validate genre
export function isValidGenre(genre: string): genre is Genre {
  return GENRES.includes(genre as Genre);
}

// Helper to get genre display name (for any custom formatting in future)
export function getGenreDisplayName(genre: Genre): string {
  return genre;
}
