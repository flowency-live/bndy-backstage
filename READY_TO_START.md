# Admin Refactor - READY TO START! 🚀

**Status:** All prerequisites complete
**Investigation:** 100% done
**Documentation:** Complete
**Timeline:** 5-7 days

---

## Investigation Complete ✅

### Backend Infrastructure
- ✅ 14 Lambda functions inventoried
- ✅ Artist settings endpoint confirmed (PUT /api/artists/:id)
- ✅ 6 social platforms confirmed (not 3!)
- ✅ UK spelling `displayColour` confirmed
- ✅ Member management endpoints confirmed
- ✅ Invite system confirmed (7 day expiry)
- ✅ Spotify search endpoint confirmed

### Frontend Components
- ✅ LocationAutocomplete API confirmed (provides lat/lng)
- ✅ ImageUpload API confirmed (full S3 flow)
- ✅ GenreSelector API confirmed (multi-select)
- ✅ All components production-ready (no modifications needed)

### Critical Discovery
- ❌ **Recurring events DON'T WORK** - Frontend UI exists but backend ignores it
- ✅ Documented in [AWS_INFRASTRUCTURE_FINDINGS.md](AWS_INFRASTRUCTURE_FINDINGS.md)

---

## Documentation Created

1. **[AWS_INFRASTRUCTURE_FINDINGS.md](AWS_INFRASTRUCTURE_FINDINGS.md)**
   - Complete Lambda inventory
   - Backend API structure
   - Event system analysis
   - Recurring events discovery

2. **[ADMIN_REFACTOR_PLAN.md](ADMIN_REFACTOR_PLAN.md)**
   - 7-day implementation timeline
   - 24 files, avg 87 LOC each
   - Complete component specifications
   - Testing checklist
   - Risk mitigation strategies

3. **[COMPONENT_API_DOCUMENTATION.md](COMPONENT_API_DOCUMENTATION.md)**
   - LocationAutocomplete props + usage
   - ImageUpload props + S3 flow
   - GenreSelector props + categories
   - Backend endpoint confirmations

4. **[REFACTOR_PRD.md](REFACTOR_PRD.md)** (Updated)
   - Calendar refactor spec (for later)
   - Admin refactor spec
   - Migration strategy

---

## What We're Building

### Current State
**File:** `pages/admin.tsx` (1,185 LOC) ⚠️
- 3 tabs: Artist Settings, Members, Spotify
- Monolithic component
- Multiple TypeScript errors
- Difficult to maintain

### Target State
**Folder:** `pages/admin/` (24 files, avg 87 LOC)
```
admin/
├── index.tsx (120 LOC) - Tab shell
├── AdminContext.tsx (80 LOC) - Shared state
│
├── ArtistSettingsTab/
│   ├── index.tsx (100 LOC)
│   ├── ArtistSettingsForm.tsx (150 LOC)
│   ├── components/ (6 sections)
│   └── hooks/useArtistSettings.ts (150 LOC)
│
├── MembersTab/
│   ├── index.tsx (100 LOC)
│   ├── components/ (3 components)
│   └── hooks/ (2 hooks)
│
└── SpotifyTab/
    ├── index.tsx (100 LOC)
    ├── components/ (3 components)
    └── hooks/useSpotify.ts (200 LOC)
```

---

## Confirmed Backend Structure

### Artist Settings Payload
```typescript
PUT /api/artists/:id
{
  // Core fields
  name: string,
  bio: string,
  location: string,
  locationLat: number | null,      // From LocationAutocomplete
  locationLng: number | null,      // From LocationAutocomplete

  // Visual
  profileImageUrl: string,         // From ImageUpload (S3 URL)
  displayColour: string,           // UK spelling! '#f97316' default

  // Metadata
  genres: string[],                // From GenreSelector

  // Social media (all nullable)
  facebookUrl: string | null,
  instagramUrl: string | null,
  websiteUrl: string | null,
  youtubeUrl: string | null,       // ✅ Confirmed (not just 3!)
  spotifyUrl: string | null,       // ✅ Confirmed
  twitterUrl: string | null        // ✅ Confirmed
}
```

---

## 7-Day Timeline

### Day 1: Setup (2-3 hours)
- [ ] Create `pages/admin/` folder structure
- [ ] Create all subdirectories
- [ ] Create empty files with TypeScript interfaces
- [ ] Create AdminContext.tsx shell

### Day 2: Artist Settings Hook (4-5 hours)
- [ ] Build `useArtistSettings.ts` hook
  - Form state management (12 fields)
  - Save mutation
  - Dirty state tracking
  - Validation
- [ ] Create `AvatarUploadSection.tsx` (wrap ImageUpload)
- [ ] Create `BasicInfoSection.tsx` (name + bio)

### Day 3: Artist Settings Sections (5-6 hours)
- [ ] Create `LocationSection.tsx` (wrap LocationAutocomplete)
- [ ] Create `ColorPickerSection.tsx` (12 presets)
- [ ] Create `GenresSection.tsx` (wrap GenreSelector)
- [ ] Create `SocialLinksSection.tsx` (all 6 platforms!)

### Day 4: Artist Settings Integration (4-5 hours)
- [ ] Create `ArtistSettingsForm.tsx` (orchestrator)
- [ ] Create `ArtistSettingsTab/index.tsx`
- [ ] Wire up all sections
- [ ] Test save mutation
- [ ] Verify all 6 social links save

### Day 5: Members Tab (5-6 hours)
- [ ] Create `useMembers.ts` + `useInvites.ts` hooks
- [ ] Create `MembersList.tsx`
- [ ] Create `InviteSection.tsx` (general + phone)
- [ ] Move `ActiveInvitesList.tsx`
- [ ] Create `MembersTab/index.tsx`

### Day 6: Spotify Tab (4-5 hours)
- [ ] Create `useSpotify.ts` hook
- [ ] Create `SpotifyConnectionButton.tsx`
- [ ] Create `SpotifyUserProfile.tsx`
- [ ] Create `PlaylistManager.tsx`
- [ ] Create `SpotifyTab/index.tsx`

### Day 7: Integration + Testing (5-6 hours)
- [ ] Create `admin/index.tsx` (tab shell)
- [ ] Wire up AdminContext
- [ ] Update dashboard.tsx
- [ ] Test all tabs
- [ ] Fix TypeScript errors
- [ ] Delete old `pages/admin.tsx`

**Total:** ~30-36 hours (5-7 days at 6 hours/day)

---

## Success Criteria

- ✅ All components < 200 LOC
- ✅ No TypeScript errors
- ✅ All 6 social links work
- ✅ UK spelling `displayColour` used correctly
- ✅ Location lat/lng saves correctly
- ✅ Avatar upload works (S3)
- ✅ Genres save as array
- ✅ Member removal works
- ✅ Invites generate (7 day expiry)
- ✅ Spotify search works

---

## No Open Questions! 🎉

All components APIs confirmed:
- ✅ LocationAutocomplete provides lat/lng
- ✅ ImageUpload handles full S3 flow
- ✅ GenreSelector uses categories
- ✅ Backend endpoints confirmed
- ✅ Invite expiry = 7 days
- ✅ 6 social platforms (not 3!)

---

## Next Steps

**Option A: Start Immediately**
```bash
cd C:/VSProjects/bndy-backstage
mkdir -p client/src/pages/admin/ArtistSettingsTab/components
mkdir -p client/src/pages/admin/ArtistSettingsTab/hooks
mkdir -p client/src/pages/admin/MembersTab/components
mkdir -p client/src/pages/admin/MembersTab/hooks
mkdir -p client/src/pages/admin/SpotifyTab/components
mkdir -p client/src/pages/admin/SpotifyTab/hooks
```

**Option B: Create Feature Branch First**
```bash
git checkout -b refactor/admin-page-architecture
git push -u origin refactor/admin-page-architecture
```

**Option C: Review Documents First**
- [ADMIN_REFACTOR_PLAN.md](ADMIN_REFACTOR_PLAN.md) - Complete implementation plan
- [COMPONENT_API_DOCUMENTATION.md](COMPONENT_API_DOCUMENTATION.md) - Component APIs
- [AWS_INFRASTRUCTURE_FINDINGS.md](AWS_INFRASTRUCTURE_FINDINGS.md) - Backend structure

---

## Would You Like Me To:

1. **Start Day 1** - Create folder structure + AdminContext?
2. **Start Day 2** - Build useArtistSettings hook?
3. **Create git branch** - Set up feature branch first?
4. **Review plan** - Make any adjustments before starting?

**Everything is documented and ready. Just say the word!** 🚀
