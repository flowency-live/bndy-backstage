import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useServerAuth } from "@/hooks/useServerAuth";
import VotingTab from "@/components/pipeline/voting-tab";
import PracticeTab from "@/components/pipeline/practice-tab";
import ArchivedTab from "@/components/pipeline/archived-tab";
import AddSuggestionModal from "@/components/pipeline/modals/add-suggestion-modal";
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

  // Query vote counts for badge display
  const { data: votingCount = 0 } = useQuery({
    queryKey: ['pipeline-count', artistId, 'voting'],
    queryFn: async () => {
      const response = await fetch(
        `/api/artists/${artistId}/pipeline?status=voting`,
        { credentials: 'include' }
      );
      if (!response.ok) return 0;
      const songs = await response.json();
      return songs.length;
    },
    refetchInterval: 30000
  });

  const tabs = [
    { id: 'voting' as TabType, label: 'Voting', count: votingCount },
    { id: 'practice' as TabType, label: 'Practice', count: null },
    { id: 'archived' as TabType, label: 'Other', count: null }
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Tabs Navigation - same layout as songs.tsx */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2 border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-2 font-medium transition-colors
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
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            data-testid="button-suggest-song"
          >
            <i className="fas fa-plus"></i>
            <span>Suggest Song</span>
          </button>
        </div>

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
    </div>
  );
}
