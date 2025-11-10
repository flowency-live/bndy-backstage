import { Label } from '@/components/ui/label';
import { GenreSelector } from '@/components/ui/genre-selector';

interface GenresSectionProps {
  genres: string[];
  onGenresChange: (genres: string[]) => void;
}

export default function GenresSection({ genres, onGenresChange }: GenresSectionProps) {
  return (
    <div>
      <Label className="text-card-foreground font-semibold mb-3 block">Genres</Label>
      <GenreSelector
        selectedGenres={genres}
        onChange={onGenresChange}
      />
    </div>
  );
}
