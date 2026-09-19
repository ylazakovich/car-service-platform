# CSP Admin Manual QA Notes

Date: 2026-05-31
Tester: Hermes Agent
Scope: local CSP dev stack, admin/staff workspace, exploratory manual browser testing starting from login.

## Environment

- App: car-service-platform local dev stack
- Frontend: http://localhost:4173
- Backend/Admin: http://localhost:8000
- User role tested: admin
- Dev seed account used: local demo admin account (credentials intentionally not repeated here)
- Browser viewport observed during modal/layout testing: approximately 1280 x 577

## Testing performed so far

- Login page: empty submit, invalid email, wrong credentials, valid admin credentials.
- Dashboard landing page.
- Users: invite user modal, duplicate invite, reset password button behavior.
- Vehicles: empty state, add vehicle modal, new owner sub-flow, suspicious/invalid text input.
- Repairs: empty Kanban, new repair modal, add brand-new vehicle from repair flow.
- Purchases: empty warehouse, add part line modal, invoice line accordion / modal scroll.
- Registers: units of measure table and add unit modal opened.
- Console checked after major flows: no frontend JS errors observed so far.

## Findings

### QA-001 — Deep links do not open the expected admin section

Severity: Medium
Category: Navigation / UX
Area: Admin shell routing

Steps:
1. Log in as admin.
2. Navigate directly to `/vehicles` or `/users`.

Expected:
- The requested section opens, or the app redirects to a canonical URL that still preserves the selected section.

Actual:
- The app effectively lives under `/app` and uses `localStorage` (`staff-active-section`) for section state. Direct URLs like `/vehicles` do not behave as real section deep links.

Impact:
- Users cannot share/bookmark links to a specific section, and reload/back/forward behavior can be confusing.

---

### QA-002 — Reset Password may rely on a blocking browser-native dialog

Severity: Medium
Category: Functional / UX
Area: Users

Steps:
1. Open Users.
2. Click `Reset Password` for a user.

Expected:
- A visible app-level confirmation modal or clear reset-password flow.

Actual:
- Browser automation hung after clicking the button; snapshots/screenshots timed out until navigation/recovery. This is consistent with a native blocking confirm/alert/prompt or similar blocking behavior.

Impact:
- Native dialogs are hard to style, easy to mishandle, and can create brittle UX. A React modal with explicit Cancel/Confirm and loading/error states would be clearer.

---

### QA-003 — Duplicate invite shows a generic error

Severity: Low/Medium
Category: Validation / UX
Area: Users > Invite user

Steps:
1. Open Users.
2. Click `+ Invite user`.
3. Enter an already-registered email.
4. Submit.

Expected:
- Specific message, e.g. `User with this email already exists` or `Invite already exists`.

Actual:
- Generic message: `Failed to send invite.`

Impact:
- Admin does not know what to fix.

---

### QA-004 — Invite form layout jumps after backend validation error

Severity: Low
Category: Visual / UX
Area: Users > Invite user

Steps:
1. Open Invite user modal.
2. Submit a duplicate/existing email.

Expected:
- Error appears without changing form layout significantly.

Actual:
- Controls wrap/reflow; the submit button moves to a different row, making the form feel unstable.

---

### QA-005 — New owner flow accepts or fails unclear suspicious/invalid customer data

Severity: Medium
Category: Validation / Data quality
Area: Vehicles > Add Vehicle > Need new owner

Steps:
1. Vehicles > `+ Add Vehicle`.
2. Click `Need new owner?`.
3. Enter long/script-like text in Full Name: `Test QA Owner VeryVeryVeryLongName<script>alert(1)</script>`.
4. Enter invalid phone: `not-a-phone-%%%`.
5. Click `Create & Select`.

Expected:
- Client or backend validation should reject invalid phone and possibly overly long/suspicious name with a clear message.

Actual:
- No clear validation result was shown in the UI during the observed run. The values remained visible in the form.

Notes:
- No XSS execution observed; React rendered the payload as text.

---

### QA-006 — Vehicle modal is difficult to use at shorter viewport heights

Severity: Medium
Category: Layout / UX
Area: Vehicles > Add Vehicle

Observed viewport:
- About 1280 x 577.

Expected:
- Modal body scrolls clearly; sticky footer does not cover form fields; all fields and action buttons are usable.

Actual:
- Lower fields are pushed below the visible area and the sticky footer visually competes with content. The form feels cramped and hard to complete.

---

### QA-007 — New Repair > add brand-new vehicle loses repair context visually

Severity: Low/Medium
Category: UX / Flow
Area: Repairs > New Repair

Steps:
1. Repairs > `+ New Repair`.
2. Click `Or add a brand-new vehicle`.

Expected:
- The UI clearly communicates this is part of creating a repair, e.g. `Create vehicle for this repair` and explains it will return/select the vehicle.

Actual:
- The New Repair modal is replaced by Register Vehicle. The user can lose context about whether they will return to repair creation.

---

### QA-008 — Purchases modal has scroll/accordion usability issues at shorter viewport heights

Severity: Medium
Category: Layout / Functional UX
Area: Purchases > Add part line

Observed metrics:
- Viewport: about 1280 x 577
- `.modal-body`: clientHeight around 389, scrollHeight around 796, overflowY auto
- `.modal-form`: overflowY hidden
- Sticky footer occupies bottom of modal

Steps:
1. Purchases > `+ Add part line`.
2. Try expanding invoice line accordion.
3. Scroll modal/page.

Expected:
- Accordion expands visibly and fields are reachable; footer does not obscure content.

Actual:
- The invoice line content did not become clearly visible/reachable in the observed run. Scrolling did not noticeably improve visibility.

---

### QA-009 — Invoice line accordion appeared non-responsive

Severity: Medium
Category: Functional / UX
Area: Purchases > Warehouse purchase

Steps:
1. Open Warehouse purchase modal.
2. Click `Part not set yet Qty 1 · pcs`.

Expected:
- Accordion expands and exposes line fields.

Actual:
- Snapshot still showed `expanded=false`; visually fields did not appear.

---

### QA-010 — Add Unit modal needs empty-submit validation check

Severity: Low/Medium
Category: Validation
Area: Registers > Units of measure

Status:
- Modal opened; full empty-submit test was not completed before tool-call limit.

Risk:
- Button is enabled with empty fields; need to verify whether inline validation is clear and whether backend errors are surfaced properly.

## Good observations so far

- Login invalid email uses browser validation.
- Wrong credentials show a useful generic auth error.
- Admin login succeeds.
- Dashboard loads without console errors.
- Sidebar navigation works for main sections.
- Empty states exist for vehicles, repairs, and warehouse purchases.
- XSS-like owner name input did not execute in React-rendered UI during observation.

## Additional findings from continued pass

### QA-011 — Sidebar account/sign-out area is clipped at short viewport height

Severity: Medium
Category: Layout / UX
Area: Global admin shell sidebar

Observed viewport:
- About 1280 x 577.

Expected:
- Signed-in email, profile action, and Sign Out remain fully visible or the sidebar scrolls.

Actual:
- The lower sidebar account area is partially cut off at the bottom of the viewport. The email/profile/sign-out area is not comfortably usable without relying on hidden/partial controls.

Impact:
- On laptop-sized or short browser windows, account controls can be hard to access.

---

### QA-012 — Duplicate unit code validation is specific and visible, but empty-submit relies on browser/native behavior

Severity: Low
Category: Validation / UX
Area: Registers > Units of measure > Add unit

Steps:
1. Registers > Units of measure > `+ Add unit`.
2. Submit empty form.
3. Submit duplicate code `pcs`.

Expected:
- Empty form and duplicate code both have clear inline validation.

Actual:
- Duplicate code shows a clear inline backend error: `unit of measure with this code already exists.`
- Empty-submit did not show an app-level inline error in the observed snapshot; it appears to rely on browser/native required validation or no visible state change.

---

### QA-013 — Service create with invalid negative price shows generic error

Severity: Medium
Category: Validation / UX
Area: Registers > Services > Add service

Steps:
1. Registers > Services > `+ Add service`.
2. Enter service name containing harmless XSS-like text: `<script>alert('svc')</script> Oil Change QA`.
3. Enter price `-999999999`.
4. Submit.

Expected:
- Specific validation message explaining that price must be non-negative / within allowed range.

Actual:
- Modal stays open and shows only generic `Could not create service.`
- Backend log shows `400 POST /api/services/`.

Impact:
- Admin does not know which field is invalid or how to correct it.

Notes:
- No XSS execution observed; value rendered as text in input.

---

### QA-014 — Customer create accepts weak phone format without validation

Severity: Low/Medium
Category: Data quality / Validation
Area: Registers > Customers > Add customer

Steps:
1. Registers > Customers > `+ Add customer`.
2. Enter name `QA Customer`.
3. Enter phone `12345`.
4. Enter valid email.
5. Submit.

Expected:
- If phone format matters, show validation or normalization guidance.

Actual:
- Customer was created successfully with phone `12345`.

Impact:
- May allow low-quality customer data unless intentionally permissive.

---

### QA-015 — Vehicle create flow can close modal while vehicle remains absent from registry

Severity: High
Category: Functional / Data creation
Area: Vehicles > Add Vehicle

Steps:
1. Create a customer from Registers > Customers.
2. Go to Vehicles > `+ Add Vehicle`.
3. Select existing owner `QA Customer`.
4. Fill required fields: license plate `QA-123`, year `2026`, make `Toyota`, model `Corolla`.
5. Click `Create Vehicle`.

Expected:
- Vehicle is created and appears in Vehicle Registry, or a clear validation/API error is shown and the modal remains open.

Actual:
- Modal closed, but Vehicle Registry still displayed the empty state `No vehicles yet`.
- No frontend console error was observed.
- Backend tail did not show a corresponding vehicle POST error near this action, suggesting the UI may have closed without a successful create request or without refreshing/reflecting the result.

Impact:
- High user confusion and possible data loss: admin thinks the vehicle was submitted, but it is not visible.

## Continue testing checklist

- Reproduce QA-015 with network/API inspection and/or backend DB count.
- Test valid service creation and service row edit/delete.
- Test valid Vehicle -> Repair creation once vehicle creation behavior is understood.
- Test repair lifecycle/status transitions and act/PDF paths.
- Test purchase valid/invalid form submission and upload surface.
- Test sign out and session behavior.
- Test Django `/admin/` separately if still in scope.
- Test mobile viewport/responsive shell.
- Before finishing: stop local stack with `bash scripts/compose/stop.sh` and verify ports/containers.
