import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  User,
  Music,
  Users,
  Bot,
  Sparkles,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import {
  getAllVenues,
  getAllArtists,
  getAllSongs,
  getAllUsers,
  type Venue,
  type Artist,
  type Song,
  type User as UserType
} from '@/lib/services/godmode-service';

export default function GodmodeDashboard() {
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [venuesData, artistsData, songsData, usersData] = await Promise.all([
        getAllVenues(),
        getAllArtists(),
        getAllSongs(),
        getAllUsers()
      ]);
      setVenues(venuesData);
      setArtists(artistsData);
      setSongs(songsData);
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // Calculate stats
  const venueStats = {
    total: venues.length,
    noPlaceId: venues.filter(v => !v.googlePlaceId).length,
    noSocials: venues.filter(v => {
      const hasSocials = v.website ||
        (v.socialMediaUrls && Array.isArray(v.socialMediaUrls) &&
          v.socialMediaUrls.some((url: string) => url && typeof url === 'string' &&
            (url.includes('facebook.com') || url.includes('instagram.com'))));
      return !hasSocials;
    }).length,
    validated: venues.filter(v => v.validated).length
  };

  const artistStats = {
    total: artists.length,
    noGenres: artists.filter(a => !a.genres || (Array.isArray(a.genres) && a.genres.length === 0)).length,
    noSocials: artists.filter(a => !a.facebookUrl && !a.instagramUrl).length,
    verified: artists.filter(a => a.isVerified).length
  };

  const songStats = {
    total: songs.length,
    featured: songs.filter(s => s.isFeatured).length,
    hasStreaming: songs.filter(s => s.spotifyUrl || s.appleMusicUrl || s.youtubeUrl).length,
    hasAudio: songs.filter(s => s.audioFileUrl).length
  };

  const userStats = {
    total: users.length,
    completed: users.filter(u => u.profileCompleted).length,
    withBands: users.filter(u => u.membershipCount > 0).length
  };

  const statCards = [
    {
      title: 'Venues',
      icon: MapPin,
      total: venueStats.total,
      stats: [
        { label: 'Validated', value: venueStats.validated },
        { label: 'No Place ID', value: venueStats.noPlaceId, warning: true },
        { label: 'No Socials', value: venueStats.noSocials, warning: true }
      ],
      link: '/godmode/venues',
      color: 'text-blue-600'
    },
    {
      title: 'Artists',
      icon: User,
      total: artistStats.total,
      stats: [
        { label: 'Verified', value: artistStats.verified },
        { label: 'No Genres', value: artistStats.noGenres, warning: true },
        { label: 'No Socials', value: artistStats.noSocials, warning: true }
      ],
      link: '/godmode/artists',
      color: 'text-purple-600'
    },
    {
      title: 'Songs',
      icon: Music,
      total: songStats.total,
      stats: [
        { label: 'Featured', value: songStats.featured },
        { label: 'Has Streaming', value: songStats.hasStreaming },
        { label: 'Has Audio', value: songStats.hasAudio }
      ],
      link: '/godmode/songs',
      color: 'text-green-600'
    },
    {
      title: 'Users',
      icon: Users,
      total: userStats.total,
      stats: [
        { label: 'Complete Profile', value: userStats.completed },
        { label: 'With Artists', value: userStats.withBands },
        { label: 'Incomplete', value: userStats.total - userStats.completed, warning: true }
      ],
      link: '/godmode/users',
      color: 'text-orange-600'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Platform overview and statistics</p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Enrichment Queue</h3>
              <p className="text-sm text-muted-foreground">Review AI-suggested venue data</p>
            </div>
            <Link to="/godmode/venues/enrichment">
              <Button variant="outline" size="sm">
                Review <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Bot className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Events Agent</h3>
              <p className="text-sm text-muted-foreground">Review extracted events</p>
            </div>
            <Link to="/godmode/events">
              <Button variant="outline" size="sm">
                View <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn('p-2 rounded-lg bg-muted', card.color)}>
                  <Icon className="h-6 w-6" />
                </div>
                <Link to={card.link}>
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-3xl font-bold">{card.total.toLocaleString()}</div>
                  <div className="text-sm text-muted-foreground">{card.title}</div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  {card.stats.map((stat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className={stat.warning ? 'text-orange-600' : 'text-muted-foreground'}>
                        {stat.label}
                      </span>
                      <span className="font-medium">{stat.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}
