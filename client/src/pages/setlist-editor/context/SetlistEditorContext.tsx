/**
 * SetlistEditorContext - Centralized state management for setlist editor
 * Includes undo/redo history tracking
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { Setlist } from '../types';

const MAX_HISTORY_SIZE = 50;

interface SetlistEditorContextValue {
  // Working copy state
  workingSetlist: Setlist | null;
  setWorkingSetlist: (setlist: Setlist | null, skipHistory?: boolean) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (hasChanges: boolean) => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

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
  const [workingSetlist, setWorkingSetlistInternal] = useState<Setlist | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // History for undo/redo
  const historyRef = useRef<Setlist[]>([]);
  const futureRef = useRef<Setlist[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0); // Force re-render on history change

  // Wrapped setWorkingSetlist that tracks history
  const setWorkingSetlist = useCallback((setlist: Setlist | null, skipHistory = false) => {
    if (!skipHistory && workingSetlist && setlist) {
      // Push current state to history before changing
      historyRef.current = [...historyRef.current, workingSetlist].slice(-MAX_HISTORY_SIZE);
      // Clear future on new change
      futureRef.current = [];
      setHistoryVersion(v => v + 1);
    }
    setWorkingSetlistInternal(setlist);
  }, [workingSetlist]);

  // Undo function
  const undo = useCallback(() => {
    if (historyRef.current.length === 0 || !workingSetlist) return;

    const previousState = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, workingSetlist];
    setWorkingSetlistInternal(previousState);
    setHasUnsavedChanges(true);
    setHistoryVersion(v => v + 1);
  }, [workingSetlist]);

  // Redo function
  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;

    const nextState = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    if (workingSetlist) {
      historyRef.current = [...historyRef.current, workingSetlist];
    }
    setWorkingSetlistInternal(nextState);
    setHasUnsavedChanges(true);
    setHistoryVersion(v => v + 1);
  }, [workingSetlist]);

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

  // Compute canUndo/canRedo based on historyVersion to trigger re-renders
  const canUndo = historyVersion >= 0 && historyRef.current.length > 0;
  const canRedo = historyVersion >= 0 && futureRef.current.length > 0;

  const value: SetlistEditorContextValue = {
    workingSetlist,
    setWorkingSetlist,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    canUndo,
    canRedo,
    undo,
    redo,
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
