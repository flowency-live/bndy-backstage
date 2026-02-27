import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SetlistBreak } from '@/types/setlist';

interface SetlistBreakLineProps {
  breakItem: SetlistBreak;
  setId: string;
  onEdit: (setId: string, breakId: string, note: string) => void;
  onRemove: (setId: string, breakId: string) => void;
  isOver?: boolean;
}

export function SetlistBreakLine({
  breakItem,
  setId,
  onEdit,
  onRemove,
  isOver
}: SetlistBreakLineProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(breakItem.note);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: breakItem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleFinishEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== breakItem.note) {
      onEdit(setId, breakItem.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isOver && (
        <div className="h-1 bg-orange-500 rounded-full mb-1 shadow-lg"></div>
      )}
      <div
        {...attributes}
        {...listeners}
        className={`
          group relative flex items-center justify-center gap-2 py-1.5 px-4
          border-y border-dashed border-muted-foreground/30
          bg-muted/30
          hover:border-muted-foreground/50 transition-colors
          select-none cursor-grab active:cursor-grabbing
          ${isDragging ? 'opacity-50' : ''}
        `}
        style={{ touchAction: 'none' }}
      >
        {isEditing ? (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleFinishEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleFinishEdit();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditValue(breakItem.note);
                setIsEditing(false);
              }
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-48 px-2 py-0.5 text-xs text-center border border-orange-500 rounded bg-background"
            autoFocus
          />
        ) : (
          <>
            <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-[11px] text-muted-foreground">
              {breakItem.note}
            </span>
          </>
        )}

        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsEditing(true);
            }}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
            title="Edit break note"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(setId, breakItem.id);
            }}
            className="p-1 hover:bg-muted rounded text-red-500 hover:text-red-600"
            title="Remove break"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function SetlistBreakLinePrint({ note }: { note: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1 my-1 border-t border-b border-dashed border-black">
      <span className="text-[10px] text-black uppercase tracking-wider">
        &#9881; {note}
      </span>
    </div>
  );
}
