import { Button } from '@/components/ui/button';
import { Locate, Maximize2 } from 'lucide-react';

interface MapControlsProps {
  onLocateMe: () => void;
  onFitBounds: () => void;
  venueCount: number;
}

export default function MapControls({
  onLocateMe,
  onFitBounds,
  venueCount
}: MapControlsProps) {
  return (
    <div className="absolute top-4 right-4 z-[1000] space-y-2">
      <div className="bg-card rounded-lg shadow-lg p-2 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onLocateMe}
          className="w-full justify-start text-sm"
        >
          <Locate className="w-4 h-4 mr-2" />
          Locate Me
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFitBounds}
          className="w-full justify-start text-sm"
          disabled={venueCount === 0}
        >
          <Maximize2 className="w-4 h-4 mr-2" />
          Fit All
        </Button>
      </div>
    </div>
  );
}
