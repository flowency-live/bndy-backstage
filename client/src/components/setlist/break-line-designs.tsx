/**
 * Break Line Design Options for Setlist Editor
 *
 * These are design explorations - pick one to implement.
 * Each option works in both editor (dark theme) and print (light/white) views.
 */

import React from 'react';

interface BreakLineProps {
  note: string;
  onEdit?: () => void;
  onDelete?: () => void;
  isDragging?: boolean;
}

/**
 * OPTION 1: Dashed Divider
 *
 * Clean, utilitarian aesthetic. The dashed line suggests a pause/break
 * while the centered badge contains the note. Subtle but clear.
 *
 * Best for: Professional, no-nonsense setlists
 */
export function BreakLineDashed({ note, onEdit, onDelete, isDragging }: BreakLineProps) {
  return (
    <div
      className={`
        group relative flex items-center gap-3 py-2 px-4
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Left dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />

      {/* Center badge */}
      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-muted-foreground/20">
        <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {note}
        </span>
      </div>

      {/* Right dashed line */}
      <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />

      {/* Edit/Delete buttons - show on hover */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * OPTION 2: Chevron Brackets
 *
 * Musical/theatrical feel. The angle brackets suggest "intermission"
 * or a stage direction. Slightly more decorative.
 *
 * Best for: Performance-focused bands, theatrical setlists
 */
export function BreakLineChevron({ note, onEdit, onDelete, isDragging }: BreakLineProps) {
  return (
    <div
      className={`
        group relative flex items-center justify-center gap-3 py-2 px-4
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Left chevrons */}
      <div className="flex items-center text-amber-500/60">
        <span className="text-lg font-light">‹‹</span>
      </div>

      {/* Center text */}
      <span className="text-xs font-medium text-amber-600 dark:text-amber-400 italic">
        {note}
      </span>

      {/* Right chevrons */}
      <div className="flex items-center text-amber-500/60">
        <span className="text-lg font-light">››</span>
      </div>

      {/* Edit/Delete buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * OPTION 3: Subtle Gradient Bar
 *
 * Modern, app-like feel. A soft gradient background with the note
 * gives visual weight without being heavy. The gradient fades at edges.
 *
 * Best for: Modern bands, apps with polished UI
 */
export function BreakLineGradient({ note, onEdit, onDelete, isDragging }: BreakLineProps) {
  return (
    <div
      className={`
        group relative flex items-center justify-center py-1.5 px-4 mx-2 my-1
        bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent
        dark:via-cyan-400/15
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Pause icon */}
      <svg className="w-3 h-3 text-cyan-600 dark:text-cyan-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
      </svg>

      {/* Note text */}
      <span className="text-[11px] font-medium text-cyan-700 dark:text-cyan-300 tracking-wide">
        {note}
      </span>

      {/* Edit/Delete buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * OPTION 4: Simple Inline (Recommended)
 *
 * Maximum simplicity. Just the note with subtle styling.
 * Blends naturally into the setlist without demanding attention.
 * Uses a wrench/tool icon to suggest "technical break".
 *
 * Best for: Any context - this is the safest, most readable option
 */
export function BreakLineSimple({ note, onEdit, onDelete, isDragging }: BreakLineProps) {
  return (
    <div
      className={`
        group relative flex items-center justify-center gap-2 py-1.5 px-4
        border-y border-dashed border-muted-foreground/20
        bg-muted/30
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      {/* Wrench icon */}
      <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>

      {/* Note text */}
      <span className="text-[11px] text-muted-foreground">
        {note}
      </span>

      {/* Edit/Delete buttons */}
      {(onEdit || onDelete) && (
        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          {onEdit && (
            <button onClick={onEdit} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button onClick={onDelete} className="p-1 hover:bg-muted rounded">
              <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * PRINT VIEW VARIANTS
 *
 * Simplified versions for printing - no hover states,
 * optimized for black & white printing
 */

export function BreakLinePrint({ note }: { note: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-1 my-1 border-t border-b border-dashed border-gray-300">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider">
        ⚙ {note}
      </span>
    </div>
  );
}

/**
 * DEMO: Preview all options
 */
export function BreakLineDemo() {
  const sampleNote = "Guitar retune to Drop D";

  return (
    <div className="space-y-8 p-6 max-w-md mx-auto">
      <h2 className="text-lg font-bold text-foreground mb-4">Break Line Options</h2>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Option 1: Dashed Divider</p>
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-3 border-b text-sm">Previous Song</div>
          <BreakLineDashed note={sampleNote} onEdit={() => {}} onDelete={() => {}} />
          <div className="p-3 border-t text-sm">Next Song</div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Option 2: Chevron Brackets</p>
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-3 border-b text-sm">Previous Song</div>
          <BreakLineChevron note={sampleNote} onEdit={() => {}} onDelete={() => {}} />
          <div className="p-3 border-t text-sm">Next Song</div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Option 3: Gradient Bar</p>
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-3 border-b text-sm">Previous Song</div>
          <BreakLineGradient note={sampleNote} onEdit={() => {}} onDelete={() => {}} />
          <div className="p-3 border-t text-sm">Next Song</div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Option 4: Simple Inline (Recommended)</p>
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="p-3 border-b text-sm">Previous Song</div>
          <BreakLineSimple note={sampleNote} onEdit={() => {}} onDelete={() => {}} />
          <div className="p-3 border-t text-sm">Next Song</div>
        </div>
      </div>

      <div className="space-y-2 mt-8 pt-8 border-t">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Print View (B&W optimized)</p>
        <div className="bg-white border rounded-lg overflow-hidden p-4">
          <div className="py-2 text-sm text-black">3. Livin' on a Prayer</div>
          <BreakLinePrint note={sampleNote} />
          <div className="py-2 text-sm text-black">4. Sweet Child O' Mine</div>
        </div>
      </div>
    </div>
  );
}
