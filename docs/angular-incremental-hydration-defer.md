# Angular Incremental Hydration with `@defer`

[Angular Defer Hydration Flow](./angular_defer_hydration_flow.svg)

- SSR sends HTML, but JavaScript still matters.
- Sending too much JavaScript can still hurt performance.
- `@defer` can delay loading and hydration of specific blocks.
- `hydrate on viewport` is useful for below-the-fold content.
- `hydrate on interaction` is useful for UI that is visible but not immediately needed.
- `@placeholder` gives the server something lightweight to render first.
- Incremental hydration allows Angular to hydrate deferred blocks later.
- Event replay prevents fast user interactions from being lost.
- Inspecting built HTML can prove that defer hydration is registered.
- `jsaction` and `__nghDeferData__` are useful clues when debugging.
- Placeholders should match the final layout size to avoid layout shift.
- Do not defer critical above-the-fold content carelessly.

## Context

When using Angular SSR, the server can send meaningful HTML to the browser.

That improves the initial page load because the browser does not need to wait for the full client-side Angular application before showing content.

However, SSR alone does not solve every performance problem.

Even if the HTML is already rendered, the browser may still need to download, parse, and execute a large amount of JavaScript.

So the next question is:

> Now that the server sends HTML, how do we avoid sending too much JavaScript too early?

This is where Angular `@defer` and incremental hydration become useful.

## Main Idea

`@defer` allows Angular to delay loading and hydrating part of the page until a specific trigger happens.

Instead of hydrating the entire page immediately, Angular can hydrate specific blocks later.

This means:
SSR still sends useful HTML.
But Angular delays downloading/hydrating JavaScript for some parts.

This helps reduce the initial JavaScript cost.

## Why This Matters

Without deferral:

```
Initial page load
↓
Download JavaScript for the whole page
↓
Hydrate everything
↓
Page becomes interactive
```

With incremental hydration:

```
Initial page load
↓
Server sends HTML
↓
Browser hydrates only what is needed immediately
↓
Deferred blocks wait for their trigger
↓
JavaScript for deferred blocks loads later
```

The goal is not only to show HTML earlier.

The goal is also to avoid making the browser pay the JavaScript cost for parts of the page the user has not reached or interacted with yet.

## Viewport Deferral

```
Event details page
↓
Main event information is visible immediately
↓
Venue map is below the fold
↓
Map JavaScript should load only when the user scrolls near it
```

### Code example

```html
<!-- large spacer that pushes the map below the fold -->
<div class="h-96 p-12">
  <p>Check the venue details below</p>
</div>

<div class="bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
  @defer (hydrate on viewport) {
  <div class="h-140 bg-gray-200 rounded mb-4 overflow-hidden relative">
    <img [src]="'/images/venue-map.png'" class="w-full h-full object-cover" />
  </div>
  } @placeholder {
  <div
    class="h-140 bg-gray-100 rounded mb-4 flex items-center justify-center border-2 border-dashed border-gray-300"
  >
    <span class="text-gray-400">Map Loading...</span>
  </div>
  }
</div>
```

### What Happens on the Server

The server can render the placeholder immediately.

```
Server renders event details page
↓
Map block is deferred
↓
Placeholder is included in the server-rendered HTML
↓
Browser receives visible HTML immediately
```

The user sees a stable placeholder instead of waiting for the full map code to load.

### What Happens in the Browser

The browser does not immediately download and hydrate the JavaScript for the map block.

Instead:

```
Browser displays server-rendered HTML
↓
Map placeholder is visible when reached
↓
Angular waits for the viewport trigger
↓
When the map enters the viewport, Angular loads the deferred block
↓
Map block is hydrated/rendered
```

The key idea:

```
The map is not paid for during the initial page load.
It is paid for when the user is likely to need it.
```

## Mental model

```
@defer (hydrate on viewport)
= show placeholder first
= wait until block enters viewport
= then download/hydrate the real block
```

---

## Interaction Deferral

```
Button is visible immediately from SSR
↓
User hovers/clicks/interacts
↓
Angular loads the deferred block
↓
Click handler becomes active
```

### Code Example

```html
@defer (hydrate on interaction) {
<button
  (click)="addToCart()"
  class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition active:scale-95"
>
  Buy Ticket
</button>
} @placeholder {
<button class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold opacity-90">
  Buy Ticket
</button>
}
```

### What Happens on the Server

The server renders the placeholder button.

So the user immediately sees:

```
Buy Ticket
```

This is important because SSR keeps the page visually complete.

The user does not see an empty page or missing button.

### What Happens in the Browser

At first, the button is visible, but the full Angular code for the deferred block is not hydrated yet.

When the user interacts with it:

```
User clicks or interacts with the button
↓
Angular detects the interaction trigger
↓
Angular downloads/hydrates the deferred block
↓
The real button logic becomes active
↓
addToCart() can run
```

### Event Replay

A very important detail:

If the user clicks quickly before the block is fully hydrated, Angular can record the event and replay it later.

This works when incremental hydration is enabled.

Example:

```
Page loads
↓
Button is visible from SSR
↓
User clicks very fast
↓
Angular records the click
↓
Deferred code loads
↓
Angular hydrates the block
↓
Angular replays the click
↓
addToCart() runs
```

This prevents the user's early interaction from being lost.

---

## Verifying Defer Hydration in Built HTML

HTML contains hydration-related markers:

```
<button ... jsaction="click:;keydown:;" ngb="d1">
  Buy Tickets
</button>
```

`jsaction="click:;keydown:;"` means Angular has registered event information for replay/hydration.

## Rendered HTML vs Hydrated Angular Code

A key mental model:

```
SSR HTML
= what the user can see

Hydrated Angular code
= what the user can interact with
```

With incremental hydration:

```
A block can be visible before it is fully interactive.
```

For example:

```
Buy Ticket button
↓
Visible from SSR immediately
↓
But click logic may be deferred
↓
Angular loads/hydrates it on interaction
```
