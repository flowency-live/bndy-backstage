# Enrichment Approval Screen Spec

## Context

The bndy-enrichment engine discovers gigs and enriches artist/venue profiles via Gemini + Google Search. Results are written to DynamoDB with `enrichment_status: 'needs_review'` for human approval before promoting to live profile data.

The current `godmode/venues/enrichment.tsx` page is not fit for purpose:
- Can't effectively see what's pending
- Hard to process approvals/rejections at scale
- No unified view across artists AND venues
- No visibility into discovered events
- No metrics or confidence tuning feedback

---

## Requirements

### 1. Unified Enrichment Dashboard

Create `godmode/enrichment/index.tsx` as a unified dashboard with three tabs:

| Tab | Content |
|-----|---------|
| **Entities** | Artists + Venues pending profile enrichment approval |
| **Events** | Discovered gigs pending approval/creation |
| **Metrics** | Approval rates, confidence accuracy, cost tracking |

### 2. Entity Enrichment Queue (Artists + Venues)

#### Data Source

Query both `bndy-artists` and `bndy-venues` for records where:
```
enrichment_status = 'needs_review'
enrichment_data IS NOT NULL
```

#### Display Columns (DataTable)

| Column | Description |
|--------|-------------|
| Type | `Artist` or `Venue` badge |
| Name | Entity name, clickable to expand |
| Town | Location |
| Confidence | `HIGH` / `MEDIUM` / `LOW` badge with color coding |
| Suggested | Icons showing what was found (FB, Website, Bio) |
| Source | `bndy-enrichment` / `venue-enrichment-lambda` |
| Date | When enrichment ran |
| Actions | Accept / Reject / Edit buttons |

#### Expanded Row Detail

When a row is clicked/expanded, show:

```
┌─────────────────────────────────────────────────────────────────┐
│ [Artist] Ultimate Green Day                                      │
│ Stoke-on-Trent                                                   │
├─────────────────────────────────────────────────────────────────┤
│ CURRENT VALUES              │  SUGGESTED VALUES                  │
│ ─────────────────────────── │ ──────────────────────────────────│
│ Facebook: (none)            │  facebook.com/Greendaytributeuk   │
│ Website: (none)             │  ultimategreenday.site123.me      │
│ Bio: (none)                 │  "Ultimate Green Day is more..."  │
├─────────────────────────────────────────────────────────────────┤
│ AI Notes: "Found via official website and Facebook page match"  │
│ Evidence: [link1] [link2] [link3]                               │
├─────────────────────────────────────────────────────────────────┤
│ [Accept All]  [Accept Selected]  [Edit & Save]  [Reject]        │
└─────────────────────────────────────────────────────────────────┘
```

#### Actions

- **Accept All**: Promote all suggested values to live profile
- **Accept Selected**: Checkboxes for individual fields (FB, Website, Bio)
- **Edit & Save**: Inline edit suggested values before accepting
- **Reject**: Mark as rejected, clear enrichment_data

#### Bulk Actions

Top toolbar with:
- Select all visible
- Bulk Accept (for high-confidence only)
- Bulk Reject
- Filter by: Type, Confidence, Source, Date range

---

### 3. Event Discovery Queue

#### Data Source

Query `BndyEnrichmentStack-StateTable` for records where:
```
pk BEGINS_WITH 'ENTITY#'
sk BEGINS_WITH 'RUN#'
```

Extract `events[]` array from each run, show events not yet in `bndy-events`.

#### Display

| Column | Description |
|--------|-------------|
| Artist | Artist name (link to existing or new) |
| Venue | Venue name (link to existing or new) |
| Date | Event date |
| Time | Start time if known |
| Confidence | Event confidence score |
| Tickets | Found / Not Found / Price if known |
| Source URLs | Links to evidence |
| Actions | Create Event / Link to Existing / Reject |

#### Create Event Flow

1. Click "Create Event"
2. Modal shows pre-filled event form:
   - Artist: dropdown to match existing or create new
   - Venue: dropdown to match existing or create new
   - Date/Time: pre-filled
   - Ticket URL: pre-filled if found
3. On save: creates event in `bndy-events`, marks as processed

#### Discovered Entities

When an event references an artist/venue not in bndy:
- Show "New Artist" / "New Venue" badge
- "Create & Link" button to create the entity first
- Pre-fill from `discoveredEntities[]` enrichment data

---

### 4. Metrics Tab

#### Approval Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│ ENTITY ENRICHMENT (Last 30 days)                                │
├─────────────────────────────────────────────────────────────────┤
│                    Artists    Venues    Total                   │
│ Processed:            42        67       109                    │
│ Accepted:             38        61        99  (91%)             │
│ Rejected:              4         6        10  (9%)              │
├─────────────────────────────────────────────────────────────────┤
│ BY CONFIDENCE:                                                  │
│ HIGH:    45 processed, 44 accepted (98% accuracy)               │
│ MEDIUM:  52 processed, 47 accepted (90% accuracy)               │
│ LOW:     12 processed,  8 accepted (67% accuracy)               │
├─────────────────────────────────────────────────────────────────┤
│ RECOMMENDATION: Enable auto-accept for HIGH confidence          │
│ (Currently at 98% accuracy, threshold is 99%)                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Event Discovery Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│ EVENT DISCOVERY (Last 30 days)                                  │
├─────────────────────────────────────────────────────────────────┤
│ Entities searched:        20                                    │
│ Events discovered:        47                                    │
│ Events created:           31                                    │
│ Events rejected:           8                                    │
│ Events pending:            8                                    │
│ New artists created:       4                                    │
│ New venues created:        2                                    │
├─────────────────────────────────────────────────────────────────┤
│ Search cost:              $2.34 (avg $0.12/entity)              │
│ Cost per verified gig:    $0.08                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5. API Requirements

#### New endpoints needed in bndy-serverless-api

**Artists:**
```
GET  /godmode/artists/enrichment-queue
     Returns artists with enrichment_status = 'needs_review'

PATCH /godmode/artists/:id/enrichment
      Body: { action: 'accept' | 'reject', fields?: ['facebookUrl', 'websiteUrl', 'bio'] }
      Promotes selected fields from enrichment_data to profile
```

**Venues:**
```
GET  /godmode/venues/enrichment-queue
     Returns venues with enrichment_status = 'needs_review'

PATCH /godmode/venues/:id/enrichment
      Body: { action: 'accept' | 'reject', fields?: ['website', 'social_media_urls'] }
```

#### Schema additions to artists

Add to `bndy-artists` table (matching existing venue fields):
```
enrichment_status: 'needs_review' | 'high_confidence' | 'reviewed' | 'rejected'
enrichment_date: ISO timestamp
enrichment_source: 'bndy-enrichment' | 'manual'
enrichment_data: {
  suggested_facebookUrl: string | null,
  suggested_websiteUrl: string | null,
  suggested_bio: string | null,
  confidence: 'HIGH' | 'MEDIUM' | 'LOW',
  notes: string,
  evidenceUrls: string[],
  date: ISO timestamp
}
```

---

### 6. UI/UX Requirements

- Use existing shadcn/ui components (DataTable, Card, Badge, Button, Dialog)
- Follow existing godmode styling patterns
- Keyboard shortcuts: `a` = accept, `r` = reject, `e` = edit, `j/k` = navigate
- Toast notifications for actions
- Optimistic updates with rollback on error

---

### 7. File Structure

```
client/src/pages/godmode/enrichment/
├── index.tsx              # Main dashboard with tabs
├── EntityQueue.tsx        # Artists + Venues enrichment queue
├── EventQueue.tsx         # Discovered events queue
├── Metrics.tsx            # Approval metrics and tuning
└── components/
    ├── EntityCard.tsx     # Expanded entity detail view
    ├── EventCard.tsx      # Expanded event detail view
    └── ConfidenceBadge.tsx
```

---

## Implementation Order

1. Add enrichment fields to artists-lambda schema
2. Add `/godmode/artists/enrichment-queue` endpoint
3. Create unified `godmode/enrichment/index.tsx` with EntityQueue
4. Add EventQueue tab
5. Add Metrics tab
6. Wire up bulk actions
