// Shared genre constants for BNDY platform
// CANONICAL copy - 36 genres (synced with bndy-serverless-api/artists-lambda/lib/genres.js)
// DO NOT modify without updating the backend genres.js
// Used across backstage and frontstage applications

export const GENRES = [
  // Rock & Alternative
  'Rock',
  'Rock n Roll',
  'Grunge',
  'Metal',
  'Punk',
  'Hardcore',
  'Alternative',
  'New Wave',

  // Pop & Indie
  'Pop',
  'Indie',
  'Britpop',
  'Mod',

  // Blues & Country
  'Blues',
  'R&B',
  'Country',
  'Americana',

  // Folk & Soul
  'Folk',
  'Irish',
  'Soul',
  'Funk',
  'Motown',
  'Disco',

  // Electronic & Dance
  'Electronic',
  'Dance',

  // Other Genres
  'Jazz',
  'Classical',
  'Reggae',
  'Ska',
  'Latin',

  // Era tags
  '50s',
  '60s',
  '70s',
  '80s',
  '90s',
  '00s',

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
