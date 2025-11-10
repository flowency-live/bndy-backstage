/**
 * useSetlistMutations - React Query mutations for setlist updates
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
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

  // Update setlist mutation
  const updateSetlistMutation = useMutation({
    mutationFn: async (updates: Partial<Setlist>) => {
      const { setlistsService } = await import('@/lib/services/setlists-service');
      return setlistsService.updateSetlist(artistId, setlistId, updates);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update setlist',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSuccess: (data, variables, context: any) => {
      // Update cache with server response
      queryClient.setQueryData(
        ['/api/artists', artistId, 'setlists', setlistId],
        data
      );

      // Only show toast if this was a MANUAL save (not auto-save)
      if (context?.showToast) {
        toast({
          title: 'Saved',
          description: 'Changes saved successfully',
          duration: 2000,
        });
      }
    },
  });

  // Save all changes to database
  const handleSave = () => {
    if (!workingSetlist || !hasUnsavedChanges) return;

    updateSetlistMutation.mutate(
      { sets: workingSetlist.sets, name: workingSetlist.name },
      {
        onSuccess: (data) => {
          setHasUnsavedChanges(false);
          // Update the query cache with saved data
          queryClient.setQueryData(
            ['/api/artists', artistId, 'setlists', setlistId],
            data
          );
          toast({
            title: 'Saved',
            description: 'Setlist saved successfully',
            duration: 2000,
          });
        },
      }
    );
  };

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
    setWorkingSetlist(setlist);
    setHasUnsavedChanges(false);

    // Navigate back to setlists view
    if (onNavigateBack) {
      onNavigateBack();
    }
  };

  // Update setlist name
  const handleUpdateName = () => {
    if (tempName.trim() && tempName !== workingSetlist?.name) {
      setWorkingSetlist({ ...workingSetlist!, name: tempName });
      setHasUnsavedChanges(true);
    }
    setEditingName(false);
  };

  return {
    handleSave,
    handleCancel,
    handleUpdateName,
    updateSetlistMutation,
    isSaving: updateSetlistMutation.isPending,
  };
}
