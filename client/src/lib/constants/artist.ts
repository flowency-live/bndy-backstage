// Artist Type Constants
export const ARTIST_TYPES = [
  { value: 'band', label: 'Band' },
  { value: 'solo', label: 'Solo Act' },
  { value: 'duo', label: 'Duo' },
  { value: 'trio', label: 'Trio' },
  { value: 'group', label: 'Group' },
  { value: 'dj', label: 'DJ' },
  { value: 'collective', label: 'Collective' }
] as const;

export type ArtistType = typeof ARTIST_TYPES[number]['value'];

// Act Type Constants
export const ACT_TYPES = [
  { value: 'originals', label: 'Originals' },
  { value: 'covers', label: 'Covers' },
  { value: 'tribute', label: 'Tribute Act' }
] as const;

export type ActType = typeof ACT_TYPES[number]['value'];
