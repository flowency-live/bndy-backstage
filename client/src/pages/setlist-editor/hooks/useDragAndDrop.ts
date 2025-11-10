/**
 * useDragAndDrop - Hook for drag-and-drop functionality
 * Handles all drag events, sensor configuration, and state updates
 */

import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { PlaybookSong, SetlistSong } from '../types';
import {
  parseDragId,
  findTargetSet,
  findSourceSet,
  calculateTargetIndex,
} from '../utils';
import { useSetlistEditor } from '../context/SetlistEditorContext';

interface UseDragAndDropProps {
  playbookSongs: PlaybookSong[];
}

interface UseDragAndDropReturn {
  sensors: ReturnType<typeof useSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
}

export function useDragAndDrop({
  playbookSongs,
}: UseDragAndDropProps): UseDragAndDropReturn {
  const {
    workingSetlist,
    setWorkingSetlist,
    setHasUnsavedChanges,
    setActiveId,
    setOverId,
  } = useSetlistEditor();

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 400, // Long delay to allow scrolling on mobile
        tolerance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    if (!over) {
      setOverId(null);
      return;
    }

    setOverId(over.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over || !workingSetlist) return;

    const activeIdStr = active.id as string;
    const overIdStr = over.id as string;

    // Parse drag ID to determine source
    const { isFromPlaybook, songId } = parseDragId(activeIdStr);

    // Find target set and index
    const { setId: targetSetId, index: targetIndex } = findTargetSet(
      overIdStr,
      workingSetlist
    );

    if (!targetSetId) return;

    if (isFromPlaybook) {
      // Adding from playbook
      handleAddFromPlaybook(songId, targetSetId, targetIndex);
    } else {
      // Moving within or between sets
      handleMoveSong(songId, targetSetId, targetIndex);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverId(null);
  };

  // Add song from playbook to setlist
  const handleAddFromPlaybook = (
    songId: string,
    targetSetId: string,
    targetIndex: number
  ) => {
    const playbookSong = playbookSongs.find(s => s.id === songId);

    if (!playbookSong || !workingSetlist) {
      console.error('[DND] Playbook song not found:', songId);
      return;
    }

    const newSong: SetlistSong = {
      id: `${Date.now()}-${Math.random()}`,
      song_id: playbookSong.id,
      title: playbookSong.title,
      artist: playbookSong.artist,
      duration: playbookSong.duration || 0,
      position: targetIndex,
      key: playbookSong.key,
      tuning: playbookSong.tuning || 'standard',
      segueInto: false,
      imageUrl: playbookSong.imageUrl,
    };

    const updatedSets = workingSetlist.sets.map(set => {
      if (set.id === targetSetId) {
        const newSongs = [...set.songs];
        newSongs.splice(targetIndex, 0, newSong);
        return {
          ...set,
          songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
        };
      }
      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  // Move song within or between sets
  const handleMoveSong = (
    songId: string,
    targetSetId: string,
    targetIndex: number
  ) => {
    if (!workingSetlist) return;

    // Find source set and song
    const {
      setId: sourceSetId,
      index: sourceIndex,
      song: songToMove,
    } = findSourceSet(songId, workingSetlist);

    if (!songToMove || !sourceSetId) return;

    // If moving within same set and to same position, do nothing
    if (sourceSetId === targetSetId && sourceIndex === targetIndex) {
      return;
    }

    // Calculate adjusted target index for same-set moves
    const adjustedIndex = calculateTargetIndex(
      sourceSetId,
      targetSetId,
      sourceIndex,
      targetIndex
    );

    const updatedSets = workingSetlist.sets.map(set => {
      // Remove from source set
      if (set.id === sourceSetId) {
        const newSongs = set.songs.filter(s => s.id !== songId);

        // Clear segue flag on the song before the moved song
        if (sourceIndex > 0 && newSongs[sourceIndex - 1]) {
          newSongs[sourceIndex - 1] = {
            ...newSongs[sourceIndex - 1],
            segueInto: false,
          };
        }

        // If source and target are same set, insert at adjusted index
        if (sourceSetId === targetSetId) {
          // Clear segue flag on the moved song (reorder breaks segue)
          newSongs.splice(adjustedIndex, 0, { ...songToMove, segueInto: false });
          return {
            ...set,
            songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
          };
        }

        return {
          ...set,
          songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
        };
      }

      // Add to target set (if different from source)
      if (set.id === targetSetId && sourceSetId !== targetSetId) {
        const newSongs = [...set.songs];
        // Clear segue flag on the moved song (moving to different set breaks segue)
        newSongs.splice(adjustedIndex, 0, { ...songToMove, segueInto: false });
        return {
          ...set,
          songs: newSongs.map((s, idx) => ({ ...s, position: idx })),
        };
      }

      return set;
    });

    setWorkingSetlist({ ...workingSetlist, sets: updatedSets });
    setHasUnsavedChanges(true);
  };

  return {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDragCancel,
  };
}
