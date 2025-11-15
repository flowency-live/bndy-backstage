import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Settings, Users, Music2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { AdminProvider } from './AdminContext';
import ArtistSettingsTab from './ArtistSettingsTab';
import MembersTab from './MembersTab';
import SpotifyTab from './SpotifyTab';
import type { Artist, ArtistMembership } from '@/types/api';

interface AdminPageProps {
  artistId: string;
  membership: ArtistMembership;
}

type TabId = 'settings' | 'members' | 'spotify';

export default function AdminPage({ artistId, membership }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('settings');

  // Fetch artist data
  const { data: artistData, isLoading: artistLoading, refetch: refetchArtist } = useQuery<Artist>({
    queryKey: ['/api/artists', artistId],
    enabled: !!artistId
  });

  const isLoading = artistLoading;

  const refetch = async () => {
    await refetchArtist();
  };

  const tabs = [
    { id: 'settings' as TabId, label: 'Artist Settings', icon: Settings },
    { id: 'members' as TabId, label: 'Members', icon: Users },
    { id: 'spotify' as TabId, label: 'Spotify', icon: Music2 }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AdminProvider
      artistId={artistId}
      artistData={artistData || null}
      membership={membership}
      isLoading={isLoading}
      refetch={refetch}
    >
      <PageContainer>
        <PageHeader
          tabs={
            <div className="border-b border-border">
              <nav className="flex space-x-8" aria-label="Tabs">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                        ${isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          }
        />

        {/* Tab Content */}
        <div className="pb-8">
          {activeTab === 'settings' && <ArtistSettingsTab />}
          {activeTab === 'members' && <MembersTab />}
          {activeTab === 'spotify' && <SpotifyTab />}
        </div>
      </PageContainer>
    </AdminProvider>
  );
}
