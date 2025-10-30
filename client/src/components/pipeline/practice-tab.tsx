import type { ArtistMembership, Artist } from "@/types/api";

interface PracticeTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function PracticeTab({ artistId, membership }: PracticeTabProps) {
  return (
    <div className="text-center py-12">
      <i className="fas fa-guitar text-4xl text-muted-foreground mb-4"></i>
      <h3 className="text-lg font-medium mb-2">Practice Tab</h3>
      <p className="text-muted-foreground">Coming soon...</p>
    </div>
  );
}
