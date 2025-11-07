import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useEffect } from "react";
import type { Setlist } from "@/types/setlist";

interface SetlistPrintProps {
  artistId: string;
  setlistId: string;
}

export default function SetlistPrint({ artistId, setlistId }: SetlistPrintProps) {
  const [, setLocation] = useLocation();

  // Fetch setlist
  const { data: setlist, isLoading } = useQuery<Setlist>({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
    queryFn: async () => {
      const response = await fetch(
        `https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`,
        { credentials: "include" }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch setlist");
      }

      return response.json();
    },
  });

  // Auto-open print dialog when loaded
  useEffect(() => {
    if (setlist && !isLoading) {
      // Small delay to ensure rendering is complete
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [setlist, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <i className="fas fa-spinner fa-spin text-4xl text-orange-500"></i>
      </div>
    );
  }

  if (!setlist) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Setlist not found</p>
      </div>
    );
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print-page-break {
            page-break-after: always;
            break-after: page;
          }
          .no-print {
            display: none !important;
          }
          footer {
            display: none !important;
          }
        }
        @media screen {
          .print-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 1rem;
          }
        }
      `}</style>

      {/* Close button - only visible on screen */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={() => setLocation('/setlists')}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded shadow-lg"
        >
          <i className="fas fa-times mr-2"></i>
          Close
        </button>
      </div>

      <div className="print-container">
        {setlist.sets.map((set, setIndex) => (
          <div
            key={set.id}
            className={`${setIndex < setlist.sets.length - 1 ? 'print-page-break' : ''} p-8`}
          >
            {/* Set header */}
            <div className="mb-8 text-center">
              <h1 className="text-5xl font-bold text-black mb-2">{set.name}</h1>
              <p className="text-2xl font-bold text-black">{setlist.name}</p>
            </div>

            {/* Song list */}
            <div className="space-y-4">
              {set.songs.map((song, idx) => {
                const prevSong = idx > 0 ? set.songs[idx - 1] : null;
                const showSegueIcon = prevSong?.segueInto;

                return (
                  <div key={song.id} className="relative">
                    {/* Segue indicator */}
                    {showSegueIcon && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center border-2 border-white">
                          <i className="fas fa-link text-xs"></i>
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center gap-4 text-xl pb-2 ${
                      !song.segueInto ? 'border-b border-black' : ''
                    }`}>
                      {/* Track number */}
                      <div className="w-12 text-right font-bold text-black shrink-0">
                        {idx + 1}.
                      </div>

                      {/* Track name */}
                      <div className="flex-1 font-bold text-black">
                        {song.title}
                      </div>

                      {/* Key and Tuning badges */}
                      <div className="shrink-0 flex items-center gap-2">
                        {song.key && (
                          <span className="text-lg font-semibold text-black">
                            {song.key}
                          </span>
                        )}
                        {song.tuning && song.tuning !== 'standard' && (
                          <span className={`px-3 py-1 text-base font-bold rounded ${
                            song.tuning === 'drop-d' ? 'bg-yellow-400 text-black' :
                            song.tuning === 'eb' ? 'bg-blue-500 text-white' :
                            'bg-gray-400 text-black'
                          }`}>
                            {song.tuning === 'drop-d' ? 'Drop D' :
                             song.tuning === 'eb' ? 'Eb' :
                             song.tuning.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
