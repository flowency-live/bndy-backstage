/**
 * useSetlistMutations - React Query mutations for setlist updates
 * Includes conflict detection to handle concurrent editing
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/hooks/use-confirm';
import type { Setlist } from '../types';
import { useSetlistEditor } from '../context/SetlistEditorContext';

interface UseSetlistMutationsProps {
  artistId: string;
  setlistId: string;
  setlist: Setlist | undefined;
  onNavigateBack?: () => void;
}

interface UseSetlistMutationsReturn {
  handleSave: () => void;
  handleCancel: () => Promise<void>;
  handleUpdateName: () => void;
  updateSetlistMutation: ReturnType<typeof useMutation>;
  isSaving: boolean;
}

export function useSetlistMutations({
  artistId,
  setlistId,
  setlist,
  onNavigateBack,
}: UseSetlistMutationsProps): UseSetlistMutationsReturn {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const queryClient = useQueryClient();
  const {
    workingSetlist,
    setWorkingSetlist,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    tempName,
    setEditingName,
  } = useSetlistEditor();

  // Track the state at the time save was initiated for conflict detection
  const saveSnapshotRef = useRef<string | null>(null);
  const pendingChangesRef = useRef(false);

  // Update setlist mutation
  const updateSetlistMutation = useMutation({
    mutationFn: async (updates: Partial<Setlist>) => {
      const { setlistsService } = await import('@/lib/services/setlists-service');
      return setlistsService.updateSetlist(artistId, setlistId, updates);
    },
    onMutate: () => {
      // Capture a snapshot of the current state before saving
      saveSnapshotRef.current = workingSetlist ? JSON.stringify(workingSetlist.sets) : null;
      pendingChangesRef.current = false;
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update setlist',
        description: error.message,
        variant: 'destructive',
      });
      saveSnapshotRef.current = null;
    },
    onSuccess: (data) => {
      // Update cache with server response
      queryClient.setQueryData(
        ['/api/artists', artistId, 'setlists', setlistId],
        data
      );
      saveSnapshotRef.current = null;
    },
  });

  // Save all changes to database
  const handleSave = useCallback(() => {
    if (!workingSetlist || !hasUnsavedChanges) return;

    // If already saving, mark that we have pending changes
    if (updateSetlistMutation.isPending) {
      pendingChangesRef.current = true;
      toast({
        title: 'Save in progress',
        description: 'Your changes will be saved when the current save completes.',
      });
      return;
    }

    updateSetlistMutation.mutate(
      { sets: workingSetlist.sets, name: workingSetlist.name },
      {
        onSuccess: (data) => {
          // Check if local state has changed since save started
          const currentSnapshot = JSON.stringify(workingSetlist.sets);
          const hasChangedDuringSave = saveSnapshotRef.current !== null &&
            currentSnapshot !== saveSnapshotRef.current;

          if (hasChangedDuringSave || pendingChangesRef.current) {
            // User made changes while save was in progress
            toast({
              title: 'Saved',
              description: 'Setlist saved. You have additional unsaved changes.',
            });
            // Keep hasUnsavedChanges as true since there are pending changes
          } else {
            setHasUnsavedChanges(false);
            // Update working setlist with server response (preserves server-side timestamps etc.)
            setWorkingSetlist(data, true); // skipHistory = true
            toast({
              title: 'Saved',
              description: 'Setlist saved successfully',
            });
          }

          // Update the query cache with saved data
          queryClient.setQueryData(
            ['/api/artists', artistId, 'setlists', setlistId],
            data
          );
        },
      }
    );
  }, [workingSetlist, hasUnsavedChanges, updateSetlistMutation, setHasUnsavedChanges, setWorkingSetlist, toast, queryClient, artistId, setlistId]);

  // Discard all changes and navigate back to setlists view
  const handleCancel = async () => {
    if (!setlist) return;

    if (hasUnsavedChanges) {
      const confirmed = await confirm({
        title: 'Discard changes?',
        description: 'You have unsaved changes. Are you sure you want to discard them?',
        confirmText: 'Discard',
        variant: 'destructive',
      });
      if (!confirmed) return;
    }

    // Reset working copy to saved version
    setWorkingSetlist(setlist, true); // skipHistory = true to not add to undo history
    setHasUnsavedChanges(false);

    // Navigate back to setlists view
    if (onNavigateBack) {
      onNavigateBack();
    }
  };

  // Update setlist name
  const handleUpdateName = useCallback(() => {
    if (tempName.trim() && tempName !== workingSetlist?.name && workingSetlist) {
      setWorkingSetlist({ ...workingSetlist, name: tempName });
      setHasUnsavedChanges(true);
    }
    setEditingName(false);
  }, [tempName, workingSetlist, setWorkingSetlist, setHasUnsavedChanges, setEditingName]);

  return {
    handleSave,
    handleCancel,
    handleUpdateName,
    updateSetlistMutation,
    isSaving: updateSetlistMutation.isPending,
  };
}
