// Shared genre constants for BNDY platform
// Simplified flat list (25 genres) - Updated 2025-11-18
// Used across backstage and frontstage applications
// DO NOT duplicate this list - import from here

export const GENRES = [
  // Rock & Alternative
  'Rock',
  'Rock n Roll',
  'Grunge',
  'Metal',
  'Punk',
  'Alternative',
  'New Wave',

  // Pop & Indie
  'Pop',
  'Indie',
  'Britpop',

  // Blues & Country
  'Blues',
  'R&B',
  'Country',
  'Americana',

  // Folk & Soul
  'Folk',
  'Soul',
  'Funk',
  'Motown',

  // Electronic & Dance
  'Electronic',
  'Dance',

  // Other Genres
  'Jazz',
  'Classical',
  'Reggae',
  'Latin',

  // Catchall
  'Other'
] as const;

export type Genre = typeof GENRES[number];

// Helper function to validate genre
export function isValidGenre(genre: string): genre is Genre {
  return GENRES.includes(genre as Genre);
}

// Helper to get genre display name (for any custom formatting in future)
export function getGenreDisplayName(genre: Genre): string {
  return genre;
}
