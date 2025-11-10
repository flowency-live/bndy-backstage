import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FaFacebook, FaInstagram, FaYoutube, FaSpotify, FaXTwitter, FaGlobe } from 'react-icons/fa6';

const SOCIAL_PLATFORMS = [
  { key: 'facebookUrl', label: 'Facebook', icon: FaFacebook, color: '#1877F2', placeholder: 'facebook.com/yourband' },
  { key: 'instagramUrl', label: 'Instagram', icon: FaInstagram, color: '#E4405F', placeholder: 'instagram.com/yourband' },
  { key: 'youtubeUrl', label: 'YouTube', icon: FaYoutube, color: '#FF0000', placeholder: 'youtube.com/@yourband' },
  { key: 'spotifyUrl', label: 'Spotify', icon: FaSpotify, color: '#1DB954', placeholder: 'open.spotify.com/artist/...' },
  { key: 'twitterUrl', label: 'Twitter/X', icon: FaXTwitter, color: '#000000', placeholder: 'x.com/yourband' },
  { key: 'websiteUrl', label: 'Website', icon: FaGlobe, color: '#6B7280', placeholder: 'yourband.com' }
];

interface SocialLinksSectionProps {
  values: {
    facebookUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    spotifyUrl?: string;
    twitterUrl?: string;
    websiteUrl?: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function SocialLinksSection({ values, onChange }: SocialLinksSectionProps) {
  return (
    <div>
      <Label className="text-card-foreground font-semibold mb-3 block">Social Media Links</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIAL_PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          return (
            <div key={platform.key}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-8 h-8 rounded flex items-center justify-center text-white"
                  style={{ backgroundColor: platform.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <Label htmlFor={platform.key} className="text-sm font-medium">
                  {platform.label}
                </Label>
              </div>
              <Input
                id={platform.key}
                value={(values[platform.key as keyof typeof values] as string) || ''}
                onChange={(e) => onChange(platform.key, e.target.value)}
                placeholder={platform.placeholder}
                type="url"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
