import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useArtistTaxonomy } from '@/lib/artist-taxonomy';

interface GenreSelectorProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  className?: string;
}

export function GenreSelector({ selectedGenres, onChange, className = '' }: GenreSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: taxonomy } = useArtistTaxonomy();
  const genres = taxonomy.genres;

  const toggleGenre = (genre: string) => {
    const newGenres = selectedGenres.includes(genre)
      ? selectedGenres.filter(g => g !== genre)
      : [...selectedGenres, genre];
    onChange(newGenres);
  };

  const removeGenre = (genre: string) => {
    onChange(selectedGenres.filter(g => g !== genre));
  };

  return (
    <div className={className}>
      {/* Selected values are always shown, including legacy values already on
          an artist. Legacy values are preservable/removable but are no longer
          offered as choices for new classification. */}
      {selectedGenres.length > 0 && (
        <div className="mb-3">
          <div className="text-sm font-medium mb-2">Selected Genres ({selectedGenres.length})</div>
          <div className="flex flex-wrap gap-2">
            {selectedGenres.map((genre) => (
              <Badge
                key={genre}
                variant="default"
                className="cursor-pointer hover:bg-destructive transition-colors"
                onClick={() => removeGenre(genre)}
              >
                {genre}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full mb-2"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="h-4 w-4 mr-2" />
            Hide Genre Options
          </>
        ) : (
          <>
            <ChevronDown className="h-4 w-4 mr-2" />
            {selectedGenres.length > 0 ? 'Add More Genres' : 'Select Genres'}
          </>
        )}
      </Button>

      {isExpanded && (
        <div className="border rounded-md max-h-64 overflow-y-auto p-3 mb-3">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
            {genres.map((genre) => {
              const isSelected = selectedGenres.includes(genre);
              return (
                <Badge
                  key={genre}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer hover:scale-105 transition-transform justify-center py-2"
                  onClick={() => toggleGenre(genre)}
                >
                  {isSelected && <span className="mr-1">✓</span>}
                  {genre}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {selectedGenres.length > 0 && (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            Clear All
          </Button>
        </div>
      )}
    </div>
  );
}
