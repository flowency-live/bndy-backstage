/**
 * SetlistEditorContext - Centralized state management for setlist editor
 */

import React, { createContext, useContext, useState } from 'react';
import type { Setlist } from '../types';

interface SetlistEditorContextValue {
  // Working copy state
  workingSetlist: Setlist | null;
  setWorkingSetlist: (setlist: Setlist | null) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // UI state - editing
  editingName: boolean;
  setEditingName: (editing: boolean) => void;
  tempName: string;
  setTempName: (name: string) => void;
  editingSongTitle: string | null;
  setEditingSongTitle: (songId: string | null) => void;
  tempSongTitle: string;
  setTempSongTitle: (title: string) => void;
  editingTargetDuration: string | null;
  setEditingTargetDuration: (setId: string | null) => void;
  tempTargetDuration: number;
  setTempTargetDuration: (duration: number) => void;

  // UI state - drawer and filters
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  showAllSongs: boolean;
  setShowAllSongs: (show: boolean) => void;

  // UI state - sets
  activeSetId: string;
  setActiveSetId: (setId: string) => void;
  collapsedSets: Set<string>;
  setCollapsedSets: (sets: Set<string>) => void;

  // Drag and drop state
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  overId: string | null;
  setOverId: (id: string | null) => void;
}

const SetlistEditorContext = createContext<SetlistEditorContextValue | undefined>(
  undefined
);

interface SetlistEditorProviderProps {
  children: React.ReactNode;
}

export function SetlistEditorProvider({ children }: SetlistEditorProviderProps) {
  // Working copy state
  const [workingSetlist, setWorkingSetlist] = useState<Setlist | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // UI state - editing
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [editingSongTitle, setEditingSongTitle] = useState<string | null>(null);
  const [tempSongTitle, setTempSongTitle] = useState('');
  const [editingTargetDuration, setEditingTargetDuration] = useState<string | null>(null);
  const [tempTargetDuration, setTempTargetDuration] = useState(0);

  // UI state - drawer and filters
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllSongs, setShowAllSongs] = useState(false);

  // UI state - sets
  const [activeSetId, setActiveSetId] = useState('');
  const [collapsedSets, setCollapsedSets] = useState<Set<string>>(new Set());

  // Drag and drop state
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const value: SetlistEditorContextValue = {
    workingSetlist,
    setWorkingSetlist,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    editingName,
    setEditingName,
    tempName,
    setTempName,
    editingSongTitle,
    setEditingSongTitle,
    tempSongTitle,
    setTempSongTitle,
    editingTargetDuration,
    setEditingTargetDuration,
    tempTargetDuration,
    setTempTargetDuration,
    drawerOpen,
    setDrawerOpen,
    searchQuery,
    setSearchQuery,
    showAllSongs,
    setShowAllSongs,
    activeSetId,
    setActiveSetId,
    collapsedSets,
    setCollapsedSets,
    activeId,
    setActiveId,
    overId,
    setOverId,
  };

  return (
    <SetlistEditorContext.Provider value={value}>
      {children}
    </SetlistEditorContext.Provider>
  );
}

/**
 * Hook to access setlist editor context
 */
export function useSetlistEditor() {
  const context = useContext(SetlistEditorContext);
  if (context === undefined) {
    throw new Error('useSetlistEditor must be used within SetlistEditorProvider');
  }
  return context;
}
