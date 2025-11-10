/**
 * SetlistEditorCore - Main orchestrator component that wires all hooks and components together
 */

import { useState } from 'react';
import { useLocation } from 'wouter';
import { useConfirm } from '@/hooks/use-confirm';
import { DndContext, DragOverlay, closestCenter } from '@dnd-kit/core';
import type { Setlist, PlaybookSong } from './types';
import { useSetlistEditor } from './context/SetlistEditorContext';
import {
  useSetlistData,
  useSetlistMutations,
  usePlaybookFilter,
  useDragAndDrop,
  useSongManagement,
} from './hooks';
import {
  SetlistHeader,
  SetsContainer,
  PlaybookDrawer,
  DragOverlayContent,
} from './components';

export interface SetlistEditorCoreProps {
  artistId: string;
  setlistId: string;
}

export function SetlistEditorCore({ artistId, setlistId }: SetlistEditorCoreProps) {
  const [, setLocation] = useLocation();
  const { confirm } = useConfirm();

  // Context state
  const {
    workingSetlist,
    hasUnsavedChanges,
    editingName,
    setEditingName,
    tempName,
    setTempName,
    drawerOpen,
    setDrawerOpen,
    searchQuery,
    setSearchQuery,
    showAllSongs,
    setShowAllSongs,
    activeSetId,
    setActiveSetId,
    collapsedSets,
    activeId,
    overId,
    editingSongTitle,
    tempSongTitle,
  } = useSetlistEditor();

  // Data fetching
  const { setlist, playbookSongs, isLoading } = useSetlistData({
    artistId,
    setlistId,
  });

  // Mutations
  const { handleSave, handleCancel, handleUpdateName, isSaving } = useSetlistMutations({
    artistId,
    setlistId,
    setlist,
    onNavigateBack: () => setLocation('/setlists2'),
  });

  // Playbook filtering
  const { filteredPlaybookSongs, groupedSongs, sortedLetters, songsInSetlist } = usePlaybookFilter({
    playbookSongs,
    setlist,
  });

  // Drag and drop
  const { sensors, handleDragStart, handleDragOver, handleDragEnd, handleDragCancel } = useDragAndDrop({
    playbookSongs,
  });

  // Song management
  const {
    handleRemoveSong,
    handleToggleSegue,
    handleStartEditSongTitle,
    handleEditSongTitleChange,
    handleFinishEditSongTitle,
    handleQuickAdd,
    toggleSetCollapse,
  } = useSongManagement({ playbookSongs });

  // Handle navigation back
  const handleBack = async () => {
    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Unsaved Changes',
        description: 'You have unsaved changes. Are you sure you want to leave without saving?',
        confirmText: 'Discard Changes',
        variant: 'destructive',
      });
      if (!confirmed) return;
    }
    setLocation('/setlists2');
  };

  // Handle edit name
  const handleEditName = () => {
    setTempName(workingSetlist?.name || setlist?.name || '');
    setEditingName(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-orange-500 mb-4"></i>
          <p className="text-muted-foreground">Loading setlist...</p>
        </div>
      </div>
    );
  }

  if (!setlist || !workingSetlist) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-xl mb-2">Failed to load setlist</p>
          <button
            onClick={() => setLocation('/setlists2')}
            className="text-orange-500 hover:text-orange-600"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to setlists
          </button>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="min-h-screen bg-gradient-subtle animate-fade-in-up">
        <div className="max-w-6xl mx-auto px-0 sm:px-6 py-2 sm:py-8">
          {/* Header */}
          <div className="mb-2 px-2 sm:px-0 sm:mb-6">
            {editingName ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateName();
                    if (e.key === 'Escape') setEditingName(false);
                  }}
                  className="text-2xl font-serif font-bold bg-background border border-border rounded px-2 py-1"
                  autoFocus
                />
                <button
                  onClick={handleUpdateName}
                  className="text-green-500 hover:text-green-600"
                >
                  <i className="fas fa-check"></i>
                </button>
                <button
                  onClick={() => setEditingName(false)}
                  className="text-red-500 hover:text-red-600"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <SetlistHeader
                setlistName={workingSetlist.name}
                drawerOpen={drawerOpen}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={isSaving}
                onBack={handleBack}
                onEditName={handleEditName}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}
          </div>

          {/* Toggle drawer button (mobile) - only show when closed */}
          {!drawerOpen && (
            <div className="mb-2 lg:hidden px-2">
              <button
                onClick={() => setDrawerOpen(true)}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded font-medium flex items-center justify-center space-x-2"
              >
                <i className="fas fa-music"></i>
                <span>Add Songs from Playbook</span>
              </button>
            </div>
          )}

          <div className={`flex gap-2 lg:gap-4 relative ${drawerOpen ? 'lg:flex-row' : 'flex-col lg:flex-row'}`}>
            {/* Sets Container */}
            <SetsContainer
              sets={workingSetlist.sets}
              drawerOpen={drawerOpen}
              collapsedSets={collapsedSets}
              activeSetId={activeSetId}
              overId={overId}
              editingSongTitle={editingSongTitle}
              tempSongTitle={tempSongTitle}
              onToggleCollapse={toggleSetCollapse}
              onSetActive={setActiveSetId}
              onToggleSegue={handleToggleSegue}
              onRemoveSong={handleRemoveSong}
              onStartEditSongTitle={handleStartEditSongTitle}
              onEditSongTitleChange={handleEditSongTitleChange}
              onFinishEditSongTitle={handleFinishEditSongTitle}
            />

            {/* Playbook Drawer */}
            <PlaybookDrawer
              drawerOpen={drawerOpen}
              searchQuery={searchQuery}
              showAllSongs={showAllSongs}
              sortedLetters={sortedLetters}
              groupedSongs={groupedSongs}
              songsInSetlist={songsInSetlist}
              onToggleDrawer={() => setDrawerOpen(false)}
              onSearchChange={setSearchQuery}
              onClearSearch={() => setSearchQuery('')}
              onShowAllChange={setShowAllSongs}
              onQuickAdd={handleQuickAdd}
            />
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        <DragOverlayContent
          activeId={activeId}
          playbookSongs={playbookSongs}
          setlist={workingSetlist}
        />
      </DragOverlay>
    </DndContext>
  );
}
