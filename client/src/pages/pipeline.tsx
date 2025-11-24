import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import VotingTab from "@/components/pipeline/voting-tab";
import PracticeTab from "@/components/pipeline/practice-tab";
import ArchivedTab from "@/components/pipeline/archived-tab";
import AddSuggestionModal from "@/components/pipeline/modals/add-suggestion-modal";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { artistsService } from "@/lib/services/artists-service";
import type { ArtistMembership, Artist } from "@/types/api";

interface PipelineProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

type TabType = 'voting' | 'practice' | 'archived';

export default function Pipeline({ artistId, membership }: PipelineProps) {
  const [, setLocation] = useLocation();
  const { session } = useServerAuth();
  const [activeTab, setActiveTab] = useState<TabType>('voting');
  const [showAddModal, setShowAddModal] = useState(false);

  // Query counts for badge display
  const { data: votingCount = 0 } = useQuery({
    queryKey: ['pipeline-count', artistId, 'voting'],
    queryFn: async () => {
      const songs = await artistsService.getVotingPipelineSongs(artistId);
      return songs.length;
    },
    refetchInterval: 30000
  });

  const { data: practiceCount = 0 } = useQuery({
    queryKey: ['pipeline-count', artistId, 'practice'],
    queryFn: async () => {
      const songs = await artistsService.getPipelineSongs(artistId, 'practice');
      return songs.length;
    },
    refetchInterval: 30000
  });

  const { data: archivedCount = 0 } = useQuery({
    queryKey: ['pipeline-count', artistId, 'archived'],
    queryFn: async () => {
      const songs = await artistsService.getArchivedPipelineSongs(artistId);
      return songs.length;
    },
    refetchInterval: 30000
  });

  const tabs = [
    { id: 'voting' as TabType, label: 'Voting', count: votingCount },
    { id: 'practice' as TabType, label: 'Practice', count: practiceCount },
    { id: 'archived' as TabType, label: 'Other', count: archivedCount }
  ];

  return (
    <PageContainer>
      <PageHeader
        tabs={
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex gap-2 border-b border-border overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-2 font-medium transition-colors whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-muted-foreground hover:text-foreground'
                    }
                  `}
                >
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2 flex-shrink-0"
              data-testid="button-suggest-song"
            >
              <i className="fas fa-plus"></i>
              <span className="hidden sm:inline">Suggest Song</span>
            </button>
          </div>
        }
      />

        {/* Tab Content */}
        <div>
        {activeTab === 'voting' && (
          <VotingTab artistId={artistId} membership={membership} />
        )}
        {activeTab === 'practice' && (
          <PracticeTab artistId={artistId} membership={membership} />
        )}
        {activeTab === 'archived' && (
          <ArchivedTab artistId={artistId} membership={membership} />
        )}
        </div>

      {/* Add Suggestion Modal */}
      {showAddModal && (
        <AddSuggestionModal
          artistId={artistId}
          membershipId={membership.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            setActiveTab('voting');
          }}
        />
      )}
    </PageContainer>
  );
}
