# Setlist Remediation - Quick Start Guide

## What You Asked For

I've created a comprehensive remediation plan covering:

### Critical Bugs (Phase 1 - Week 1)
1. **Duration calculations never work** - Sets always show 0:00
2. **Save button does nothing** - Changes don't persist
3. **Drag-and-drop unreliable** - Text selection interferes, hit-or-miss
4. **Mobile completely unusable** - Drawer blocks screen, can't see destination

### New Features (Phase 2 - Week 2)
5. **Alphabetical grouping** - Songs grouped by first letter with sticky headers
6. **Click-to-add on mobile** - Tap to add, long-press to drag
7. **Hide added songs** - "Show All" checkbox to reveal duplicates
8. **50/50 mobile layout** - Based on reference HTML, both panes visible

### Additional Features (Phase 3-4)
9. Set management (edit name, duration, add/remove sets)
10. Manual save with clear confirmation
11. Empty state placeholders
12. Polish and performance

---

## Documents Created

1. **[SetlistRemediation.md](SetlistRemediation.md)** - Full 80-hour implementation plan with:
   - Detailed bug analysis and root causes
   - Step-by-step implementation for each task
   - Code examples and acceptance criteria
   - Testing checklist
   - Timeline estimates

2. **This file** - Quick reference for next steps

---

## Critical Questions (Need Answers Before Starting)

### Q1: Duration Calculation Bug Details
When you drag a song from playbook to a set:

**A)** Does the song appear in the set but shows 0:00 duration?
**B)** Does the song not appear at all until you refresh?
**C)** Song appears, has duration, but set total doesn't update?

**Why this matters:** Tells me if it's a data transformation issue (A/C) or React state issue (B).

---

### Q2: Save Failure Debugging
Can you do this real quick:

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Click "Save" button on setlist editor
4. Tell me:
   - Do you see a PUT request to `/api/artists/.../setlists/...`?
   - What's the HTTP status? (200, 400, 404, 500?)
   - Click the request → Response tab → what does it say?

**Why this matters:** Tells me if problem is frontend (no request), backend (error response), or cache (200 but not persisting).

---

### Q3: Mobile Click-to-Add Behavior
When you tap a song on mobile and there are multiple sets:

**Option A:** Always adds to Set 1
**Option B:** Adds to "active set" (user selects with radio button in set header)
**Option C:** Prompt which set every time

**My recommendation:** Option B - show small radio button in each set header (mobile only) to select which is "active". Tap song → adds to active set.

**Your preference?**

---

### Q4: Reference HTML Layout
I read `C:\VSProjects\rewiredband_website\index.html` and see the key is:

- Simple fixed drawer, slides in from right
- Width `60%` on mobile, `max-width: 240px`
- NO backdrop blocking interaction
- Both panes visible when drawer open

Is this the exact behavior you want? Or any differences?

---

### Q5: Testing Devices
What device(s) do you test on?
- iPhone (which model/iOS version?)
- Android (which phone?)
- Both?

This helps me prioritize browser compatibility testing.

---

## Recommended Implementation Order

Based on your feedback, here's what I suggest:

### **Option A: Fix Critical Bugs First (Safest)**
1. Start with Phase 1 emergency fixes (TASK-101 to TASK-105)
2. Get saves working and duration calculations fixed
3. Then tackle mobile UX and new features

**Pros:** Establishes stable foundation, each feature builds on last
**Cons:** Mobile UX remains broken for ~1 week

### **Option B: Mobile UX First (User-Focused)**
1. Jump straight to 50/50 layout, click-to-add, alphabetical grouping
2. Fix critical bugs as we encounter them
3. Polish later

**Pros:** Users can actually use mobile immediately
**Cons:** Building on shaky foundation, may need rework

### **Option C: Hybrid Approach (Balanced)**
1. TASK-101 (Fix types) - 2 hours
2. TASK-104 (Fix drag-drop) - 8 hours
3. TASK-201-207 (All mobile UX) - 35 hours
4. TASK-102-103 (Fix duration & save) - 10 hours
5. Rest of features

**Pros:** Mobile usable quickly, foundation stable enough
**Cons:** Duration/save bugs remain for ~2 days

**My recommendation: Option C** - Get drag-drop working, then focus on mobile UX.

---

## What I Need From You

### **To start implementation TODAY:**

1. **Answer Q1-Q5 above** (5 minutes)

2. **Choose implementation order** (Option A/B/C)

3. **Grant permission to:**
   - Create `client/src/types/setlist.ts`
   - Modify `setlists.tsx` and `setlist-editor.tsx`
   - Update Lambda `setlists-lambda/handler.js` if needed
   - Deploy changes to staging/production

4. **Provide access to:**
   - AWS Console (to check DynamoDB writes)
   - CloudWatch logs (to debug Lambda failures)
   - Staging environment (if exists)

### **Optional (helps with debugging):**

5. **Share screenshots:**
   - Current setlist editor on mobile (with drawer open)
   - Network tab when save fails
   - Console errors if any

6. **Share example data:**
   - Sample setlist ID I can test with
   - Artist ID for testing

---

## Time Commitment

### Phase 1 (Critical Bugs)
- **Development:** ~20 hours
- **Testing/Fixes:** ~5 hours
- **Total:** ~25 hours (3-4 days)

### Phase 2 (Mobile UX + New Features)
- **Development:** ~35 hours
- **Testing/Fixes:** ~8 hours
- **Total:** ~43 hours (5-7 days)

### Phases 3-4 (Additional Features + Polish)
- **Development:** ~25 hours
- **Testing/Fixes:** ~5 hours
- **Total:** ~30 hours (4-5 days)

### **Grand Total: ~100 hours (12-16 working days) over 4-5 weeks**

---

## Next Steps

**Once you answer the questions above, I will:**

1. Confirm the implementation approach
2. Start with TASK-101 (type definitions)
3. Provide progress updates after each task
4. Request testing/feedback at key milestones
5. Deploy changes incrementally (not all at once)

**I'll work in branches and create PRs for review, OR work directly in main and commit incrementally - your preference?**

---

## Quick Wins (Can Do Right Now)

If you want to see immediate progress while we discuss the plan, I can:

1. **Fix type definitions** (30 min) - No risk, pure cleanup
2. **Add console logging** (15 min) - Help us debug duration/save issues
3. **Remove production console.logs** (15 min) - Code quality
4. **Add drag handle icon** (30 min) - Improve drag reliability slightly

These don't require answers to the questions and won't break anything.

**Want me to start with these quick wins?**

---

## Summary

- **Full plan:** [SetlistRemediation.md](SetlistRemediation.md)
- **Estimated time:** 4-5 weeks (80-100 hours)
- **Top priority:** Answer Q1-Q5 above
- **Ready to start:** As soon as you give the word

Let me know how you want to proceed!
