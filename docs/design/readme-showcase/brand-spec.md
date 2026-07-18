# Car Service — Shipped visual system

Source of truth: values supplied from the current application code and Claude Design handoff. These values override any earlier showcase direction.

## Core tokens

```css
:root {
  --bg: #0d0d11;
  --surface: #15151c;
  --surface-mid: #1c1c26;
  --surface-high: #232330;
  --border: rgba(255,255,255,.07);
  --border-strong: rgba(255,255,255,.12);
  --border-accent: rgba(205,216,58,.30);
  --text: #eceef4;
  --text-mid: #b4bace;
  --text-soft: #7e8699;
  --accent: #cdd83a;
  --accent-dim: rgba(205,216,58,.12);
  --accent-glow: rgba(205,216,58,.06);
  --danger: #e05252;
  --success: #4ec994;
  --info: #5b9cf6;
  --warning: #f0a84a;
}
```

Semantic showcase aliases: `--fg: var(--text)`, `--muted: var(--text-mid)`, and `--surface-raised: var(--surface-high)`. The six required system roles are therefore `--bg`, `--surface`, `--fg`, `--muted`, `--border`, and `--accent`, bound directly to the shipped values above rather than converted or approximated.

## Type

- UI/display: `"IBM Plex Sans", "Segoe UI", system-ui, -apple-system, sans-serif`
- IDs/figures: `"IBM Plex Mono", "SFMono-Regular", Consolas, monospace`
- Tabular numerals for currency, counts, dates, references, plates, and stock figures.

## Posture rules

1. Dark, dense, high-contrast workshop UI; no paper canvas, orange branding, or decorative gradients.
2. Use thin alpha borders and subtle deep shadows to separate dark surfaces.
3. Use one yellow-green primary action per view; reserve the accent for active navigation and critical focus.
4. Group navigation in a left sidebar. The active row has an accent-tinted background and a 3px inset accent bar.
5. Keep cards vehicle/service-first with restrained chips and exact status mapping: New = info, In progress = warning, Waiting parts = danger, Completed = success.

## Geometry

- Base spacing unit: 4px
- Radii: 8 / 10 / 12 / 14 / 20 / pill
- Controls: minimum 40px on desktop; 44px on touch layouts
- Borders: 1px alpha rules
- Shadows: low-spread, deep neutral elevation
