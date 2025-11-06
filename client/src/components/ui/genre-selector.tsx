import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { GENRE_CATEGORIES, type Genre } from '@/lib/constants/genres';

interface GenreSelectorProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  className?: string;
}

export function GenreSelector({ selectedGenres, onChange, className = '' }: GenreSelectorProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryName: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryName)) {
      newExpanded.delete(categoryName);
    } else {
      newExpanded.add(categoryName);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleGenre = (genre: Genre) => {
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
      {/* Selected Genres Display */}
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

      {/* Category Browser */}
      <div className="border rounded-md divide-y max-h-96 overflow-y-auto">
        {GENRE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const categoryGenreCount = category.genres.filter(g => selectedGenres.includes(g)).length;

          return (
            <div key={category.name}>
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-accent transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{category.name}</span>
                  {categoryGenreCount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {categoryGenreCount}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {category.genres.length} {category.genres.length === 1 ? 'genre' : 'genres'}
                </span>
              </button>

              {/* Category Genres */}
              {isExpanded && (
                <div className="px-3 py-2 bg-muted/30 flex flex-wrap gap-2">
                  {category.genres.map((genre) => {
                    const isSelected = selectedGenres.includes(genre);
                    return (
                      <Badge
                        key={genre}
                        variant={isSelected ? 'default' : 'outline'}
                        className="cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => toggleGenre(genre)}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {genre}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="flex justify-between items-center mt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            if (expandedCategories.size === GENRE_CATEGORIES.length) {
              setExpandedCategories(new Set());
            } else {
              setExpandedCategories(new Set(GENRE_CATEGORIES.map(c => c.name)));
            }
          }}
        >
          {expandedCategories.size === GENRE_CATEGORIES.length ? 'Collapse All' : 'Expand All'}
        </Button>
        {selectedGenres.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange([])}
          >
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}
