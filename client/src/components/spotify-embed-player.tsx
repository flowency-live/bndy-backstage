import React from 'react';

interface SpotifyEmbedPlayerProps {
  spotifyUrl: string;
  onClose: () => void;
}

export default function SpotifyEmbedPlayer({ spotifyUrl, onClose }: SpotifyEmbedPlayerProps) {
  const getSpotifyEmbedUrl = (url: string): string => {
    if (!url) return "";

    let trackId = "";

    // Handle Spotify URI format: spotify:track:xxxxx
    if (url.startsWith("spotify:track:")) {
      trackId = url.split("spotify:track:")[1];
    }
    // Handle Spotify URL format: https://open.spotify.com/track/xxxxx
    else if (url.includes("spotify.com/track") || url.includes("open.spotify.com/track")) {
      trackId = url.split("/track/")[1]?.split("?")[0];
    }

    if (trackId) {
      return `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    }

    return "";
  };

  const embedUrl = getSpotifyEmbedUrl(spotifyUrl);

  if (!embedUrl) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-black border-t border-border z-50 shadow-lg">
      <div className="relative h-full">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
          title="Close player"
        >
          <i className="fas fa-times text-xs"></i>
        </button>

        {/* Spotify embed iframe */}
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify Player"
        />
      </div>
    </div>
  );
}
