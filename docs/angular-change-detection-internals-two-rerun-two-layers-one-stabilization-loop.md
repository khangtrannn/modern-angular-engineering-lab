# Angular Change Detection Internals: Two Rerun Guards, Two Layers, One Stabilization Loop

> **Status**: Personal engineering note derived from a deep-dive into Angular source code internals.
> Sections marked **[Working mental model]** are inferred from behavioral understanding.
> Sections marked **[Needs source verification]** should be confirmed against Angular source before publishing.
> All diagrams are verified against `change_detection.ts` (main branch, May 2026) and real GitHub issue stack traces unless explicitly marked otherwise.

---

## The Question That Started This

If you search for `MAXIMUM_REFRESH_RERUNS` inside the Angular monorepo, you find it defined **twice**, in two completely different files, with two completely different values:

```
packages/core/src/application/application_ref.ts
→ const MAXIMUM_REFRESH_RERUNS = 10

packages/core/src/render3/instructions/change_detection.ts
→ export const MAXIMUM_REFRESH_RERUNS = 100
```

Same name. Different values. Different files. Different layers.

Understanding why requires understanding the full call structure from `ApplicationRef.tick()` down through `detectChangesInViewWhileDirty` → `detectChangesInView` → `refreshView` → `detectChangesInChildComponents`.

---

## Source-Verified Call Structure Overview

Before anything else, here is the actual function call hierarchy as verified against Angular source:

```
// ── CALL STRUCTURE ──────────────────────────────────────────────────────────
// Verified against:
//   packages/core/src/render3/instructions/change_detection.ts (main branch)
//   GitHub issue #63094 real production stack trace

ApplicationRef.tick()
└─ for each attached view:
     detectChangesInViewIfRequired(attachedLView, ...)
       └─ detectChangesInternal(lView, mode)
            └─ detectChangesInViewWhileDirty(lView, mode)
                 │
                 ├─ detectChangesInView(lView, mode)         ← INITIAL PASS
                 │    └─ [maybe] refreshView(tView, lView, templateFn, context)
                 │         ├─ executeTemplate(...)
                 │         ├─ pre-order hooks (OnInit, DoCheck, OnChanges)
                 │         ├─ detectChangesInEmbeddedViews(lView, Global)
                 │         ├─ refreshContentQueries(...)
                 │         ├─ content hooks (AfterContentInit, AfterContentChecked)
                 │         ├─ processHostBindingOpCodes(...)
                 │         ├─ detectChangesInChildComponents(lView, components, Global)
                 │         │    └─ for each child component:
                 │         │         detectChangesInView(childLView, Global)
                 │         │              └─ [same structure, recursively]
                 │         ├─ view queries
                 │         └─ view hooks (AfterViewInit, AfterViewChecked)
                 │
                 └─ while (requiresRefreshOrTraversal(lView)):  ← POST-PASS LOOP
                      retries++ (max MAXIMUM_REFRESH_RERUNS = 100)
                      detectChangesInView(lView, Targeted)
```

<!-- Verified: refreshView source in change_detection.ts shows detectChangesInChildComponents
     called inside refreshView, before refreshView returns.
     The while loop is in detectChangesInViewWhileDirty, which wraps the initial
     detectChangesInView call.
     Stack trace from GitHub issue #63094 confirms:
     refreshView → detectChangesInChildComponents → detectChangesInComponent →
     detectChangesInViewIfAttached → detectChangesInView → refreshView -->

---

## The Critical Correction: When Children Are Reached

The previous version of this note contained this claim:

> `hero-child` is only reached after `hero`'s own `while (requiresRefreshOrTraversal)` loop has fully stabilized.

**This is wrong.** The source proves the opposite.

`detectChangesInChildComponents` is called **inside** `refreshView`, near the end of the function. The `while (requiresRefreshOrTraversal(lView))` loop lives in `detectChangesInViewWhileDirty`, which only executes **after** the entire initial `detectChangesInView` call — including all child component visits — has completed.

```
// ── CORRECTED ORDERING ──────────────────────────────────────────────────────
// Verified: detectChangesInChildComponents is called inside refreshView in source.
// The while loop runs in detectChangesInViewWhileDirty after the initial pass.

detectChangesInViewWhileDirty(heroLView, Global)
│
├─ [STEP 1] detectChangesInView(heroLView, Global)      ← initial full pass
│    └─ refreshView(heroLView)
│         ├─ executeTemplate(heroLView)
│         ├─ [hooks, embedded views, queries, host bindings]
│         └─ detectChangesInChildComponents(heroLView)
│              └─ detectChangesInView(heroChildLView, Global)
│                   └─ refreshView(heroChildLView)   ← hero-child visited HERE
│                        └─ [...hero-child's subtree]
│    ← refreshView(heroLView) returns
│    ← STEP 1 complete
│
└─ [STEP 2] while (requiresRefreshOrTraversal(heroLView)):
     └─ detectChangesInView(heroLView, Targeted)
          └─ [targeted traversal — only RefreshView-flagged views re-executed]
```

<!-- CORRECTION: The while loop (STEP 2) fires only after STEP 1 completes entirely,
     including all child component visits. hero-child is reached in STEP 1, not after STEP 2. -->

**The consequence**: a signal inside `hero`'s template being re-dirtied during `hero`'s initial refresh does not prevent `hero-child` from being visited in that same pass. `hero-child` is refreshed as part of `refreshView(heroLView)` in STEP 1. The `while` loop that retries `heroLView` in `Targeted` mode fires *after* `hero-child` has already been visited.

---

## Two Constants, Two Layers

### Layer 1: `application_ref.ts` → `MAXIMUM_REFRESH_RERUNS = 10`

**Scope**: The outer application tick loop.

```typescript
// Verified: constant declaration and doc comment from application_ref.ts (main branch)
/** Maximum number of times ApplicationRef will refresh all attached views in a single tick. */
const MAXIMUM_REFRESH_RERUNS = 10;
```

The doc comment is precise: "refresh all **attached views** in a single tick." This guards reruns of the full attached-view iteration. If any attached view needs re-traversal after the full tick pass, the tick reruns.

<!-- Working mental model: the exact loop structure inside application_ref.ts was not
     fully fetched due to network restrictions. The constant, its doc comment, and
     detectChangesInViewIfRequired being called per attached view are confirmed.
     The outer rerun logic is inferred from doc comment + search results. -->

**Why only 10?** Each rerun here calls `detectChangesInViewWhileDirty` on potentially every attached root view — a full subtree traversal per view. Ten reruns of all attached views is already a strong signal of a genuine cycle. Keeping this low prevents catastrophic performance degradation.

---

### Layer 2: `change_detection.ts` → `MAXIMUM_REFRESH_RERUNS = 100`

**Scope**: The post-initial-pass stabilization loop inside `detectChangesInViewWhileDirty`.

```typescript
// Verified: exact code from change_detection.ts (main branch)
export const MAXIMUM_REFRESH_RERUNS = 100;

function detectChangesInViewWhileDirty(lView: LView, mode: ChangeDetectionMode) {
  // ...
  detectChangesInView(lView, mode);  // initial pass — child components ARE visited here

  // ...
  let retries = 0;  // ← local variable, independent per call frame
  while (requiresRefreshOrTraversal(lView)) {
    if (retries === MAXIMUM_REFRESH_RERUNS) {
      throw new RuntimeError(RuntimeErrorCode.INFINITE_CHANGE_DETECTION, '...');
    }
    retries++;
    detectChangesInView(lView, ChangeDetectionMode.Targeted);
  }
}
```

<!-- Verified: `retries` is `let retries = 0` inside detectChangesInViewWhileDirty.
     It is a local variable, NOT shared across calls to this function for different LViews.
     Each call frame gets an independent counter. -->

**Why 100?** `Targeted` mode reruns skip every view without `RefreshView` set, navigating only the dirty path via `HasChildViewsToRefresh`. Cost per retry is low. More retries are justified before declaring an infinite loop, to accommodate legitimate signal cascades.

**The counter is local to the call frame**: `let retries = 0` is declared inside `detectChangesInViewWhileDirty`. Each call for a different `lView` gets its own independent counter from zero.

---

## Side-by-Side Comparison

| Aspect | `application_ref.ts` (10) | `change_detection.ts` (100) |
|---|---|---|
| Layer | Application tick (macro) | Per `detectChangesInViewWhileDirty` call (micro) |
| What reruns | All attached views | The specific `lView` passed to `detectChangesInViewWhileDirty` |
| CD mode per retry | Full traversal (`Global`) | `Targeted` only |
| Cost per retry | High (full attached-view set) | Low (only `RefreshView`-flagged views) |
| Counter scope | [Working mental model] Per tick | Verified: local `let` per `detectChangesInViewWhileDirty` call frame |
| Trigger | Attached view needs re-traversal after full tick | `requiresRefreshOrTraversal(lView)` is true after initial pass |

---

## The Component Tree Example — Corrected

```html
<!-- app root template -->
<root>
  <hero />
</root>

<!-- hero template -->
<div>
  <hero-child />
</div>

<!-- hero-child template -->
<div>Some template</div>
```

### Corrected Call Flow

```
// ── COMPONENT TREE CALL FLOW ─────────────────────────────────────────────────
// Verified: based on refreshView source showing detectChangesInChildComponents
// called inside refreshView. Stack trace from GitHub issue #63094 confirms
// the exact intermediary functions.

ApplicationRef.tick()
└─ detectChangesInViewIfRequired(rootLView)
     └─ detectChangesInternal(rootLView)
          └─ detectChangesInViewWhileDirty(rootLView, Global)
               │
               ├─ detectChangesInView(rootLView, Global)         ← INITIAL PASS starts
               │    └─ refreshView(rootLView)
               │         ├─ executeTemplate(rootLView)           ← processes <hero /> element
               │         └─ detectChangesInChildComponents(rootLView)
               │              └─ detectChangesInView(heroLView, Global)
               │                   └─ refreshView(heroLView)
               │                        ├─ executeTemplate(heroLView)  ← processes <hero-child />
               │                        │   [heroSignal() read here — dependency tracked]
               │                        └─ detectChangesInChildComponents(heroLView)
               │                             └─ detectChangesInView(heroChildLView, Global)
               │                                  └─ refreshView(heroChildLView)
               │                                       └─ executeTemplate(heroChildLView)
               │                                            [hero-child's template runs here]
               │    ← ALL child visits complete. INITIAL PASS ends.
               │
               └─ while (requiresRefreshOrTraversal(rootLView)):  ← POST-PASS LOOP
                    [if rootLView or any descendant was re-dirtied during the initial pass]
                    retries++ (max 100)
                    detectChangesInView(rootLView, Targeted)
                         └─ [navigates dirty path via HasChildViewsToRefresh / RefreshView]
```

<!-- CORRECTION from previous version: hero-child is visited during the initial pass,
     inside refreshView(heroLView), not after the while loop. The while loop runs
     after the entire initial subtree visit is complete. -->

---

## `detectChangesInView` — The Decision Point

```typescript
// Verified: doc comment from change_detection.ts (main branch)
/**
 * Visits a view as part of change detection traversal.
 *
 * The view is refreshed if:
 * - If the view is CheckAlways or Dirty and ChangeDetectionMode is `Global`
 * - If the view has the `RefreshView` flag
 *
 * The view is not refreshed, but descendants are traversed in ChangeDetectionMode.Targeted
 * if the view HasChildViewsToRefresh flag is set.
 */
function detectChangesInView(lView: LView, mode: ChangeDetectionMode) {
  // Refresh CheckAlways views in Global mode
  let shouldRefreshView: boolean = !!(
    mode === ChangeDetectionMode.Global && flags & LViewFlags.CheckAlways
  );
  // Also refreshes Dirty views in Global mode, and RefreshView views in any mode
  // [Full flag-checking logic needs complete source read — Needs source verification]

  if (shouldRefreshView) {
    refreshView(tView, lView, tView.template, context);
    // child components reached inside refreshView, above
  }

  // In Targeted mode: if HasChildViewsToRefresh, traverse without refreshing this view
  // [Needs source verification: exact traversal logic in Targeted mode]
}
```

`detectChangesInView` is the branching decision point. It either calls `refreshView` (which includes the child descent) or skips `refreshView` and handles targeted descendant traversal. It does not contain the retry loop — that belongs to `detectChangesInViewWhileDirty`.

---

## `refreshView` Is Not Self-Recursing

The actual call chain verified from source and stack traces:

```
// ── ACTUAL CALL CHAIN ────────────────────────────────────────────────────────
// Verified: detectChangesInChildComponents is called inside refreshView.
// Real stack trace from GitHub issue #63094:
//   refreshView → detectChangesInChildComponents → detectChangesInComponent →
//   detectChangesInViewIfAttached → detectChangesInView → refreshView (child)

refreshView(heroLView)
  └─ detectChangesInChildComponents(heroLView, tView.components, Global)
       └─ for each component index in tView.components:
            detectChangesInComponent(heroLView, componentIndex, mode)
              └─ detectChangesInViewIfAttached(heroChildLView, ...)
                   └─ detectChangesInView(heroChildLView, Global)
                        └─ refreshView(heroChildLView)   ← child's own refresh, not recursion
```

`refreshView` does not call itself. It calls `detectChangesInChildComponents`, which goes through several intermediary functions before calling `detectChangesInView(childLView)`, which may then call `refreshView(childLView)`. The chain between parent `refreshView` and child `refreshView` is: `detectChangesInChildComponents → detectChangesInComponent → detectChangesInViewIfAttached → detectChangesInView`.

---

## `requiresRefreshOrTraversal` — Two Duties

```typescript
// Working mental model: exact implementation from view_utils.ts not verified.
// Semantics confirmed from detectChangesInView doc comment in change_detection.ts.
function requiresRefreshOrTraversal(lView: LView): boolean {
  return !!(lView[FLAGS] & (
    LViewFlags.RefreshView            |  // this view needs re-execution
    LViewFlags.HasChildViewsToRefresh    // a descendant needs refresh
  ));
}
```

### Flag 1: `RefreshView`

Confirmed set by: `ChangeDetectorRef.detectChanges()` — from `view_ref.ts`:

```typescript
// Verified from view_ref.ts (main branch)
detectChanges(): void {
  // Add `RefreshView` flag to ensure this view is refreshed if not already dirty.
  // `RefreshView` flag is used intentionally over `Dirty` because it gets cleared before
  // executing any of the actual refresh code while the `Dirty` flag doesn't get cleared
  // until the end of the refresh.
  this._lView[FLAGS] |= LViewFlags.RefreshView;
  detectChangesInternal(this._lView);
}
```

Also set when a signal consumed in this view's template is invalidated. **[Needs source verification]**: the exact mechanism in `reactive_lview_consumer.ts` that sets `RefreshView` on signal invalidation.

**[Needs source verification]**: Whether `markForCheck()` sets `RefreshView`, `Dirty`, or both, and how these two flags differ in clearing behavior (the `view_ref.ts` comment says `RefreshView` clears before template execution while `Dirty` clears at the end of refresh — this is an important distinction).

### Flag 2: `HasChildViewsToRefresh`

Set when a descendant `LView` is marked with `RefreshView`. Angular propagates this flag upward through the ancestor chain. The function `markAncestorsForTraversal` is imported and called inside `refreshView`'s error handler in the source, suggesting it is responsible for this propagation.

```
// ── FLAG PROPAGATION ─────────────────────────────────────────────────────────
// Working mental model: propagation mechanism inferred from flag semantics
// and markAncestorsForTraversal import in change_detection.ts.
// Exact call site for signal-driven propagation needs verification
// in reactive_lview_consumer.ts.

rootLView        [HasChildViewsToRefresh]  ← propagated upward
  └─ heroLView   [HasChildViewsToRefresh]  ← propagated upward
       └─ heroChildLView  [RefreshView]   ← actually needs refresh
```

In `Targeted` mode, `requiresRefreshOrTraversal(rootLView)` returns `true` via `HasChildViewsToRefresh` — not because `rootLView` itself needs refreshing. Angular walks down the dirty path to `heroChildLView` without re-executing `rootLView`'s or `heroLView`'s templates.

### The Two Duties Together

```
// ── CONCEPTUAL STABILIZATION LOOP ────────────────────────────────────────────
// Verified: while loop structure from detectChangesInViewWhileDirty source.

Initial detectChangesInView(lView, Global) runs (STEP 1)
  → child components visited during this pass
  ↓
[During or after refreshView, a view is re-dirtied]
  ↓
requiresRefreshOrTraversal(lView) === true
  ↓
DUTY 1 — RefreshView on lView itself:
  → Targeted pass re-executes lView's own template
DUTY 2 — HasChildViewsToRefresh on lView:
  → Targeted traversal walks down to the dirty descendant
    without re-executing lView's own template
  ↓
Repeat until stable or retries === 100
```

---

## `ChangeDetectionMode.Global` vs `ChangeDetectionMode.Targeted`

```typescript
// Verified: enum doc comment from change_detection.ts (main branch)
export const enum ChangeDetectionMode {
  /**
   * In `Global` mode, `Dirty` and `CheckAlways` views are refreshed as well as
   * views with the `RefreshView` flag.
   */
  Global,

  /**
   * In `Targeted` mode, only views with the `RefreshView` flag or updated signals
   * are refreshed.
   */
  Targeted,
}
```

| Mode | Who gets `refreshView` called | When used |
|---|---|---|
| `Global` | `CheckAlways` views, `Dirty` views, `RefreshView` views | Initial pass in `detectChangesInViewWhileDirty` |
| `Targeted` | Only `RefreshView` views; clean ancestors traversed via `HasChildViewsToRefresh` | The `while` stabilization loop |

`Targeted` mode is what makes the 100-retry limit practical — it skips template re-execution for clean views entirely.

---

## The Full Picture: How the Two Guards Interact

```
// ── TWO-GUARD INTERACTION ─────────────────────────────────────────────────────
// Inner loop structure: verified from detectChangesInViewWhileDirty source.
// Outer loop structure: working mental model (application_ref.ts not fully fetched).
// MAXIMUM_REFRESH_RERUNS = 10 doc comment confirmed from search results.

ApplicationRef.tick()                                ← outer guard scope (max 10)
│
└─ for each attached view:
     detectChangesInViewIfRequired(attachedLView)
       └─ detectChangesInternal(lView)
            └─ detectChangesInViewWhileDirty(lView)  ← inner guard scope (max 100)
                 │
                 ├─ detectChangesInView(lView, Global)     ← full subtree, children included
                 │
                 └─ while requiresRefreshOrTraversal(lView):
                      detectChangesInView(lView, Targeted) ← targeted stabilization

[If any attached view still needs traversal after all per-tick calls complete]
→ outer counter increments, tick reruns (max 10)
→ each rerun gives each lView a fresh inner counter starting at 0
```

---

## OnPush Behavior

```
<root>          CheckAlways    → refreshView always called in Global mode
  <hero>        CheckAlways    → refreshView always called in Global mode
    <hero-child> OnPush        → refreshView called ONLY IF one of these flags is set:
                                 - Dirty (set by @Input reference change from CheckAlways parent)
                                 - RefreshView (set by signal invalidation, detectChanges(), etc.)
                                 [Needs source verification: exact flag check for OnPush
                                  in detectChangesInView's Global mode branch]
```

**[Needs source verification]**: Whether `detectChangesInView` in `Global` mode descends into `OnPush` child views for potential `HasChildViewsToRefresh` traversal when neither `Dirty`, `CheckAlways`, nor `RefreshView` is set — or whether it short-circuits entirely. The doc comment covers `Targeted` mode traversal via `HasChildViewsToRefresh`; `Global` mode behavior for clean `OnPush` views needs full source confirmation.

---

## My Refined Mental Model

**`detectChangesInViewWhileDirty(lView, mode)`** owns the 100-retry stabilization loop. It calls `detectChangesInView` once for the initial pass — during which the full subtree (including all descendant components) is visited — and then retries in `Targeted` mode while `requiresRefreshOrTraversal(lView)` is true. The retry loop runs *after* children have already been visited, not before.

**`detectChangesInView(lView, mode)`** is the branching decision point. It checks flags and mode to decide whether to call `refreshView`. It does not own the retry loop. It does not itself descend into children — that happens inside `refreshView`.

**`refreshView(tView, lView, templateFn, context)`** is where the real work happens: template execution, lifecycle hooks in order, and — critically — `detectChangesInChildComponents`, which descends into child component views. Children are reached **during `refreshView`**, before `refreshView` returns. The stabilization loop fires after.

**`detectChangesInChildComponents`** iterates component indices in `tView.components` and calls through `detectChangesInComponent → detectChangesInViewIfAttached → detectChangesInView(childLView)`. This is the actual child descent, not a direct `refreshView` call.

**`requiresRefreshOrTraversal(lView)`** checks two flags on the given `lView`:
- `RefreshView`: re-execute this view's template in `Targeted` mode
- `HasChildViewsToRefresh`: walk through this view toward a dirty descendant without re-executing its template

**The key insight about ordering**: the retry loop is a *post-pass* mechanism. It handles views that became dirty *after* a complete initial tree traversal. It does not replace or precede child component visits — those happen inside `refreshView` during the initial pass.

---

## Potential Blog Angles

### 1. "The Two Rerun Guards Inside Angular Change Detection"
Direct explanation of the two constants, their functions, and why they differ by an order of magnitude. Good entry point for intermediate Angular developers who have encountered `INFINITE_CHANGE_DETECTION`.

### 2. "Why Angular Signals Need a Stabilization Loop"
Focus on signals as the primary motivation for `detectChangesInViewWhileDirty`. Explain how reactive graphs can re-dirty views after a refresh pass, and how the 100-retry `Targeted` loop handles this gracefully.

### 3. "`RefreshView` vs `HasChildViewsToRefresh`: How Angular Finds Dirty Views in Targeted Mode"
Focus on the two `LViewFlags` and their roles. The routing/bridge nature of `HasChildViewsToRefresh` is underexplained in public Angular content. Strong diagram-driven post.

### 4. "`refreshView` Is Not Recursive — And the Ordering That Matters"
The key corrected insight from this note: children are visited *during* `refreshView`, not after. The stabilization loop is a post-subtree mechanism. This is counterintuitive and almost never explained correctly.

### 5. "Reading Angular Source: Two Constants With the Same Name"
Narrative source-reading post using the two `MAXIMUM_REFRESH_RERUNS` constants as the hook to explain the entire CD pipeline. Good for developers who enjoy systems-level exploration.

---

## Things To Verify in Angular Source Code

- [x] `MAXIMUM_REFRESH_RERUNS = 100` location and scope — confirmed as local `let retries` inside `detectChangesInViewWhileDirty`
- [x] `MAXIMUM_REFRESH_RERUNS = 10` doc comment — confirmed: "Maximum number of times ApplicationRef will refresh all attached views in a single tick"
- [x] `refreshView` calls `detectChangesInChildComponents` internally — confirmed; children are visited **inside** `refreshView`, not after the `while` loop
- [x] `while` loop lives in `detectChangesInViewWhileDirty`, not `detectChangesInView` — confirmed
- [x] `ChangeDetectionMode` enum values and doc comments — confirmed
- [x] Real call stack: `refreshView → detectChangesInChildComponents → detectChangesInComponent → detectChangesInViewIfAttached → detectChangesInView` — confirmed from GitHub issue #63094 stack trace
- [x] `RefreshView` explicitly set by `ChangeDetectorRef.detectChanges()` — confirmed from `view_ref.ts`
- [x] `RefreshView` clears before template execution; `Dirty` clears at end of refresh — confirmed from `view_ref.ts` comment
- [ ] `detectChangesInView` full flag-checking logic for `OnPush` in `Global` mode — needs complete source read
- [ ] `requiresRefreshOrTraversal` exact bitmask implementation — needs verification from `view_utils.ts`
- [ ] `HasChildViewsToRefresh` propagation call site — `markAncestorsForTraversal` imported in `change_detection.ts`; verify it is called on signal-driven re-dirty in `reactive_lview_consumer.ts`
- [ ] `markForCheck()` flag behavior — whether it sets `Dirty`, `RefreshView`, or both
- [ ] Application-level outer loop exact structure — `MAXIMUM_REFRESH_RERUNS = 10` and `detectChangesInViewIfRequired` confirmed; exact rerun loop in `application_ref.ts` needs full source read
- [ ] `OnPush` traversal in `Global` mode without dirty flags — whether `detectChangesInView` descends or short-circuits
- [ ] `detectChangesInEmbeddedViews` vs `detectChangesInChildComponents` — both called inside `refreshView`; verify which handles which view types

---

## Source Files Reference

| Concept | Source File | Verification Status |
|---|---|---|
| Outer 10-rerun guard | `packages/core/src/application/application_ref.ts` | Partially verified (constant + doc comment confirmed) |
| Inner 100-rerun guard + `detectChangesInViewWhileDirty` | `packages/core/src/render3/instructions/change_detection.ts` | Verified |
| `refreshView` implementation and child descent | `packages/core/src/render3/instructions/change_detection.ts` | Verified |
| `detectChangesInView` doc comment and partial logic | `packages/core/src/render3/instructions/change_detection.ts` | Partially verified |
| `ChangeDetectionMode` enum | `packages/core/src/render3/instructions/change_detection.ts` | Verified |
| `RefreshView` flag behavior | `packages/core/src/render3/view_ref.ts` | Verified (detectChanges sets it explicitly) |
| `LViewFlags` definitions | `packages/core/src/render3/interfaces/view.ts` | Needs verification |
| `requiresRefreshOrTraversal` exact implementation | `packages/core/src/render3/util/view_utils.ts` | Needs verification |
| `markAncestorsForTraversal` | `packages/core/src/render3/util/view_utils.ts` | Imported in change_detection.ts; exact behavior needs verification |
| Signal consumer / view re-dirtying mechanism | `packages/core/src/render3/reactive_lview_consumer.ts` | Needs verification |

---

## Corrections Made

### 1. **Major: `hero-child` timing was wrong**
**Previous claim**: "hero-child is only reached after hero's own `while (requiresRefreshOrTraversal)` loop has fully stabilized."
**Correction**: `hero-child` is reached **during** `refreshView(heroLView)`, inside `detectChangesInChildComponents`, before `refreshView` returns. The `while` loop runs after the entire initial subtree pass — including all child component visits — has completed.

### 2. **Major: The `while` loop belongs to `detectChangesInViewWhileDirty`, not `detectChangesInView`**
**Previous diagrams**: implied the `while` loop was part of `detectChangesInView`.
**Correction**: The retry loop lives in `detectChangesInViewWhileDirty`, a wrapper function. `detectChangesInView` itself has no retry loop.

### 3. **Major: Function names corrected**
**Previous note**: used `refreshChildComponents` as the function name for child component descent.
**Correction**: The actual function names are `detectChangesInChildComponents` (for component views) and `detectChangesInEmbeddedViews` (for embedded views). Both are called inside `refreshView`.

### 4. **Major: `refreshView` internal order clarified**
**Previous note**: implied a simple `executeTemplate → refreshChildComponents` structure.
**Correction**: The actual order inside `refreshView` is: `executeTemplate` → pre-order hooks → `detectChangesInEmbeddedViews` → content queries → content hooks → `processHostBindingOpCodes` → `detectChangesInChildComponents` → view queries → view hooks.

### 5. **Minor: "Entire application" phrasing corrected**
**Previous**: "reruns the entire application."
**Correction**: Replaced with "reruns `detectChangesInViewIfRequired` for all attached views" — matching the doc comment's exact language.

### 6. **Minor: `RefreshView` for "new views" claim removed**
**Previous**: stated "new views get RefreshView set."
**Correction**: Removed this claim as it was not verified. The confirmed `RefreshView` setter is `detectChanges()` in `view_ref.ts`. First-time initialization behavior needs separate verification.

---

*Note v2 — verified against Angular `change_detection.ts` and `view_ref.ts` main branch (May 2026), GitHub issue #63094 stack trace, and search-confirmed doc comments. Ready for source verification checklist pass before publishing.*
