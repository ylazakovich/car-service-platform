# UI Responsive Design Spec

This document defines the canonical rules for responsive layout, breakpoints, rendering strategy, component naming, CSS cascade ordering, and testing requirements. It was written to prevent recurrence of two classes of bugs found during `chore/design-system-consolidation`:

1. CSS cascade ordering breaks when `display: none` overrides are placed in feature files that load after the media-query that was supposed to reveal the element.
2. The hybrid JS+CSS rendering strategy was undocumented, causing incorrect implementations that duplicated or fought the primary toggle mechanism.

---

## 1. Canonical Breakpoints

These are the only approved breakpoint values. Any per-feature deviation must include a comment explaining why the canonical value does not apply.

| Name | Range | Media query |
|------|-------|-------------|
| `mobile` | `<= 820px` | `@media (max-width: 820px)` |
| `tablet-narrow` | `821px – 1023px` | `@media (min-width: 821px) and (max-width: 1023px)` |
| `desktop` | `>= 1024px` | `@media (min-width: 1024px)` |
| `coarse-pointer` | any width, touch device | `@media (pointer: coarse)` |

**Rationale for 820px.** The JS constant `REGISTERS_MOBILE_BREAKPOINT = "(max-width: 820px)"` in `frontend/src/features/staff/hooks/useMediaQuery.ts` is the authoritative mobile threshold. All CSS must match this value exactly. The CSS side uses `max-width: 821px` / `min-width: 821px` in the repairs layout — this is intentional and equivalent (821px is the first pixel above 820px). Do not introduce 819, 768, 767, or any other approximation without updating the JS constant as well, and documenting the change here.

**Coarse-pointer** is orthogonal to width breakpoints. Use it exclusively for touch target sizing (minimum 44px hit area per WCAG 2.5.5). Do not use it as a proxy for "mobile layout".

**Do not use** these values for new layout logic: 380, 420, 520, 640, 700, 900, 1200, 1500. They exist in legacy feature CSS only. Migrate them to the canonical table above when touching the surrounding rule.

---

## 2. Rendering Strategy — JS + CSS Hybrid

### Overview

The responsive rendering system uses two mechanisms that serve different roles. Understanding the boundary between them is mandatory before writing any responsive UI code.

| Mechanism | Role | Used for |
|-----------|------|----------|
| JS conditional render | Primary — controls which React component tree is mounted | Full component swaps between mobile and desktop variants |
| CSS media query | Secondary — controls layout and appearance within a mounted component | Layout adjustments, spacing, grid reflow inside a single component |

### JS is the primary toggle

`StaffHomePage.tsx` calls `useMediaQuery(REGISTERS_MOBILE_BREAKPOINT)` to obtain the `compactStaffNarrowLayout` boolean. When this is `true`, the page renders the mobile component tree; when `false`, the desktop tree. These are mutually exclusive React subtrees — one is never in the DOM when the other is active.

Use JS conditional rendering when:
- The mobile and desktop experiences require structurally different markup or component composition.
- The two variants share no meaningful DOM structure.
- The component needs to load different data, fire different events, or expose a different interaction model.

### CSS is the secondary mechanism

`layout/mobile-shell.css` applies `display: none` to mobile surface elements (`.vehicles-mobile-surface`, `.vehicle-mobile-detail-surface`, `.staff-mobile-taskbar`, `.repairs-mobile-surface`) by default. These rules act as defense-in-depth: if a mobile component is accidentally mounted in a desktop context, it will not be visible.

Use CSS-only responsiveness when:
- The component structure is the same; only layout, sizing, or spacing changes.
- The change is contained within a single component's own CSS.
- No data-fetching or interaction logic differs between breakpoints.

### When NOT to mix

Do not add `display: none` inside a feature CSS file to hide a component that is already controlled by JS conditional rendering. The JS unmounts it — adding a CSS hide creates dead code and misleads future readers.

Do not add a JS `useMediaQuery` call to swap between two minor layout variants that could be handled entirely with a CSS `@media` rule. Keep JS-level branching for genuine structural differences.

---

## 3. Mobile Component Convention

### Naming

| Context | Pattern | Example |
|---------|---------|---------|
| Desktop component | `Staff<Domain><Role>` | `StaffVehicleDetailPanel`, `StaffRepairsKanban` |
| Mobile component | `Staff<Domain>Mobile<Role>` | `StaffVehicleMobileDetail`, `StaffVehiclesMobileList`, `StaffRepairsMobileList` |

The `Mobile` segment is placed between the domain noun and the role noun, not at the end.

### Folder structure

```
frontend/src/features/staff/
  web/          — desktop components
  mobile/       — mobile components
  hooks/        — shared hooks including useMediaQuery
  shared/       — components used in both mobile and desktop trees
```

A component belongs in `mobile/` if it is rendered exclusively when `compactStaffNarrowLayout === true`. It belongs in `web/` if it is rendered exclusively in the desktop tree. Shared business-logic components (data tables, modals driven by URL state) live in `shared/`.

### When to create a new mobile component vs. use CSS only

Create a dedicated mobile component (in `mobile/`) when:
- The interaction model differs (e.g., a Kanban board becomes a flat list on mobile).
- Navigation structure changes (e.g., a split panel becomes a stack of full-screen pages).
- The mobile variant needs a different set of props or a different data query.

Use CSS-only (`@media` rules) when:
- The component is the same; only grid columns, font sizes, or padding differ.
- The user sees the same actions and data, just reflowed.

---

## 4. CSS Cascade Rules

### Load order

`src/styles/index.css` must import partials in this exact order:

1. `foundation/` — reset, design tokens, typography (no layout)
2. `primitives/` — reusable UI primitives (buttons, inputs, badges)
3. `layout/` — shell structure; `mobile-shell.css` is the last file in this group
4. `features/` — per-feature overrides

This order is load-order-dependent. Do not reorder without updating this spec.

### The unconditional-hide rule

Any `display: none` declaration that is unconditional (not inside a `@media` block) and is intended to be overridden by a `@media` rule MUST live in `layout/mobile-shell.css`.

Reason: feature CSS files load after `layout/`, so a `display: none` in a feature file will win over the `@media` override in `mobile-shell.css` due to source order. The resulting element is invisible at all viewport sizes.

Correct pattern:

```
layout/mobile-shell.css
  .staff-mobile-taskbar { display: none; }            /* unconditional default */

  @media (max-width: 820px) {
    .staff-mobile-taskbar { display: flex; }           /* override for mobile */
  }
```

Forbidden pattern:

```
features/staff.css
  .staff-mobile-taskbar { display: none; }            /* WRONG — too late in cascade */
```

### Feature CSS constraints

Feature CSS files in `features/` may only:
- Override layout properties (grid, flex, size) within a media query.
- Add component-specific spacing, color, and typography.
- Not set unconditional `display: none` on elements that mobile-shell.css is responsible for showing.

---

## 5. Testing Requirements

### Viewport coverage

Every UI change that touches a component with responsive behavior must be verified at both:
- `<= 820px` — the mobile viewport
- `>= 1024px` — the desktop viewport

This applies to both manual QA and automated tests.

### E2E test tagging

Playwright E2E tests that exercise responsive surfaces must include both `@mobile` and `@desktop` tags where the behavior differs between viewports. If a test only covers one viewport, it must carry a single tag (`@mobile` or `@desktop`) with a comment explaining why the other was excluded.

### Separate test surfaces

`StaffVehicleDetailPanel` (desktop) and `StaffVehicleMobileDetail` (mobile) are separate React components and must be treated as separate test surfaces. A test that passes at desktop resolution does not cover the mobile component, and vice versa. Do not share assertions between the two without verifying that both components expose the same selectors.

### Regression guard

When adding a new breakpoint or modifying mobile-shell.css, add or update a Playwright test that:
1. Loads the relevant page at `820px` width.
2. Asserts the mobile component is visible.
3. Loads the same page at `1024px` width.
4. Asserts the desktop component is visible and the mobile component is not in the DOM (or not visible).

---

## 6. URL Conventions

### No trailing slashes on API calls

Django URL patterns for detail endpoints in this project do not include a trailing slash. Frontend `fetch` calls and API client methods must omit the trailing slash on all API URLs.

Correct: `GET /api/repairs/42`
Wrong: `GET /api/repairs/42/`

A trailing slash on a detail endpoint returns a Django 301 redirect. Some fetch configurations do not follow redirects, resulting in a 404 or an unexpected empty response. This was the root cause of the `fetchRepair` 404 bug.

Rule: when adding a new API call, verify the corresponding Django URL pattern in `backend/` before hardcoding the path. If the pattern ends with `/`, include the slash. If it does not, omit it. Do not assume either convention — check the source.
