import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerAuth } from "@/hooks/useServerAuth";
import VotingTab from "@/components/pipeline/voting-tab";
import ReviewTab from "@/components/pipeline/review-tab";
import PracticeTab from "@/components/pipeline/practice-tab";
import ArchivedTab from "@/components/pipeline/archived-tab";
import AddSuggestionModal from "@/components/pipeline/modals/add-suggestion-modal";
import FloatingActionButton from "@/components/floating-action-button";
import type { ArtistMembership, Artist } from "@/types/api";

interface PipelineProps {
  artistId: string;
  membership: ArtistMembership & { artist: Artist };
}

type TabType = 'voting' | 'review' | 'practice' | 'archived';

export default function Pipeline({ artistId, membership }: PipelineProps) {
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

  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['pipeline-count', artistId, 'review'],
    queryFn: async () => {
      const response = await fetch(
        `/api/artists/${artistId}/pipeline?status=review`,
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
    { id: 'review' as TabType, label: 'Review', count: reviewCount },
    { id: 'practice' as TabType, label: 'Practice', count: null },
    { id: 'archived' as TabType, label: 'Archived', count: null }
  ];

  return (
    <div className="min-h-screen pb-20">
      {/* Tab Navigation */}
      <div className="border-b border-border bg-card">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors
                ${activeTab === tab.id
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-2 sm:p-4">
        {activeTab === 'voting' && (
          <VotingTab artistId={artistId} membership={membership} />
        )}
        {activeTab === 'review' && (
          <ReviewTab artistId={artistId} membership={membership} />
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

      {/* Floating Action Button */}
      <FloatingActionButton onClick={() => setShowAddModal(true)} />
    </div>
  );
}
