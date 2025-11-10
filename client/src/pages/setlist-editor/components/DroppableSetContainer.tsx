/**
 * DroppableSetContainer - Droppable container wrapper for sets (allows dropping into empty sets)
 */

import { useDroppable } from '@dnd-kit/core';

export interface DroppableSetContainerProps {
  setId: string;
  children: React.ReactNode;
}

export function DroppableSetContainer({ setId, children }: DroppableSetContainerProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `set-container-${setId}`,
  });

  return (
    <div
      ref={setNodeRef}
      className={`px-0 py-1 min-h-[100px] space-y-1 transition-colors ${
        isOver ? 'bg-orange-500/10 border-2 border-dashed border-orange-500' : ''
      }`}
    >
      {children}
    </div>
  );
}
