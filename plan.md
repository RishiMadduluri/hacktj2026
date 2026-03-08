# FirstWatch: Organizations + Multi-Camera Implementation Plan

## Context
Add organizations and multi-camera support so multiple users can share camera feeds and receive emergency alerts together. Replaces demo auth with Supabase Auth, migrates localStorage to Supabase DB, adds org management, and streams camera thumbnails via Supabase Realtime.

---

## Phase 1: Supabase Foundation

- [x] **1.1** Install `@supabase/supabase-js` and `@supabase/ssr`
- [x] **1.2** Add env vars to `.env` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [x] **1.3** Create `lib/supabase/client.ts` (browser client via `createBrowserClient`)
- [x] **1.4** Create `lib/supabase/server.ts` (server client via `createServerClient` with cookies)
- [x] **1.5** Create `lib/supabase/middleware.ts` (middleware session refresh + route protection)
- [x] **1.6** Apply database migration + RLS fix — **USER ACTION COMPLETED**
  - SQL applied from `supabase-migration.sql`
  - Follow-up fix applied from `supabase-fix-rls.sql`
  - Tables: `profiles`, `emergency_contacts`, `organizations`, `org_members`, `incidents`
  - RLS policies for user data + org member cross-visibility
  - Helper function: `generate_invite_code()`
- [x] **1.7** Update `middleware.ts` — replaced cookie check with Supabase `updateSession()`
- [x] **1.8** Update `app/actions.ts` — real Supabase Auth (signInWithPassword, signUp, signOut, resetPassword)
- [x] **1.9** Update `app/(auth-pages)/sign-in/page.tsx` — removed demo hints/defaults, added forgot-password link
- [x] **1.10** Update `app/(auth-pages)/sign-up/page.tsx` — wired to real Supabase signUp
- [x] **1.11** Update `app/pages/layout.tsx` — Supabase user email, signout via supabase.auth.signOut(), added Organizations nav item, added OrgAlertListener
- [x] **1.12** Update `app/protected/layout.tsx` — same changes as pages/layout

---

## Phase 2: Data Migration (localStorage -> Supabase)

- [x] **2.1** Create `lib/supabase/data.ts` — full data access layer
  - Profile: `getProfile`, `upsertProfile`
  - Contacts: `getContacts`, `addContact`, `upsertContact`, `deleteContact`
  - Incidents: `getIncidents`, `createIncident`, `updateIncident`, `deleteIncident`, `deleteAllIncidents`
  - Orgs: `getUserOrgs`, `getOrgMembers`, `getOrgMemberCount`, `getUserOrgsWithCameraEnabled`
- [x] **2.2** Update `app/onboarding/page.tsx` — saves to Supabase + localStorage cache
- [x] **2.3** Update `app/pages/settings/page.tsx` — reads/writes profile + contacts via Supabase
- [x] **2.4** Update `app/protected/page.tsx` (Dashboard) — loads from Supabase, caches to localStorage
- [x] **2.5** Update `app/pages/history/page.tsx` — loads/deletes incidents via Supabase
- [x] **2.6** Update `app/pages/live-feed/page.tsx` — loads profile/contacts from Supabase, saves incidents to Supabase
- [x] **2.7** Reconcile local incident cache with Supabase IDs + persist incident audio metadata
  - Replace temporary local incident IDs with the persisted Supabase IDs
  - Persist recorded audio metadata back to Supabase via `updateIncident()`

---

## Phase 3: Organizations

- [x] **3.1** Create `app/pages/organizations/actions.ts` — server actions
  - `createOrganization(name)`, `joinOrganization(code)`, `leaveOrganization(orgId)`, `toggleCameraSharing(orgId, enabled)`
- [x] **3.2** Create `app/pages/organizations/page.tsx` — org list/create/join UI
  - Create org form, join by 6-char code, org list with camera toggle, member count, invite code copy
- [x] **3.3** Added "Organizations" to sidebar nav in both layout files (between History and Settings)
- [x] **3.4** Tighten org page membership validation
  - Org detail page now checks the signed-in user's membership before loading org data

---

## Phase 4: Multi-Camera Realtime

- [x] **4.1** Create `lib/supabase/realtime.ts` — broadcast helpers
  - `getOrgChannel`, `broadcastFrame`, `broadcastEmergency`
- [x] **4.2** Update `app/pages/live-feed/page.tsx` — frame broadcasting
  - On start: subscribes to org channels, broadcasts 160x90 JPEG frames every 750ms
  - On emergency: broadcasts `emergency-alert` to all org channels
  - On stop: unsubscribes from channels, clears broadcast interval
- [x] **4.3** Create `app/pages/organizations/[orgId]/page.tsx` — org camera grid
  - Responsive grid (1/2/3 cols), member feeds with name/online status/patient info
  - Real-time frame updates, emergency alert with red pulsing border
  - Offline detection after 5s of no frames
- [x] **4.4** Create `components/org-alert-listener.tsx` — global emergency listener
  - Subscribes to all user's org channels, plays alert sound + browser notification on emergency
- [x] **4.5** OrgAlertListener added to both `app/pages/layout.tsx` and `app/protected/layout.tsx`
- [x] **4.6** Refresh org alert subscriptions after org membership changes in-session
  - Dispatch org membership change events after create/join/leave
  - Re-subscribe listener channels without requiring a full page reload
- [x] **4.7** Keep org camera grid synced with org membership + camera-sharing changes
  - Re-fetch org members on `org_members` changes
  - Clear stale frames when a member disables camera sharing
  - Show camera-disabled state distinctly from offline state
- [x] **4.8** Keep live broadcast channels synced while monitoring
  - Rebuild the active org broadcast channel set when the user's org membership rows change
  - Apply camera-sharing toggles without forcing the user to stop and restart monitoring
- [x] **4.9** Fix live-feed initialization so monitoring works in production builds
  - Delay webcam/model boot until the client-only video element is mounted
  - Preserve the acquired media stream even before the video metadata callback completes
- [x] **4.10** Propagate camera-sharing toggles across active tabs while monitoring
  - Broadcast explicit camera-sharing changes on the org realtime channel
  - Mirror the change through `localStorage`/`storage` events for same-browser tab synchronization
- [x] **4.11** Propagate org membership changes to active org viewers
  - Broadcast explicit join/leave/create membership updates on the org realtime channel
  - Refresh already-open org detail pages without requiring a manual reload

---

## Phase 5: Hardening + Regression Coverage

- [x] **5.1** Fix password reset redirect URL generation
  - Added a dedicated reset URL helper with deterministic env fallbacks
- [x] **5.2** Validate password confirmation during reset
  - Reject mismatched passwords before calling `supabase.auth.updateUser()`
- [x] **5.3** Remove stale demo messaging from forgot-password flow
- [x] **5.4** Add automated regression tests
  - `npm test` now compiles a focused TypeScript test slice and runs Node test cases
  - Covered reset URL generation and incident local-cache reconciliation logic
- [x] **5.5** Add regression tests for org member feed state handling
  - Covered camera-disabled state, frame application, emergency application, and offline timeout handling
- [x] **5.6** Finalize emergency audio recordings exactly once
  - Removed the competing auto-stop path that could drop audio before persistence ran
  - Persist partial recordings when monitoring stops or the emergency overlay is dismissed early
  - Keep the active incident ID in sync when the Supabase row replaces the temporary local ID
- [x] **5.7** Add TensorFlow backend fallback for monitoring initialization
  - Monitoring now falls back from `webgl` to `cpu` instead of failing outright on unsupported browsers or environments
- [x] **5.8** Harden org realtime refresh against transient channel subscribe failures
  - Org-scoped broadcast helpers now fail soft instead of surfacing blocking timeout errors
  - Org detail pages periodically re-fetch membership state so the grid converges even if a refresh broadcast is missed
  - Added regression coverage for successful org broadcasts and timeout-style no-send behavior

---

## Remaining Steps

- [x] **BUILD** `npm run build` — **PASSED** after hardening updates
- [x] **AUTOMATED TESTS** `npm test` — **PASSED** (14 regression tests)
- [x] **E2E TEST** Full signup-to-monitoring flow with two users
  - Validated on March 7, 2026 in isolated browser contexts:
    second user signed up, completed onboarding, joined the org, started monitoring, and appeared `LIVE` in the first user's org grid
- [ ] **E2E TEST** Org create/join/leave + in-session alert listener refresh with two users
- [ ] **E2E TEST** Emergency incident path from detection -> Supabase incident row -> audio metadata persistence
- [x] **E2E TEST** Camera sharing toggle while monitoring already active (feed should disappear/reappear without restart)
  - Validated on March 7, 2026 in an isolated production browser context:
    org grid starts offline, turns live after monitoring starts, flips to `CAMERA OFF` after disable, and returns to `LIVE` after re-enable
- [x] **E2E TEST** Org detail page should update when a second user joins/leaves the org in real time
  - Validated on March 7, 2026 in isolated browser contexts:
    second user join changed the first user's org detail page from `1 member` to `2 members`, and leaving returned it to `1 member`

---

## Files Created
| File | Purpose |
|---|---|
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client |
| `lib/supabase/middleware.ts` | Middleware session refresh + route protection |
| `lib/supabase/data.ts` | All data access functions (profiles, contacts, incidents, orgs) |
| `lib/supabase/realtime.ts` | Realtime broadcast helpers |
| `app/pages/organizations/page.tsx` | Org list/create/join UI |
| `app/pages/organizations/actions.ts` | Org server actions |
| `app/pages/organizations/[orgId]/page.tsx` | Org camera grid with realtime feeds |
| `components/org-alert-listener.tsx` | Global emergency alert listener |
| `lib/auth/reset-url.ts` | Password reset redirect URL helper |
| `lib/incidents/local-cache.ts` | Pure incident cache reconciliation helpers |
| `lib/ml/backend.ts` | TensorFlow backend initialization with browser-safe fallback |
| `lib/organizations/member-feeds.ts` | Pure org member feed state helpers |
| `lib/supabase/events.ts` | Shared client-side Supabase event names |
| `supabase-migration.sql` | Database schema (run manually in SQL Editor) |
| `supabase-fix-rls.sql` | Non-recursive RLS policy fix for org sharing |
| `tsconfig.tests.json` | Focused TypeScript config for regression tests |
| `tests/reset-url.test.ts` | Regression tests for password reset URL generation |
| `tests/local-cache.test.ts` | Regression tests for incident cache reconciliation |
| `tests/member-feeds.test.ts` | Regression tests for org member feed synchronization |
| `tests/realtime.test.ts` | Regression tests for org broadcast subscribe/send failover behavior |
| `tests/tf-backend.test.ts` | Regression tests for TensorFlow backend fallback logic |

## Files Modified
| File | Change |
|---|---|
| `.env` | Added Supabase URL + anon key + service role key |
| `package.json` | Added @supabase/supabase-js, @supabase/ssr |
| `app/(auth-pages)/forgot-password/page.tsx` | Removed stale demo copy; aligned UI with real reset flow |
| `middleware.ts` | Replaced cookie auth with Supabase session check |
| `app/actions.ts` | Replaced demo credentials with real Supabase Auth; fixed reset redirect + confirmation validation |
| `app/(auth-pages)/sign-in/page.tsx` | Removed demo hints, empty form fields |
| `app/(auth-pages)/sign-up/page.tsx` | Wired to real Supabase signUp |
| `app/pages/layout.tsx` | Supabase user, Organizations nav, OrgAlertListener |
| `app/protected/layout.tsx` | Same as pages/layout |
| `app/onboarding/page.tsx` | Saves profile to Supabase |
| `app/protected/page.tsx` | Loads data from Supabase |
| `app/pages/settings/page.tsx` | Read/write via Supabase |
| `app/pages/history/page.tsx` | Read/delete incidents via Supabase |
| `app/pages/live-feed/page.tsx` | Supabase data + frame broadcasting + emergency broadcast + incident/audio reconciliation |
| `app/pages/organizations/[orgId]/page.tsx` | Membership-gated org view with realtime member/camera-sync handling and periodic fallback refresh |
| `app/pages/organizations/page.tsx` | Dispatches org membership refresh events after create/join/leave and camera-sharing toggles |
| `components/org-alert-listener.tsx` | Re-subscribes org alert channels after membership changes |
| `lib/supabase/data.ts` | Added org membership lookup helper for protected org pages |
| `lib/supabase/realtime.ts` | Added camera-sharing broadcast helpers for active org sessions and fail-soft org-channel subscription handling |
