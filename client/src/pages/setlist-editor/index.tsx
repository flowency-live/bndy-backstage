/**
 * SetlistEditor - Entry point wrapper that provides context and route params
 */

import { useRoute } from 'wouter';
import type { ArtistMembership, Artist } from '@/types/api';
import { SetlistEditorProvider } from './context/SetlistEditorContext';
import { SetlistEditorCore } from './SetlistEditorCore';

export interface SetlistEditorProps {
  artistId: string;
  setlistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function SetlistEditor({ artistId, setlistId, membership }: SetlistEditorProps) {
  return (
    <SetlistEditorProvider>
      <SetlistEditorCore artistId={artistId} setlistId={setlistId} />
    </SetlistEditorProvider>
  );
}
