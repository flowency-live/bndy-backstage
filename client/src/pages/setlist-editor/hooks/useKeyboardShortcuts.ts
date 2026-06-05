/**
 * useKeyboardShortcuts - Hook for setlist editor keyboard shortcuts
 * Handles undo (Ctrl+Z) and redo (Ctrl+Shift+Z / Ctrl+Y)
 */

import { useEffect } from 'react';

interface UseKeyboardShortcutsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useKeyboardShortcuts({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          onUndo();
        }
      } else if (modifier && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo) {
          onRedo();
        }
      } else if (modifier && e.key === 'y') {
        e.preventDefault();
        if (canRedo) {
          onRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);
}
