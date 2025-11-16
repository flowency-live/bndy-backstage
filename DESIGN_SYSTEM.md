# BNDY Backstage Design System

**Version:** 1.0.0
**Last Updated:** 2025-01-15

This document defines the design standards for BNDY Backstage to ensure UI consistency across all pages and components.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Container Widths](#container-widths)
3. [Spacing System](#spacing-system)
4. [Typography](#typography)
5. [Component Sizes](#component-sizes)
6. [Card Patterns](#card-patterns)
7. [Modal Patterns](#modal-patterns)
8. [Form Patterns](#form-patterns)
9. [When to Use What](#when-to-use-what)

---

## Design Tokens

All design tokens are centralized in `client/src/lib/design-tokens.ts`.

**Import and use:**
```typescript
import { TYPOGRAPHY, SPACING, CONTAINERS } from '@/lib/design-tokens';

// Use in components
<h1 className={TYPOGRAPHY.h1}>Page Title</h1>
<div className={CONTAINERS.default}>Content</div>
```

---

## Container Widths

Use standardized container widths for consistency.

### Standards

| Width | Tailwind Class | Size | Usage |
|-------|---------------|------|-------|
| **Narrow** | `max-w-2xl` | 672px | Modals, centered forms |
| **Default** | `max-w-4xl` | 896px | Most content pages |
| **Wide** | `max-w-6xl` | 1152px | Special cases only |
| **Full** | `max-w-full` | 100% | Very rare |

### Mobile-First Approach

- **Mobile:** Edge-to-edge content (no max-width constraint)
- **Desktop:** Centered with max-width for readability

### Examples

```tsx
// Standard page layout
<PageContainer variant="default">
  {/* Content */}
</PageContainer>

// Modal/form layout
<PageContainer variant="narrow">
  {/* Form */}
</PageContainer>
```

### Guidelines

- **Default to `max-w-4xl`** for content pages (Gigs, Songs, Setlists, etc.)
- Use `max-w-6xl` **only** with justification (e.g., multi-column layouts)
- Forms and modals should use `max-w-2xl` or narrower

---

## Spacing System

Based on 4px increments for mathematical precision.

### Scale

| Token | Value | Pixels | Usage |
|-------|-------|--------|-------|
| 1 | 0.25rem | 4px | Tight spacing |
| 2 | 0.5rem | 8px | Compact spacing |
| 3 | 0.75rem | 12px | Default gaps |
| 4 | 1rem | 16px | Standard spacing |
| 6 | 1.5rem | 24px | Section spacing |
| 8 | 2rem | 32px | Large spacing |
| 12 | 3rem | 48px | Extra large spacing |

### Common Patterns

```tsx
// Gap between elements (flex/grid)
gap-2    // 8px  - Tight
gap-3    // 12px - Normal
gap-4    // 16px - Relaxed

// Vertical spacing (stacked elements)
space-y-2  // 8px  - Compact lists
space-y-4  // 16px - Form fields
space-y-6  // 24px - Sections

// Padding
p-4   // 16px - Compact cards
p-6   // 24px - Standard cards
p-12  // 48px - Empty states
```

### Utility Classes

```css
.section-spacing  /* space-y-6 - Sections */
.field-spacing    /* space-y-4 - Form fields */
.tight-spacing    /* space-y-2 - Compact lists */
```

---

## Typography

### Hierarchy

| Level | Tailwind Classes | Usage | Example |
|-------|-----------------|-------|---------|
| **Display** | `text-3xl sm:text-4xl font-bold` | Page titles (rare) | Artist page hero |
| **H1** | `text-2xl sm:text-3xl font-bold` | Main section titles | "Calendar & Gigs" |
| **H2** | `text-xl sm:text-2xl font-semibold` | Subsection titles | "Upcoming Events" |
| **H3** | `text-lg sm:text-xl font-semibold` | Card titles | Setlist name |
| **Body** | `text-sm sm:text-base` | Standard text | Descriptions |
| **Small** | `text-xs sm:text-sm` | Metadata | Timestamps |
| **Tiny** | `text-xs` | Badges, labels | Status badges |

### Font Family

All fonts use `Inter` (sans-serif):
- `font-sans` - Default
- `font-serif` - Also Inter (historical alias)
- `font-display` - Also Inter

### Mobile-First Typography

Always use responsive text sizes:

```tsx
// Good
<h1 className="text-2xl sm:text-3xl font-bold">Title</h1>

// Bad
<h1 className="text-3xl font-bold">Title</h1>
```

---

## Component Sizes

### Buttons

| Size | Classes | Usage |
|------|---------|-------|
| Small | `h-9 px-3 text-sm` | Compact UIs, mobile |
| Medium | `h-10 px-4 text-base` | Default buttons |
| Large | `h-12 px-6 text-base` | Primary CTAs |
| Touch | `min-h-14 px-4 text-base` | Mobile touch targets |

### Avatars

| Size | Classes | Pixels | Usage |
|------|---------|--------|-------|
| XS | `w-6 h-6` | 24px | Inline mentions |
| SM | `w-8 h-8` | 32px | Navigation |
| MD | `w-12 h-12` | 48px | Cards, lists |
| LG | `w-16 h-16` | 64px | Profile headers |
| XL | `w-20 h-20` | 80px | Hero sections |

### Icon Containers

| Size | Classes | Pixels | Usage |
|------|---------|--------|-------|
| SM | `w-8 h-8` | 32px | Compact icons |
| MD | `w-10 h-10` | 40px | Default icons |
| LG | `w-12 h-12` | 48px | Large icons |

---

## Card Patterns

### Standard Card

```tsx
<Card className="rounded-lg border shadow-sm">
  <CardHeader className="p-6 pb-4">
    <CardTitle className="text-xl font-semibold">Title</CardTitle>
  </CardHeader>
  <CardContent className="p-6 pt-0">
    {/* Content */}
  </CardContent>
</Card>
```

### List Card (Compact)

```tsx
<ListCard variant="compact" onClick={handleClick}>
  {/* Content with p-4 padding */}
</ListCard>
```

### Card with Border Accent

```tsx
<ListCard leftBorderColor="hsl(24, 95%, 53%)">
  {/* Gig card with orange left border */}
</ListCard>
```

### Padding Standards

| Context | Padding | Usage |
|---------|---------|-------|
| **Compact** | `p-4` (16px) | List items, compact cards |
| **Standard** | `p-6` (24px) | Regular cards, modal content |
| **Large** | `p-12` (48px) | Empty states |

---

## Modal Patterns

### Two Modal Types

#### 1. StandardModal (Neutral Header)

**Use for:**
- Editing existing records
- Viewing details
- Simple forms

```tsx
<StandardModal
  open={open}
  onClose={onClose}
  title="Edit Venue"
  footer={
    <>
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </>
  }
>
  {/* Form content */}
</StandardModal>
```

**Features:**
- Neutral background header
- Close button (X)
- Optional footer with actions
- Standard padding (p-6)

#### 2. WizardModal (Orange Header)

**Use for:**
- Creating new records
- Multi-step workflows
- Guided processes

```tsx
<WizardModal
  open={open}
  onClose={onClose}
  title="Add New Gig"
  currentStep={2}
  totalSteps={5}
  footer={
    <>
      <Button onClick={handleBack}>Back</Button>
      <Button onClick={handleNext}>Next</Button>
    </>
  }
>
  {/* Step content */}
</WizardModal>
```

**Features:**
- Orange background header
- Progress bar
- Step indicators
- Mobile-optimized (full-screen on mobile)
- Touch-friendly buttons (56px minimum)

### Modal Behavior

**IMPORTANT:** All modals must close on successful save/submit.

```tsx
// Correct
const handleSave = async () => {
  await saveChanges();
  toast({ title: 'Saved successfully' });
  onClose(); // Always close after success
};

// Incorrect - Modal stays open
const handleSave = async () => {
  await saveChanges();
  toast({ title: 'Saved successfully' });
  // Missing onClose()
};
```

---

## Form Patterns

### Standard Form Field

```tsx
<FormField label="Venue Name" required error={errors.name}>
  <Input {...register('name')} />
</FormField>
```

### Form Spacing

```tsx
<form className="space-y-6">
  <div className="space-y-4">
    {/* Form fields */}
  </div>
  <div className="flex gap-3 pt-4">
    {/* Action buttons */}
  </div>
</form>
```

### Toast Notifications

**Standard duration:** 5 seconds (5000ms)

```tsx
// Correct - Use default duration
toast({
  title: 'Venue created',
  description: 'Changes saved successfully',
});

// Incorrect - Don't override duration
toast({
  title: 'Venue created',
  duration: 3000, // ❌ Don't do this
});
```

---

## When to Use What

### Page Layouts

| Page Type | Container | Max Width | Example |
|-----------|-----------|-----------|---------|
| List view | PageContainer | max-w-4xl | Gigs, Songs, Venues |
| Detail view | PageContainer | max-w-4xl | Venue Detail |
| Dashboard | PageContainer | max-w-[900px] | Dashboard tiles |
| Form | PageContainer narrow | max-w-2xl | Profile |

### Mobile Headers

**Rule:** Don't show page titles in mobile header. Context comes from tabs or content.

```tsx
// Correct - No title on mobile
<PageHeader title="Gigs" showTitleOnMobile={false} />

// Mobile shows: [Logo] [Icons]
// Desktop shows: [Sidebar] Gigs [Actions]
```

### Empty States

Use the `EmptyState` component:

```tsx
<EmptyState
  icon={<Calendar className="h-12 w-12" />}
  title="No gigs yet"
  description="Create your first gig to get started"
  action={<Button onClick={onCreate}>Add Gig</Button>}
/>
```

### Cards

| Pattern | Component | Usage |
|---------|-----------|-------|
| Dashboard tile | Custom | Special gradient backgrounds |
| List item | ListCard compact | Venues, Gigs |
| Expandable item | ListCard | Songs with details |
| Content card | Card standard | Members, Stats |

---

## Migration Checklist

When refactoring a page:

- [ ] Use `PageContainer` with appropriate variant
- [ ] Use `PageHeader` (hide title on mobile by default)
- [ ] Replace custom cards with `ListCard`
- [ ] Use standardized spacing (`space-y-4`, `gap-3`)
- [ ] Use typography constants (`TYPOGRAPHY.h1`, etc.)
- [ ] Ensure edge-to-edge on mobile, max-w-4xl on desktop
- [ ] Check modal close behavior (must close on success)
- [ ] Remove custom toast durations (use default 5s)

---

## References

- **Design Tokens:** `client/src/lib/design-tokens.ts`
- **UI Components:** `client/src/components/ui/`
- **Layout Components:** `client/src/components/layout/`
- **Audit Document:** `C:\VSProjects\bndy All Platform Docs\Refactors\BNDY_BACKSTAGE_UI_AUDIT.md`
- **Implementation Plan:** `C:\VSProjects\bndy All Platform Docs\Refactors\BACKSTAGE_UI_STANDARDIZATION_PLAN.md`

---

**Questions?** Refer to the audit document for current implementations or the plan document for detailed migration steps.
