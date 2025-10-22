# Godmode Refactor Plan

## Current State
- **File**: `client/src/pages/godmode/index.tsx` (1,244 lines)
- **Structure**: Single component with 4 tabs (Venues, Artists, Songs, Users)
- **Problem**: Bloated, hard to maintain, difficult to extend

## Proposed New Structure

```
/pages/godmode/
├── GodmodeLayout.tsx          ✅ CREATED - Sidebar navigation layout
├── Dashboard.tsx              ✅ CREATED - Overview page with stats
├── index.tsx                  ⚠️  KEEP AS REDIRECT (see below)
├── venues/
│   ├── index.tsx              📝 TODO - Venues list page
│   └── enrichment.tsx         📝 TODO - HITL enrichment review
├── artists/
│   └── index.tsx              📝 TODO - Artists list page
├── songs/
│   └── index.tsx              📝 TODO - Songs list page
├── users/
│   └── index.tsx              📝 TODO - Users list page
├── events/
│   └── index.tsx              📝 TODO - Move from /agentevents
└── components/
    ├── VenueEditModal.tsx     ✅ EXISTS - Move here
    ├── ArtistEditModal.tsx    ✅ EXISTS - Move here
    └── EnrichmentReviewCard.tsx 📝 TODO - New component