import type { ArtistMembership, Artist } from "@/types/api";

interface ArchivedTabProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

export default function ArchivedTab({ artistId, membership }: ArchivedTabProps) {
  return (
    <div className="text-center py-12">
      <i className="fas fa-archive text-4xl text-muted-foreground mb-4"></i>
      <h3 className="text-lg font-medium mb-2">Archived Tab</h3>
      <p className="text-muted-foreground">Parked and discarded songs will appear here</p>
    </div>
  );
}
