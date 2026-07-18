# Car Service Platform — Design-system showcase companion

## Purpose and source of truth

This Open Design artifact is the **design-system/showcase companion** for the already-shipped Car Service Platform. It mirrors the current application's visual language and representative compositions; it is not the running product itself.

The README hero comes from this Open Design companion so it can preserve the supplied Claude Design **Today summary** in the sidebar. Its counts are deterministic synthetic reference data, not a production API response. The repair board, invoice, and tracking screenshots come from the **running application with synthetic demo data**.

The composition is validated for a **1600 × 1000 px browser capture**. Four views remain deterministic and directly addressable:

- `index.html#dashboard` — Operations Dashboard / populated Warehouse tab
- `index.html#board` — Repairs / Kanban Board
- `index.html#invoice` — New invoice / Warehouse purchase modal
- `index.html#tracking` — narrow customer repair-status portal

## Product identity

The product brand is a lime square **CS** mark paired with the name **Car Service**. The posture is a dark, high-contrast workshop interface: dense but legible, operational rather than decorative, and built from restrained elevation and thin alpha rules.

No prior light-paper or safety-orange visual language remains. There is no white canvas, orange brand accent, or decorative gradient.

## Exact color tokens

```css
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
```

### Color behavior

- Accent is the yellow-green primary action, active navigation marker, and selected-control color. Use one primary accent action per view.
- New = `--info`.
- In progress = `--warning`.
- Waiting parts = `--danger`.
- Completed = `--success`.
- Status chips use a subtle tinted fill and colored text/dot; status colors are never used as generic decoration.
- Charts encode data with filled areas or bars, not outline-only marks.

## Typography

No network dependency is required.

- **UI/display:** `IBM Plex Sans`, `Segoe UI`, `system-ui`, `-apple-system`, `sans-serif`
- **IDs/figures:** `IBM Plex Mono`, `SFMono-Regular`, `Consolas`, `monospace`

Currency, stock counts, dates, references, repair IDs, and plates use the mono stack with tabular numerals. Page titles remain 27–30 px in the 1600 × 1000 capture; operational body copy stays at 12–15 px so text remains comfortable when screenshots are reduced to GitHub README width.

## Spatial and elevation system

- Base rhythm: **4 px**
- Common gaps: 8 / 12 / 16 / 20 / 24 px
- Main canvas padding: 24–28 px
- Radii: 8 / 10 / 12 / 14 / 20 px / pill
- Borders: 1 px alpha rules (`--border` or `--border-strong`)
- Accent border: `--border-accent`
- Elevation: subtle deep neutral shadows; no glow wash or ornamental gradient

## Structural components

### Showcase rail

A compact dark top rail labels the artifact as a design-system companion and switches among the four hash-addressable views. Hash changes are synchronous; there is no timing-dependent animation or randomized content.

### Application shell

Operational views use a grouped left sidebar. The active row has an accent-tinted background and a 3px inset accent bar. The lime CS mark and Car Service name anchor the shell.

The desktop sidebar also carries the supplied **Today · live** summary beneath navigation. It exposes three scan-first board counts — **Open**, **Waiting parts**, and **Ready to pick up** — plus a restrained link back to repairs. In this companion the values mirror the deterministic showcase board; production implementation still requires domain-backed live counts and an agreed definition of “ready to pick up”.

### Dashboard

The title is **Operations Dashboard** with MoneyFlow / Warehouse / Consumables / ServiceBoard tabs. The captured state is the populated **Warehouse** dashboard with live-stock vocabulary, inventory value, invoice coverage, low-stock attention, purchase activity, and zł-denominated synthetic figures.

### Repairs board

The real **Repairs / Kanban Board** composition includes 7 / 30 / 90 / All-time filters, search, one + New Repair action, and four dense columns. Vehicle, plate, repair reference, services, assignee, and expected timing remain visually hierarchical.

### Warehouse purchase modal

The invoice view shows **New invoice / Warehouse purchase** as a modal over a blurred Purchases table. It contains a receipt segmented control, invoice upload dropzone, order and delivery dates, supplier and NIP, one collapsible purchase line, and Cancel / Download PO / Save line actions.

### Customer portal

The tracking view is a narrow centered card containing the CS mark, authorized-workshop label and address, **Your repair status**, a Received / In Progress / Ready for Pickup vertical timeline, vehicle, services, expected completion/reference, and Call the workshop / Directions actions. Address and directions are provided; the artifact makes no live GPS claim.

## Responsive behavior

Desktop capture is the primary composition. Below desktop widths, sidebars collapse, dense grids reduce columns, the board becomes horizontally scrollable within its own region rather than causing page overflow, and the customer card remains single-column. At 700 px and below, operational navigation is replaced by the top showcase rail and modules stack with 44 px touch targets.

## Screenshot and content policy

- Validate at 1600 × 1000 px.
- The README dashboard hero is this deterministic design target; the other three README screenshots are captured from the running application using synthetic demo data.
- This Open Design HTML is the companion reference, not evidence of production records or integrations.
- All names, registration plates, repair IDs, supplier details, NIP values, addresses, monetary figures, and timestamps shown here are synthetic.
- The project contains no secrets, credentials, or real PII.
- The customer portal provides an address and directions only; it does not claim live vehicle GPS tracking.
