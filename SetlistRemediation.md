# Setlist Feature - Complete Remediation Plan

## Executive Summary

The setlist feature has critical bugs preventing core functionality from working. The drag-and-drop is unreliable, saves don't work, duration calculations are broken, and mobile UX is unusable. This plan provides a complete rebuild strategy focusing on reliability and mobile-first design.

---

## Critical Bugs Currently Blocking Users

### BUG-001: Duration Calculations Never Work
**Status:** CRITICAL - Core feature completely broken
**Location:** [setlist-editor.tsx:378-381](client/src/pages/setlist-editor.tsx#L378-L381), [setlists.tsx:227-239](client/src/pages/setlists.tsx#L227-L239)

**Problem:**
- Set total duration shows 0:00 always
- Variance calculations fail silently
- Color coding never appears
- Song count shows 0 even with songs

**Root Cause:**
- Songs added via drag-drop don't have `duration` field populated correctly
- Playbook songs have `globalSong.duration` but setlist songs need `duration` at top level
- Data transformation during drag-drop loses duration value

**Fix:**
```javascript
// Line 297-307 in setlist-editor.tsx - BROKEN
const newSong: Song = {
  id: `${Date.now()}-${Math.random()}`,
  song_id: playbookSong.id,
  title: playbookSong.title,
  artist: playbookSong.artist,
  duration: playbookSong.duration || 0,  // This IS set correctly
  // ... but songs array gets corrupted somewhere
};
```

**Actual Issue:** React state isn't updating after optimistic update. The mutation succeeds but UI doesn't reflect changes because query cache is stale.

---

### BUG-002: Save Button Does Nothing
**Status:** CRITICAL - Users can't persist changes
**Location:** [setlist-editor.tsx:455-473](client/src/pages/setlist-editor.tsx#L455-L473)

**Problem:**
- "Save" button triggers mutation but changes don't persist
- Auto-save also fails silently
- Page refresh loses all work

**Root Cause:**
- Optimistic update (line 177-184) sets cache but network request may fail
- No error handling shows users when save fails
- Query invalidation competes with optimistic updates
- Server may be rejecting malformed data

**Investigation Needed:**
- Check browser Network tab for actual HTTP 200 vs 4xx/5xx
- Verify DynamoDB write succeeds
- Check if data shape matches Lambda expectations

---

### BUG-003: Drag-and-Drop Unreliable on Desktop
**Status:** CRITICAL - Primary interaction fails
**Location:** [setlist-editor.tsx:206-259](client/src/pages/setlist-editor.tsx#L206-L259)

**Problem:**
- Click and hold highlights text instead of dragging
- Some cards drag, others don't (inconsistent)
- Drag handle concept doesn't exist - entire card should be draggable
- User selection interferes with drag gesture

**Root Cause:**
- No `user-select: none` CSS on draggable elements
- SortableJS re-initializes on every render, breaking event listeners
- No explicit drag handle specified
- Browser text selection takes precedence

**Fix Strategy:**
1. Add `select-none` Tailwind class to all draggable cards
2. Prevent SortableJS re-initialization (use stable refs)
3. Add visible drag handle icon on left side of cards
4. Disable text selection during drag with CSS

---

### BUG-004: Mobile Layout Completely Unusable
**Status:** CRITICAL - Mobile experience broken
**Location:** [setlist-editor.tsx:605-648](client/src/pages/setlist-editor.tsx#L605-L648)

**Problem:**
- Playbook drawer covers entire screen (can't see destination)
- Must close drawer, remember song, reopen, find song, repeat
- No side-by-side view on mobile
- Touch targets too small (12px icons)

**Required Solution:**
- 50/50 split screen layout when drawer active (reference: C:\VSProjects\rewiredband_website\index.html)
- Both panes visible simultaneously
- Reduce padding throughout (currently excessive)
- Larger touch targets (minimum 44px)

---

## Phase 1: Emergency Fixes (Week 1)

### TASK-101: Fix Type Definitions
**Priority:** P0 - Blocks all other work
**Effort:** 2 hours

**Actions:**
1. Create `client/src/types/setlist.ts`
2. Define canonical types with all fields:
```typescript
export interface SetlistSong {
  id: string;                    // Unique instance ID
  song_id: string;               // Reference to playbook song
  title: string;
  artist: string;
  duration: number;              // REQUIRED - in seconds
  position: number;
  tuning?: string;
  segueInto?: boolean;
  imageUrl?: string;
}

export interface SetlistSet {
  id: string;
  name: string;
  targetDuration: number;        // in seconds
  songs: SetlistSong[];
}

export interface Setlist {
  id: string;
  artist_id: string;
  name: string;
  sets: SetlistSet[];
  created_by_membership_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PlaybookSong {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  album: string;
  spotifyUrl: string;
  imageUrl?: string;
  duration: number;              // REQUIRED
  bpm?: number;
  key?: string;
  tuning?: string;
}
```

3. Replace inline interfaces in both files
4. Import from shared types

**Acceptance Criteria:**
- No duplicate type definitions
- All files use same types
- TypeScript compiles without errors

---

### TASK-102: Fix Duration Calculation Data Flow
**Priority:** P0 - Core feature broken
**Effort:** 4 hours

**Root Issue:** Songs added to sets don't preserve duration from playbook.

**Actions:**

1. **Verify data at drag point** ([setlist-editor.tsx:289-310](client/src/pages/setlist-editor.tsx#L289-L310)):
```javascript
if (fromSetId === 'playbook-drawer') {
  const songElement = evt.item;
  const songId = songElement.getAttribute('data-song-id');
  const playbookSong = playbookSongs.find(s => s.id === songId);

  if (playbookSong) {
    console.log('DEBUG - Playbook song duration:', playbookSong.duration); // ADD THIS
    const newSong: SetlistSong = {
      id: `${Date.now()}-${Math.random()}`,
      song_id: playbookSong.id,
      title: playbookSong.title,
      artist: playbookSong.artist,
      duration: playbookSong.duration || 0,  // Should be number, not undefined
      position: newIndex,
      tuning: playbookSong.tuning || 'standard',
      segueInto: false,
      imageUrl: playbookSong.imageUrl,
    };
    console.log('DEBUG - Created song object:', newSong); // ADD THIS
    toSet.songs.splice(newIndex, 0, newSong);
    console.log('DEBUG - toSet after splice:', toSet); // ADD THIS
  }
}
```

2. **Verify mutation payload** (line 331):
```javascript
console.log('DEBUG - Mutation payload:', { sets: updatedSets }); // ADD THIS
updateSetlistMutation.mutate({ sets: updatedSets });
```

3. **Verify server response**:
- Check Lambda CloudWatch logs for incoming request body
- Verify DynamoDB write has duration field
- Check API response returns duration

4. **Fix optimistic update cache corruption** ([setlist-editor.tsx:169-186](client/src/pages/setlist-editor.tsx#L169-L186)):
```javascript
onMutate: async (updates) => {
  await queryClient.cancelQueries({
    queryKey: ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId]
  });

  const previousSetlist = queryClient.getQueryData([
    "https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId
  ]);

  // DON'T optimistically update - wait for server response
  // This prevents cache corruption

  return { previousSetlist };
},
```

5. **Fix calculation function** ([setlist-editor.tsx:378-381](client/src/pages/setlist-editor.tsx#L378-L381)):
```javascript
const getSetTotalDuration = (set: SetlistSet): number => {
  if (!set.songs || set.songs.length === 0) return 0;
  const total = set.songs.reduce((total, song) => {
    console.log('Song duration:', song.title, song.duration); // ADD DEBUG
    return total + (song?.duration || 0);
  }, 0);
  console.log('Set total:', set.name, total); // ADD DEBUG
  return total;
};
```

**Acceptance Criteria:**
- Drop song from playbook, console shows duration > 0
- Set total updates immediately
- Variance percentage calculates correctly
- Color coding appears (blue/yellow/red)
- Page refresh preserves durations

---

### TASK-103: Fix Save Functionality
**Priority:** P0 - Users can't save work
**Effort:** 6 hours

**Investigation Steps:**

1. **Add mutation error logging**:
```javascript
onError: (error: Error, _updates, context) => {
  console.error('MUTATION ERROR:', error);
  console.error('Failed updates:', _updates);
  console.error('Context:', context);

  queryClient.setQueryData(
    ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
    context?.previousSetlist
  );

  toast({
    title: "Failed to update setlist",
    description: error.message,
    variant: "destructive"
  });
},
```

2. **Add network logging**:
```javascript
mutationFn: async (updates: Partial<Setlist>) => {
  console.log('MUTATION REQUEST:', updates);

  const response = await fetch(
    `https://api.bndy.co.uk/api/artists/${artistId}/setlists/${setlistId}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    }
  );

  console.log('MUTATION RESPONSE STATUS:', response.status);
  const data = await response.json();
  console.log('MUTATION RESPONSE DATA:', data);

  if (!response.ok) {
    throw new Error(data.error || "Failed to update setlist");
  }

  return data;
},
```

3. **Test save button explicitly**:
- Add unique event to manual save button
- Log when clicked
- Verify mutation triggers
- Check network tab for PUT request
- Verify DynamoDB write via AWS Console

4. **Remove optimistic updates temporarily**:
- Disable `onMutate` hook
- Test if saves work without optimistic updates
- If yes, optimistic update logic is corrupting state

**Fix Strategy:**

If saves work without optimistic updates:
- Remove optimistic updates entirely
- Add loading spinner during save
- Show success toast on completion

If saves still fail:
- Check CORS headers
- Check authentication cookies
- Verify Lambda logs for errors
- Check DynamoDB table permissions

**Acceptance Criteria:**
- Click "Save" button → sees loading state
- Network tab shows PUT request with 200 response
- DynamoDB table updates (verify in AWS Console)
- Page refresh shows saved changes
- Toast notification confirms save

---

### TASK-104: Fix Drag-and-Drop Reliability
**Priority:** P0 - Primary interaction broken
**Effort:** 8 hours

**Problem Analysis:**
1. Text selection interferes with drag
2. SortableJS reinitializes constantly
3. No visual drag handle
4. Touch events conflict on mobile

**Actions:**

1. **Prevent text selection** ([setlist-editor.tsx:534-584](client/src/pages/setlist-editor.tsx#L534-L584)):
```jsx
<div
  data-song-id={song.song_id}
  className="flex items-center space-x-2 bg-background border border-border rounded p-2 hover:border-orange-500/50 transition-colors cursor-move select-none"
  //                                                                                                                                              ^^^^^^^^^^^^ ADD THIS
>
```

2. **Add explicit drag handle**:
```jsx
<div className="flex items-center space-x-2 bg-background border border-border rounded p-2 hover:border-orange-500/50 transition-colors select-none">
  {/* DRAG HANDLE - ADD THIS */}
  <div className="drag-handle cursor-grab active:cursor-grabbing p-2 -ml-2 touch-none">
    <i className="fas fa-grip-vertical text-muted-foreground"></i>
  </div>

  {/* Position number */}
  <div className="w-6 text-center text-sm font-bold text-foreground">
    {idx + 1}.
  </div>
  {/* ... rest of card */}
</div>
```

3. **Fix SortableJS initialization** ([setlist-editor.tsx:206-259](client/src/pages/setlist-editor.tsx#L206-L259)):

**CURRENT (BROKEN):**
```javascript
useEffect(() => {
  if (!setlist) return;

  // This destroys and recreates Sortable on EVERY setlist change
  Object.values(sortableRefs.current).forEach(sortable => {
    if (sortable && typeof sortable.destroy === 'function') {
      sortable.destroy();  // <-- PROBLEM: destroys event listeners
    }
  });
  sortableRefs.current = {};

  setlist.sets.forEach((set) => {
    const element = document.getElementById(`set-${set.id}`);
    if (element) {
      sortableRefs.current[set.id] = Sortable.create(element, {
        group: 'setlist-songs',
        animation: 150,
        onEnd: (evt) => handleSongMove(evt, set.id),
      });
    }
  });
}, [setlist]); // <-- PROBLEM: runs every time setlist changes (every drag!)
```

**FIXED:**
```javascript
const setIdsRef = useRef<string[]>([]);

useEffect(() => {
  if (!setlist) return;

  const currentSetIds = setlist.sets.map(s => s.id);
  const previousSetIds = setIdsRef.current;

  // Only reinitialize if set IDs changed (sets added/removed)
  const setsChanged =
    currentSetIds.length !== previousSetIds.length ||
    currentSetIds.some((id, idx) => id !== previousSetIds[idx]);

  if (!setsChanged && Object.keys(sortableRefs.current).length > 0) {
    // Sortables already initialized, don't recreate
    return;
  }

  // Clean up old sortables only if sets actually changed
  Object.values(sortableRefs.current).forEach(sortable => {
    if (sortable && typeof sortable.destroy === 'function') {
      sortable.destroy();
    }
  });
  sortableRefs.current = {};

  // Initialize sortable for each set
  setlist.sets.forEach((set) => {
    const element = document.getElementById(`set-${set.id}`);
    if (element) {
      sortableRefs.current[set.id] = Sortable.create(element, {
        group: 'setlist-songs',
        handle: '.drag-handle',  // Only drag from handle
        animation: 150,
        forceFallback: true,     // Better touch support
        fallbackTolerance: 3,    // px to move before drag starts
        onEnd: (evt) => handleSongMove(evt, set.id),
      });
    }
  });

  // Initialize playbook drawer
  const drawerElement = document.getElementById('playbook-drawer');
  if (drawerElement && !sortableRefs.current['drawer']) {
    sortableRefs.current['drawer'] = Sortable.create(drawerElement, {
      group: {
        name: 'setlist-songs',
        pull: 'clone',
        put: false,
      },
      handle: '.drag-handle',
      animation: 150,
      sort: false,
      forceFallback: true,
    });
  }

  setIdsRef.current = currentSetIds;

  return () => {
    Object.values(sortableRefs.current).forEach(sortable => {
      if (sortable && typeof sortable.destroy === 'function') {
        sortable.destroy();
      }
    });
  };
}, [setlist?.sets.length]); // Only depend on number of sets
```

4. **Add CSS to prevent selection**:
```css
.drag-handle {
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.sortable-ghost {
  opacity: 0.4;
  background: #f97316 !important;
}

.sortable-drag {
  opacity: 0.8;
  transform: rotate(2deg);
}
```

**Acceptance Criteria:**
- Click and drag from handle icon → card drags reliably
- No text selection during drag
- Works 100% of time on desktop
- Visual feedback during drag (ghost + drag states)
- Touch works on mobile

---

### TASK-105: Remove Console Logs
**Priority:** P1 - Code quality
**Effort:** 30 minutes

**Actions:**
1. Search for `console.log` in setlist files
2. Remove all debug logs (lines 262, 274, 286, 294, 308, 315, 328, 511-515)
3. Keep error logs (`console.error`) but make them informative

**Files:**
- [setlist-editor.tsx](client/src/pages/setlist-editor.tsx)

**Note:** Add logs back temporarily during TASK-102 debugging, then remove again.

---

## Phase 2: Mobile UX Overhaul (Week 2)

### TASK-201: Implement 50/50 Split Screen Layout
**Priority:** P0 - Mobile completely broken
**Effort:** 12 hours
**Reference:** C:\VSProjects\rewiredband_website\index.html (lines 14-22, 102-104)

**Key Insight from Reference:**
The reference implementation uses a simple fixed drawer that:
- Slides in from right with `transform: translateX(100%)` when closed
- Opens with `transform: translateX(0)`
- Width is `60%` on mobile, `max-width: 240px`
- Uses simple toggle button, no backdrop needed

**Current Issue:**
- Playbook drawer is `fixed` overlay at `w-80` (320px)
- Covers entire screen on mobile
- Can't see destination while picking songs
- Backdrop blocks interaction

**Required Behavior:**
1. When drawer closed: Sets take full width
2. When drawer open on mobile: Sets shrink to ~40%, drawer takes ~60%
3. Desktop: Always show both side-by-side (current behavior OK)
4. NO backdrop - both panes interactive simultaneously

**Implementation:**

1. **Change drawer from fixed overlay to flex layout**:

**CURRENT (BROKEN):**
```jsx
<div className="flex gap-4 relative">
  {/* Sets area */}
  <div className="flex-1 min-w-0">
    {/* sets */}
  </div>

  {/* Playbook drawer - FIXED OVERLAY */}
  <div className={`fixed lg:relative top-0 right-0 h-full w-80 ... ${
    drawerOpen ? 'translate-x-0' : 'translate-x-full'
  } lg:translate-x-0`}>
    {/* playbook */}
  </div>
</div>
```

**FIXED:**
```jsx
<div className="flex gap-2 relative min-h-screen">
  {/* Sets area - shrinks when drawer opens */}
  <div className={`transition-all duration-300 ${
    drawerOpen ? 'w-1/2' : 'w-full'
  } lg:flex-1 min-w-0 overflow-auto`}>
    <div className="space-y-2 p-2">
      {/* sets */}
    </div>
  </div>

  {/* Playbook drawer - slides in from right, pushes content */}
  <div className={`transition-all duration-300 ${
    drawerOpen ? 'w-1/2' : 'w-0'
  } lg:w-80 lg:block overflow-hidden border-l border-border`}>
    <div className={`w-full h-full ${drawerOpen ? 'block' : 'hidden'} lg:block`}>
      {/* playbook */}
    </div>
  </div>
</div>
```

2. **Remove backdrop** (lines 495-500):
```jsx
{/* DELETE THIS - no longer needed */}
{drawerOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-30 lg:hidden"
    onClick={() => setDrawerOpen(false)}
  />
)}
```

3. **Update toggle button**:
```jsx
<div className="mb-2 lg:hidden">
  <button
    onClick={() => setDrawerOpen(!drawerOpen)}
    className="w-full bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded font-medium flex items-center justify-center gap-2"
  >
    <i className={`fas fa-${drawerOpen ? 'list' : 'music'}`}></i>
    <span>{drawerOpen ? 'Show Sets' : 'Show Playbook'}</span>
  </button>
</div>
```

**Acceptance Criteria:**
- Mobile: Click "Show Playbook" → screen splits 50/50
- Both sets and playbook visible simultaneously
- Can drag from right to left
- No backdrop obscuring content
- Smooth animation

---

### TASK-202: Reduce Excessive Padding
**Priority:** P1 - Space optimization
**Effort:** 4 hours

**Current Issue:**
- Too many nested containers with padding
- Wasted space on mobile
- Cards have excessive internal padding

**Actions:**

1. **Song cards** - Reduce from `p-2` to compact layout:

**BEFORE:**
```jsx
<div className="flex items-center space-x-2 bg-background border border-border rounded p-2">
```

**AFTER:**
```jsx
<div className="flex items-center gap-1 bg-background border border-border rounded p-1">
```

2. **Set containers** - Remove double padding:

**BEFORE:**
```jsx
<div className="bg-card border border-border rounded overflow-hidden">
  <div className="p-2 min-h-[100px] space-y-1">
```

**AFTER:**
```jsx
<div className="bg-card border border-border rounded overflow-hidden">
  <div className="p-1 min-h-[100px] space-y-1">
```

3. **Page container** - Reduce top-level padding on mobile:

**BEFORE:**
```jsx
<div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
```

**AFTER:**
```jsx
<div className="max-w-6xl mx-auto px-2 sm:px-6 py-2 sm:py-8">
```

4. **Space-y utilities** - Reduce gaps:
- `space-y-6` → `space-y-2`
- `space-y-3` → `space-y-1`
- `gap-4` → `gap-2`

**Acceptance Criteria:**
- More content visible on screen
- No cramped feeling
- Touch targets still 44px minimum
- Desktop looks clean (not too tight)

---

### TASK-203: Increase Touch Targets
**Priority:** P0 - Mobile usability
**Effort:** 3 hours

**Current Issue:**
- Buttons are too small (icon-only, ~24px)
- Hard to tap accurately
- Frustrating mobile experience

**Required:** Minimum 44x44px touch targets (iOS/Android guideline)

**Actions:**

1. **Drag handle** - Make it larger:
```jsx
<div className="drag-handle cursor-grab active:cursor-grabbing p-3 -ml-1 touch-none">
  <i className="fas fa-grip-vertical text-lg text-muted-foreground"></i>
</div>
```

2. **Remove song button**:
```jsx
<button
  onClick={(e) => {
    e.stopPropagation();
    handleRemoveSong(set.id, song.id);
  }}
  className="text-red-500 hover:text-red-600 p-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
>
  <i className="fas fa-times text-lg"></i>
</button>
```

3. **Segue toggle button**:
```jsx
<button
  onClick={(e) => {
    e.stopPropagation();
    handleToggleSegue(set.id, song.id);
  }}
  className={`p-3 min-w-[44px] min-h-[44px] flex items-center justify-center ${
    song.segueInto ? 'text-blue-500' : 'text-muted-foreground'
  } hover:text-blue-600`}
  title={song.segueInto ? 'Click to break segue' : 'Click to segue into next song'}
>
  <i className="fas fa-arrow-down text-lg"></i>
</button>
```

4. **Drawer close button** (line 614-618):
```jsx
<button
  onClick={() => setDrawerOpen(false)}
  className="lg:hidden text-white hover:bg-orange-600 p-3 rounded min-w-[44px] min-h-[44px] flex items-center justify-center"
>
  <i className="fas fa-times text-lg"></i>
</button>
```

**Acceptance Criteria:**
- All interactive elements minimum 44x44px
- Easy to tap on mobile
- No accidental taps
- Icons remain visually balanced

---

### TASK-204: Optimize Set Header for Mobile
**Priority:** P1 - Visual clarity
**Effort:** 2 hours

**Current Issue:**
- Set header shows name, duration, variance, song count
- Text wraps awkwardly on narrow screens
- Too much info in one line

**Actions:**

**BEFORE:**
```jsx
<div className="bg-muted/30 p-3 border-b border-border flex items-center justify-between">
  <h3 className="font-semibold">{set.name}</h3>
  <div className="flex items-center space-x-3 text-sm">
    <div className={`font-medium ${varianceColor}`}>
      {formatDuration(totalDuration)} / {formatDuration(set.targetDuration)}
      <span className="ml-1">({variance > 0 ? '+' : ''}{variance.toFixed(0)}%)</span>
    </div>
    <span className="text-muted-foreground">
      {set.songs.length} song{set.songs.length !== 1 ? 's' : ''}
    </span>
  </div>
</div>
```

**AFTER:**
```jsx
<div className="bg-muted/30 p-2 border-b border-border">
  <div className="flex items-center justify-between mb-1">
    <h3 className="font-semibold text-sm">{set.name}</h3>
    <span className="text-xs text-muted-foreground">
      {set.songs.length} songs
    </span>
  </div>
  <div className="flex items-center justify-between">
    <div className={`text-sm font-medium ${varianceColor}`}>
      {formatDuration(totalDuration)} / {formatDuration(set.targetDuration)}
    </div>
    <div className={`text-xs font-bold ${varianceColor}`}>
      {variance > 0 ? '+' : ''}{variance.toFixed(0)}%
    </div>
  </div>
</div>
```

**Acceptance Criteria:**
- No text wrapping on 320px width
- All info visible and readable
- Clear visual hierarchy

---

### TASK-205: Add Alphabetical Grouping to Playbook
**Priority:** P1 - UX enhancement
**Effort:** 4 hours

**Current Issue:**
- Playbook songs show as flat list
- Hard to find specific song
- No organization

**Required Behavior:**
- Group songs by first letter (A, B, C, etc.)
- Sticky section headers that stay visible on scroll
- Jump-to-letter quick navigation (optional enhancement)

**Implementation:**

1. **Transform playbook data into grouped structure**:
```javascript
const groupSongsByLetter = (songs: PlaybookSong[]) => {
  const grouped: { [key: string]: PlaybookSong[] } = {};

  songs.forEach(song => {
    const firstLetter = (song.title[0] || '#').toUpperCase();
    const key = /[A-Z]/.test(firstLetter) ? firstLetter : '#';

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(song);
  });

  return Object.keys(grouped)
    .sort()
    .map(letter => ({
      letter,
      songs: grouped[letter].sort((a, b) => a.title.localeCompare(b.title))
    }));
};

const groupedSongs = groupSongsByLetter(filteredPlaybookSongs);
```

2. **Render with sticky headers**:
```jsx
<div id="playbook-drawer" className="p-1 h-[calc(100vh-180px)] lg:max-h-[600px] overflow-y-auto">
  {groupedSongs.map(({ letter, songs }) => (
    <div key={letter}>
      {/* Sticky letter header */}
      <div className="sticky top-0 bg-orange-500 text-white px-2 py-1 text-xs font-bold z-10">
        {letter}
      </div>

      {/* Songs in this group */}
      <div className="space-y-1 mb-2">
        {songs.map((song) => (
          <div
            key={song.id}
            data-song-id={song.id}
            className="flex items-center gap-1 bg-background border border-border rounded p-1 hover:border-orange-500/50 transition-colors cursor-move"
          >
            {/* Drag handle */}
            <div className="drag-handle cursor-grab p-2 touch-none">
              <i className="fas fa-grip-vertical text-xs text-muted-foreground"></i>
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-sm">{song.title}</div>
              <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {song.duration ? formatDuration(song.duration) : '--'}
            </div>
          </div>
        ))}
      </div>
    </div>
  ))}
</div>
```

**Acceptance Criteria:**
- Songs grouped alphabetically
- Letter headers visible and sticky
- Easy to scan and find songs
- Works with search filter

---

### TASK-206: Implement Click-to-Add on Mobile
**Priority:** P0 - Critical mobile UX
**Effort:** 6 hours

**Current Issue:**
- Drag-and-drop is primary interaction
- Hard to drag precisely on touch devices
- Requires long-press which isn't discoverable

**Required Behavior:**
- **Single tap/click** on playbook song → adds to bottom of currently selected set
- **Long press** → enables drag mode for precise positioning
- Visual feedback on tap
- Works on both mobile and desktop

**Implementation:**

1. **Add active set selection**:
```javascript
const [activeSetId, setActiveSetId] = useState<string>(
  setlist?.sets[0]?.id || ''
);
```

2. **Add click handler to playbook songs**:
```jsx
<div
  key={song.id}
  data-song-id={song.id}
  onClick={(e) => {
    // Only on mobile or when explicitly enabled
    if (window.innerWidth < 1024) {
      e.preventDefault();
      handleQuickAdd(song);
    }
  }}
  className="flex items-center gap-1 bg-background border border-border rounded p-1 hover:border-orange-500/50 transition-colors cursor-pointer lg:cursor-move"
>
  {/* song content */}
</div>
```

3. **Implement quick-add handler**:
```javascript
const handleQuickAdd = (playbookSong: PlaybookSong) => {
  if (!setlist || !activeSetId) return;

  const updatedSets = setlist.sets.map(set => {
    if (set.id === activeSetId) {
      const newSong: SetlistSong = {
        id: `${Date.now()}-${Math.random()}`,
        song_id: playbookSong.id,
        title: playbookSong.title,
        artist: playbookSong.artist,
        duration: playbookSong.duration || 0,
        position: set.songs.length, // Add to end
        tuning: playbookSong.tuning || 'standard',
        segueInto: false,
        imageUrl: playbookSong.imageUrl,
      };

      return {
        ...set,
        songs: [...set.songs, newSong],
      };
    }
    return set;
  });

  updateSetlistMutation.mutate({ sets: updatedSets });

  // Visual feedback
  toast({
    title: `Added "${playbookSong.title}"`,
    duration: 1000,
  });
};
```

4. **Add active set indicator in set headers**:
```jsx
<div className="bg-muted/30 p-2 border-b border-border">
  <div className="flex items-center justify-between mb-1">
    <div className="flex items-center gap-2">
      {/* Radio button to select active set (mobile only) */}
      <button
        onClick={() => setActiveSetId(set.id)}
        className={`lg:hidden w-4 h-4 rounded-full border-2 ${
          activeSetId === set.id
            ? 'bg-orange-500 border-orange-500'
            : 'border-border bg-background'
        }`}
      />
      <h3 className="font-semibold text-sm">{set.name}</h3>
    </div>
  </div>
  {/* ... duration info */}
</div>
```

5. **Long-press for drag mode** (uses SortableJS built-in `delay` option):
```javascript
// In SortableJS config
Sortable.create(drawerElement, {
  group: {
    name: 'setlist-songs',
    pull: 'clone',
    put: false,
  },
  handle: '.drag-handle',
  animation: 150,
  sort: false,
  delay: 500, // 500ms long-press to drag on mobile
  delayOnTouchOnly: true, // Only delay on touch, not desktop
  forceFallback: true,
});
```

**Acceptance Criteria:**
- Mobile: Tap song → added to active set instantly
- Mobile: Long press → drag mode activates
- Desktop: Click still works, drag is primary
- Visual feedback confirms addition
- Active set clearly indicated

---

### TASK-207: Filter Out Already-Added Songs
**Priority:** P1 - Reduces clutter
**Effort:** 4 hours

**Current Issue:**
- Playbook shows all songs always
- Already-added songs still appear
- Users confused about duplicates
- Can't easily see what's available vs already used

**Required Behavior:**
- **Default:** Hide songs already in any set
- **"Show All" checkbox:** Reveals all songs including duplicates
- **Visual indicator:** When "Show All" enabled, mark songs already added
- Edge case support: Can add same song multiple times when needed

**Implementation:**

1. **Track which songs are already in setlist**:
```javascript
const songsInSetlist = useMemo(() => {
  if (!setlist) return new Set<string>();

  const songIds = new Set<string>();
  setlist.sets.forEach(set => {
    set.songs.forEach(song => {
      songIds.add(song.song_id); // Use song_id (reference to playbook)
    });
  });

  return songIds;
}, [setlist]);
```

2. **Add "Show All" toggle state**:
```javascript
const [showAllSongs, setShowAllSongs] = useState(false);
```

3. **Filter playbook based on toggle**:
```javascript
const availablePlaybookSongs = useMemo(() => {
  let songs = playbookSongs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter out songs already in setlist unless "Show All" is enabled
  if (!showAllSongs) {
    songs = songs.filter(song => !songsInSetlist.has(song.id));
  }

  return songs;
}, [playbookSongs, searchQuery, showAllSongs, songsInSetlist]);
```

4. **Add toggle UI in drawer header**:
```jsx
<div className="bg-orange-500 text-white p-2">
  <div className="flex items-center justify-between mb-2">
    <div>
      <h3 className="font-semibold text-sm">Playbook</h3>
      <p className="text-xs opacity-90">
        {showAllSongs ? 'All songs' : 'Available songs'}
      </p>
    </div>
    <button
      onClick={() => setDrawerOpen(false)}
      className="lg:hidden text-white hover:bg-orange-600 p-2 rounded min-w-[44px] min-h-[44px]"
    >
      <i className="fas fa-times"></i>
    </button>
  </div>

  {/* Show All toggle */}
  <label className="flex items-center gap-2 text-sm cursor-pointer">
    <input
      type="checkbox"
      checked={showAllSongs}
      onChange={(e) => setShowAllSongs(e.target.checked)}
      className="w-4 h-4 rounded border-white"
    />
    <span>Show all songs</span>
  </label>
</div>
```

5. **Add visual indicator for already-added songs**:
```jsx
{groupedSongs.map(({ letter, songs }) => (
  <div key={letter}>
    <div className="sticky top-0 bg-orange-500 text-white px-2 py-1 text-xs font-bold z-10">
      {letter}
    </div>

    <div className="space-y-1 mb-2">
      {songs.map((song) => {
        const isAdded = songsInSetlist.has(song.id);

        return (
          <div
            key={song.id}
            data-song-id={song.id}
            className={`flex items-center gap-1 bg-background border rounded p-1 transition-colors ${
              isAdded
                ? 'opacity-50 border-muted-foreground/30'
                : 'border-border hover:border-orange-500/50 cursor-pointer lg:cursor-move'
            }`}
          >
            {/* Drag handle - disabled if already added */}
            {!isAdded && (
              <div className="drag-handle cursor-grab p-2 touch-none">
                <i className="fas fa-grip-vertical text-xs text-muted-foreground"></i>
              </div>
            )}

            {/* "In setlist" indicator */}
            {isAdded && (
              <div className="p-2 text-green-600">
                <i className="fas fa-check text-xs"></i>
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-sm">
                {song.title}
                {isAdded && showAllSongs && (
                  <span className="ml-2 text-xs text-green-600">(Added)</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{song.artist}</div>
            </div>

            <div className="text-xs text-muted-foreground whitespace-nowrap">
              {song.duration ? formatDuration(song.duration) : '--'}
            </div>
          </div>
        );
      })}
    </div>
  </div>
))}
```

**Acceptance Criteria:**
- Default: Only shows songs not yet in setlist
- Cleaner playbook, easier to see what's available
- "Show All" checkbox works
- When enabled, added songs show checkmark
- Can still add duplicates when "Show All" enabled
- Visual distinction clear

---

## Phase 3: Missing Features (Week 3)

### TASK-301: Add Set Management UI
**Priority:** P1 - Core functionality gap
**Effort:** 8 hours

**Current Issue:**
- Can't edit set name
- Can't edit target duration
- Can't add/remove sets
- Stuck with default 2x 60min sets

**Actions:**

1. **Add edit mode to set header**:
```jsx
<div className="bg-muted/30 p-2 border-b border-border">
  {editingSetId === set.id ? (
    <div className="space-y-2">
      <input
        type="text"
        value={tempSetName}
        onChange={(e) => setTempSetName(e.target.value)}
        className="w-full px-2 py-1 text-sm border rounded"
        placeholder="Set name"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs">Target (minutes):</label>
        <input
          type="number"
          value={tempTargetDuration / 60}
          onChange={(e) => setTempTargetDuration(parseInt(e.target.value) * 60)}
          className="w-20 px-2 py-1 text-sm border rounded"
        />
        <button
          onClick={() => handleSaveSetDetails(set.id)}
          className="text-green-500 hover:text-green-600 p-1"
        >
          <i className="fas fa-check"></i>
        </button>
        <button
          onClick={() => setEditingSetId(null)}
          className="text-red-500 hover:text-red-600 p-1"
        >
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  ) : (
    <>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{set.name}</h3>
          <button
            onClick={() => {
              setEditingSetId(set.id);
              setTempSetName(set.name);
              setTempTargetDuration(set.targetDuration);
            }}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <i className="fas fa-edit text-xs"></i>
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          {set.songs.length} songs
        </span>
      </div>
      {/* duration info */}
    </>
  )}
</div>
```

2. **Add "Add Set" button**:
```jsx
{/* After all sets */}
<button
  onClick={handleAddSet}
  className="w-full border-2 border-dashed border-border hover:border-orange-500 rounded p-4 text-muted-foreground hover:text-orange-500 transition-colors"
>
  <i className="fas fa-plus mr-2"></i>
  Add Set
</button>
```

3. **Add delete set button** (in set header menu):
```jsx
<button
  onClick={() => handleDeleteSet(set.id)}
  className="text-red-500 hover:text-red-600 p-1 ml-2"
  title="Delete set"
>
  <i className="fas fa-trash text-xs"></i>
</button>
```

4. **Implement handlers**:
```javascript
const handleAddSet = () => {
  if (!setlist) return;

  const newSet: SetlistSet = {
    id: uuidv4(),
    name: `Set ${setlist.sets.length + 1}`,
    targetDuration: 3600, // 60 minutes default
    songs: [],
  };

  updateSetlistMutation.mutate({
    sets: [...setlist.sets, newSet],
  });
};

const handleDeleteSet = async (setId: string) => {
  if (!setlist) return;

  const confirmed = await confirm({
    title: 'Delete Set',
    description: 'Are you sure? Songs in this set will be lost.',
    confirmText: 'Delete',
    variant: 'destructive',
  });

  if (confirmed) {
    updateSetlistMutation.mutate({
      sets: setlist.sets.filter(s => s.id !== setId),
    });
  }
};

const handleSaveSetDetails = (setId: string) => {
  if (!setlist) return;

  const updatedSets = setlist.sets.map(set => {
    if (set.id === setId) {
      return {
        ...set,
        name: tempSetName,
        targetDuration: tempTargetDuration,
      };
    }
    return set;
  });

  updateSetlistMutation.mutate({ sets: updatedSets });
  setEditingSetId(null);
};
```

**Acceptance Criteria:**
- Click edit icon → inline editor appears
- Change name and duration → click save → persists
- Click "Add Set" → new empty set appears
- Delete set → confirmation → set removed
- All changes save to database

---

### TASK-302: Add Empty State to Drop Zones
**Priority:** P2 - UX clarity
**Effort:** 2 hours

**Current Issue:**
- Empty sets just show blank space
- No indication they're drop zones
- Confusing for first-time users

**Actions:**

```jsx
<div id={`set-${set.id}`} className="p-1 min-h-[100px] space-y-1">
  {set.songs.length === 0 ? (
    <div className="flex items-center justify-center h-24 border-2 border-dashed border-border rounded text-muted-foreground text-sm">
      <div className="text-center">
        <i className="fas fa-music text-2xl mb-2 block"></i>
        Drag songs here
      </div>
    </div>
  ) : (
    set.songs.map((song, idx) => (
      {/* existing song card */}
    ))
  )}
</div>
```

**Acceptance Criteria:**
- Empty sets show placeholder text
- Dashed border indicates drop zone
- Disappears when first song added

---

### TASK-303: Fix Copy Operation Song IDs
**Priority:** P1 - Data integrity
**Effort:** 2 hours

**Current Issue:**
- Copied setlists reuse original song IDs
- Potential conflicts
- Songs in copies reference same ID

**Location:** [handler.js:195-199](C:\VSProjects\bndy-serverless-api\setlists-lambda\handler.js#L195-L199)

**BEFORE:**
```javascript
const copiedSets = original.Item.sets.map(set => ({
  ...set,
  id: uuidv4(),  // Set gets new ID
  // songs keep original IDs - PROBLEM
}));
```

**AFTER:**
```javascript
const copiedSets = original.Item.sets.map(set => ({
  ...set,
  id: uuidv4(),
  songs: set.songs.map(song => ({
    ...song,
    id: uuidv4(),  // Each song gets new ID too
  })),
}));
```

**Testing:**
1. Create setlist with songs
2. Copy setlist
3. Verify new setlist has different song IDs
4. Edit copy → original unchanged
5. Delete copy → original unchanged

**Acceptance Criteria:**
- Copied songs get new unique IDs
- No ID collisions
- Edits to copy don't affect original

---

### TASK-304: Implement Manual Save with Confirmation
**Priority:** P0 - User confidence
**Effort:** 4 hours

**Current Issue:**
- Auto-save exists but unreliable
- Users need explicit save confirmation
- No clear "saved" state

**Strategy:**
1. Keep auto-save for drafts (silent background save)
2. Add manual "Save" button for explicit confirmation
3. Show clear saved/unsaved state

**Actions:**

1. **Add dirty state tracking**:
```javascript
const [isDirty, setIsDirty] = useState(false);
const lastSavedRef = useRef<string>('');

useEffect(() => {
  if (setlist) {
    const currentState = JSON.stringify(setlist.sets);
    if (lastSavedRef.current && currentState !== lastSavedRef.current) {
      setIsDirty(true);
    }
  }
}, [setlist]);
```

2. **Update mutation to track saves**:
```javascript
onSuccess: (data) => {
  queryClient.setQueryData(
    ["https://api.bndy.co.uk/api/artists", artistId, "setlists", setlistId],
    data
  );

  lastSavedRef.current = JSON.stringify(data.sets);
  setIsDirty(false);

  toast({
    title: "Saved",
    description: "All changes saved successfully",
    duration: 2000,
  });
},
```

3. **Update Save button**:
```jsx
<button
  onClick={() => {
    if (setlist) {
      updateSetlistMutation.mutate({ sets: setlist.sets });
    }
  }}
  disabled={updateSetlistMutation.isPending || !isDirty}
  className={`px-4 py-2 rounded font-medium transition-colors ${
    isDirty
      ? 'bg-orange-500 hover:bg-orange-600 text-white'
      : 'bg-green-500 text-white cursor-default'
  }`}
>
  {updateSetlistMutation.isPending ? (
    <>
      <i className="fas fa-spinner fa-spin mr-2"></i>
      Saving...
    </>
  ) : isDirty ? (
    <>
      <i className="fas fa-save mr-2"></i>
      Save Changes
    </>
  ) : (
    <>
      <i className="fas fa-check mr-2"></i>
      Saved
    </>
  )}
</button>
```

4. **Add unsaved changes warning**:
```javascript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}, [isDirty]);
```

**Acceptance Criteria:**
- Make change → button shows "Save Changes" (orange)
- Click save → shows "Saving..." spinner
- Success → button shows "Saved" (green) for 2s
- Toast confirms save
- Try to leave page with unsaved changes → warning
- Refresh after save → changes persisted

---

## Phase 4: Polish & Performance (Week 4)

### TASK-401: Add Search/Filter to Playbook Drawer
**Priority:** P2 - UX enhancement
**Effort:** 2 hours

**Current:** Search box exists but could be better

**Enhancements:**
1. Focus search when drawer opens
2. Clear button in search box
3. Show result count
4. Highlight matching text

**Implementation:**
```jsx
<div className="p-2 border-b sticky top-0 bg-card z-10">
  <div className="relative">
    <i className="fas fa-search absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm"></i>
    <input
      ref={searchInputRef}
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search songs..."
      className="w-full pl-8 pr-8 py-2 text-sm border border-border bg-background rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
    />
    {searchQuery && (
      <button
        onClick={() => setSearchQuery('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <i className="fas fa-times text-sm"></i>
      </button>
    )}
  </div>
  {searchQuery && (
    <div className="text-xs text-muted-foreground mt-1">
      {filteredPlaybookSongs.length} results
    </div>
  )}
</div>
```

---

### TASK-402: Extract Shared Utilities
**Priority:** P2 - Code quality
**Effort:** 2 hours

**Create:** `client/src/lib/setlist-utils.ts`

```typescript
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getDurationVariance(actual: number, target: number): number {
  if (target === 0) return 0;
  return ((actual - target) / target) * 100;
}

export function getVarianceColor(variance: number): string {
  const absVariance = Math.abs(variance);
  if (absVariance <= 5) return 'text-blue-500';
  if (absVariance <= 20) return 'text-yellow-500';
  return 'text-red-500';
}

export function getSetTotalDuration(set: SetlistSet): number {
  if (!set.songs || set.songs.length === 0) return 0;
  return set.songs.reduce((total, song) => total + (song?.duration || 0), 0);
}

export function getSetlistTotalDuration(setlist: Setlist): number {
  return setlist.sets.reduce((total, set) => total + getSetTotalDuration(set), 0);
}

export function getSetlistTargetDuration(setlist: Setlist): number {
  return setlist.sets.reduce((total, set) => total + set.targetDuration, 0);
}
```

**Update imports in both files**:
```typescript
import {
  formatDuration,
  getDurationVariance,
  getVarianceColor,
  getSetTotalDuration,
  getSetlistTotalDuration,
  getSetlistTargetDuration,
} from '@/lib/setlist-utils';
```

---

### TASK-403: Add Loading States
**Priority:** P2 - UX polish
**Effort:** 3 hours

**Actions:**

1. **Dragging state indicator**:
```jsx
const [isDragging, setIsDragging] = useState(false);

// In Sortable config:
onStart: () => setIsDragging(true),
onEnd: (evt) => {
  setIsDragging(false);
  handleSongMove(evt, set.id);
},
```

2. **Visual feedback during drag**:
```jsx
{isDragging && (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-2 rounded shadow-lg z-50">
    <i className="fas fa-arrows-alt mr-2"></i>
    Drop to add song
  </div>
)}
```

3. **Mutation loading overlay**:
```jsx
{updateSetlistMutation.isPending && (
  <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
    <div className="bg-card rounded-lg shadow-xl p-6">
      <i className="fas fa-spinner fa-spin text-3xl text-orange-500 mb-2 block"></i>
      <p className="text-sm font-medium">Saving...</p>
    </div>
  </div>
)}
```

---

### TASK-404: Fix Tab Navigation
**Priority:** P2 - Navigation clarity
**Effort:** 2 hours

**Current Issue:**
- "Pipeline" tab doesn't go anywhere
- Just redirects to `/songs`
- No actual pipeline functionality

**Options:**

**Option A:** Remove Pipeline tab temporarily
```jsx
<div className="flex gap-2 border-b border-border">
  <button
    onClick={() => setLocation("/songs")}
    className="px-4 py-2 font-medium text-muted-foreground hover:text-foreground"
  >
    Playbook
  </button>
  <button
    onClick={() => setLocation("/setlists")}
    className="px-4 py-2 font-medium text-orange-500 border-b-2 border-orange-500"
  >
    Setlists
  </button>
  {/* Pipeline removed until implemented */}
</div>
```

**Option B:** Make Pipeline a tab within songs.tsx
- Keep all three tabs in songs.tsx
- Use state to switch views
- Implement basic pipeline view (songs in rehearsal)

**Recommendation:** Option A (remove until built)

---

## Testing Checklist

### Manual Testing Required

**Desktop (Chrome, Firefox, Safari):**
- [ ] Drag song from playbook to set
- [ ] Duration updates immediately
- [ ] Variance calculation shows correct color
- [ ] Song count updates
- [ ] Click Save → see toast confirmation
- [ ] Refresh page → changes persisted
- [ ] Drag to reorder within set
- [ ] Drag between sets
- [ ] Remove song
- [ ] Toggle segue
- [ ] Edit setlist name
- [ ] Edit set name
- [ ] Edit set target duration
- [ ] Add new set
- [ ] Delete set
- [ ] Copy setlist
- [ ] Delete setlist
- [ ] Search playbook

**Mobile (iOS Safari, Android Chrome):**
- [ ] Open playbook → 50/50 split
- [ ] Both panes visible
- [ ] Drag from right to left
- [ ] Touch targets easy to tap
- [ ] Drawer close button works
- [ ] All desktop features work
- [ ] No horizontal scroll
- [ ] Text readable
- [ ] No overlap/clipping

**Edge Cases:**
- [ ] Empty setlist (no sets)
- [ ] Empty set (no songs)
- [ ] Very long setlist (20+ songs per set)
- [ ] Very long song titles
- [ ] Network offline during save
- [ ] Concurrent edits (two users)
- [ ] Copy setlist with 0 songs
- [ ] Delete last set

---

## Known Limitations & Future Enhancements

### Not Included in This Plan:
1. Reorder sets (drag sets up/down)
2. Bulk operations (select multiple songs, move together)
3. Print-friendly view
4. Share/export setlist
5. Version history / undo
6. Keyboard shortcuts
7. Song preview/play
8. Integration with actual gigs
9. Setlist templates
10. Collaborative editing indicators

### Technical Debt to Address Later:
1. API URL configuration (hardcoded)
2. Error boundaries around editor
3. Offline support / service worker
4. Debouncing auto-save
5. WebSocket for real-time collaboration
6. Accessibility audit (ARIA labels, keyboard nav)
7. Unit tests for utilities
8. E2E tests for critical flows

---

## Rollout Plan

### Phase 1 (Week 1): Emergency Fixes
**Goal:** Make it work at all
- Deploy TASK-101 through TASK-105
- Test thoroughly on staging
- Fix any breaking issues
- Deploy to production

**Success Criteria:**
- Duration calculations work
- Saves persist to database
- Drag-and-drop reliable on desktop

### Phase 2 (Week 2): Mobile UX
**Goal:** Make it usable on mobile
- Deploy TASK-201 through TASK-204
- Test on real devices
- Gather user feedback

**Success Criteria:**
- Mobile users can edit setlists
- 50/50 layout works well
- No major complaints

### Phase 3 (Week 3): Feature Completion
**Goal:** Add missing functionality
- Deploy TASK-301 through TASK-304
- Update documentation
- Train users on new features

**Success Criteria:**
- Users can manage sets fully
- Save confirmation clear
- Feature parity with expectations

### Phase 4 (Week 4): Polish
**Goal:** Make it delightful
- Deploy TASK-401 through TASK-404
- Performance optimization
- Final bug fixes

**Success Criteria:**
- Fast and smooth
- No console errors
- Users love it

---

## Risk Mitigation

### Risk: Saves still don't work after fixes
**Mitigation:**
- Add extensive logging to mutation flow
- Check DynamoDB permissions
- Verify Lambda execution role
- Test with Postman/curl directly

### Risk: SortableJS still breaks on some browsers
**Mitigation:**
- Test across browsers early
- Have fallback: manual up/down buttons
- Consider alternative library (dnd-kit)

### Risk: 50/50 split doesn't work on all mobile devices
**Mitigation:**
- Test on real devices (not just Chrome DevTools)
- Have breakpoint adjustments ready
- Allow users to toggle layout preference

### Risk: Performance degrades with large setlists
**Mitigation:**
- Test with 50+ song setlists
- Add virtualization if needed
- Lazy load playbook songs

---

## Questions for Clarification

Before starting implementation, please confirm:

1. **Duration calculations:** You mentioned they "never worked" - should I prioritize fixing the calculation logic, or is the issue that songs don't have durations at all when added?

2. **Save functionality:** When you click Save, do you see:
   - Network request in DevTools? (Check Network tab)
   - Any errors in Console?
   - HTTP 200 response?
   - Changes in DynamoDB table (check AWS Console)?

3. **Mobile click-to-add behavior:**
   - When user taps a song on mobile, which set should it be added to if there are multiple sets?
   - Option A: Always first set
   - Option B: Last edited/active set (user selects with radio button)
   - Option C: Prompt user each time
   - **Recommendation: Option B** (active set with radio button selector)

4. **Target duration editing:**
   - Should it be in minutes (more user-friendly) or seconds?
   - Default for new sets still 60 minutes?

5. **Set reordering:**
   - Is this needed in Phase 3, or can it wait?
   - Should sets be draggable like songs?

6. **Pipeline tab:**
   - Should I remove it entirely, or leave as placeholder?
   - Any vision for what Pipeline should be?

7. **Auto-save behavior:**
   - Keep it but also have manual save?
   - Or disable auto-save, manual only?
   - How long should auto-save delay be? (currently immediate on drag)

8. **Mobile testing:**
   - What devices do you test on?
   - Any specific browser/OS combos to prioritize?

9. **Deployment:**
   - Should I deploy Lambda changes, or will you handle that?
   - Any staging environment for testing before prod?

10. **Backwards compatibility:**
    - Are there existing setlists in production with data?
    - Do I need migration script for any schema changes?

---

## Estimated Timeline

**Week 1 (Emergency Fixes):**
- TASK-101: 2 hours
- TASK-102: 4 hours
- TASK-103: 6 hours
- TASK-104: 8 hours
- TASK-105: 0.5 hours
- **Total: ~20 hours (3-4 days)**

**Week 2 (Mobile UX):**
- TASK-201: 12 hours
- TASK-202: 4 hours
- TASK-203: 3 hours
- TASK-204: 2 hours
- TASK-205: 4 hours (Alphabetical grouping)
- TASK-206: 6 hours (Click-to-add on mobile)
- TASK-207: 4 hours (Filter added songs)
- **Total: ~35 hours (5-7 days)**

**Week 3 (Features):**
- TASK-301: 8 hours
- TASK-302: 2 hours
- TASK-303: 2 hours
- TASK-304: 4 hours
- **Total: ~16 hours (2-3 days)**

**Week 4 (Polish):**
- TASK-401: 2 hours
- TASK-402: 2 hours
- TASK-403: 3 hours
- TASK-404: 2 hours
- **Total: ~9 hours (1-2 days)**

**Grand Total: ~80 hours (12-16 working days)**

With testing, deployment, and bug fixes: **4-5 weeks total**

Note: New features (alphabetical grouping, click-to-add, filter added songs) add ~14 hours to Phase 2.

---

## Success Metrics

After all phases complete, we should see:

**Functional:**
- [ ] 100% of drag operations succeed
- [ ] 100% of saves persist to database
- [ ] Duration calculations accurate on all setlists
- [ ] Zero console errors in production

**UX:**
- [ ] Mobile users can complete all tasks
- [ ] Desktop drag-and-drop feels smooth
- [ ] Users understand when changes are saved
- [ ] No reported usability issues

**Performance:**
- [ ] Page loads in < 2 seconds
- [ ] Drag operations feel instant
- [ ] Save operations complete in < 1 second
- [ ] No janky animations

**Code Quality:**
- [ ] No duplicate code
- [ ] All TypeScript types defined
- [ ] No console.logs in production
- [ ] Shared utilities extracted

---

Ready to proceed? Please answer the clarification questions above and I'll start with Phase 1 implementation.
