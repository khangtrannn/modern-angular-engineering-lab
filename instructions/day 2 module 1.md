# Day 2 - Module 1: Next-Gen Rendering & Performance

**Goal:** Transform the "DevFest Manager" into a high-performance application. You will remove Zone.js to enable **Zoneless** change detection, optimize Largest Contentful Paint (LCP) with **`NgOptimizedImage`**, and implement **Incremental Hydration** using `@defer`.

**Estimated Time:** 80 Minutes

---

## 🛠️ Prerequisites

1.  **Terminal:** Ensure `npm run dev` is running.
2.  **State:** Your app should be working (Events list, Details page, Cart logic from Day 1).
3.  **DevTools:** Open Chrome DevTools (F12) and install the **Angular DevTools** extension if you haven't already.

---

## Step 1: Going Zoneless

Latest Angular runs even faster and with a smaller bundle size without `zone.js`.

1.  Open **`src/app/app.config.ts`**.
2.  Replace the legacy `provideZoneChangeDetection` with **`provideZonelessChangeDetection`**.

```typescript
// src/app/app.config.ts
import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. ENABLE ZONELESS RUNTIME
    provideZonelessChangeDetection(),
    // ...
  ],
};
```

3.  **Remove the Polyfill (Crucial):**
    Open **`angular.json`**.
    Find the `polyfills` array under `architect` -> `build` -> `options`.
    Remove `"zone.js"`.

```json
// angular.json
"polyfills": [
  // "zone.js"  <-- DELETE THIS LINE
],
```

4.  **Restart the Server:**
    Because we changed `angular.json`, the hot-reload won't pick it up.
    - Go to your terminal.
    - Press `Ctrl + C`.
    - Run `npm run dev` again.

5.  **Verification:**
    - Open **DevTools -> Network** tab.
    - Refresh the page.
    - Look for the `polyfills.js` chunk. It should be significantly smaller (or look inside it to ensure Zone code is gone).
    - **Profiler:** Run the Angular DevTools Profiler. The timeline should be free of "Zone" overhead bars.

---

## Step 2: Optimizing Images (LCP)

In Day 1, we used a standard `<img>` tag in `EventCard`. This hurts our "Largest Contentful Paint" score because the browser doesn't know how to prioritize it.

1.  Open **`src/app/features/events/event-card.ts`**.
2.  Import `NgOptimizedImage` from `@angular/common` and add it to `imports`.

```typescript
// src/app/features/events/event-card.ts
import { Component, input, output, linkedSignal, computed } from '@angular/core';
import { DatePipe, NgOptimizedImage } from '@angular/common'; // Import
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-event-card',
  imports: [DatePipe, RouterLink, NgOptimizedImage], // Add to imports
  template: `...`,
})
export class EventCard {
  // ...
}
```

3.  Update the template to use the directive.

```html
<!-- Inside the template -->
<div class="relative h-48 w-full bg-gray-200">
  <!--
    OLD: <img [src]="image()" class="object-cover w-full h-full" ...>

    NEW: NgOptimizedImage
    - ngSrc: Triggers the optimization logic
    - fill: Forces image to fill the parent container (prevents Layout Shift)
    - width / height: optimizations for image loaders
    - priority: Tells browser to load this ASAP (Critical for LCP)
  -->
  <img
    [ngSrc]="image()"
    width="500"
    height="200"
    priority
    class="object-cover"
    alt="Event thumbnail"
  />
</div>
```

> **Why `priority`?** Because these cards are at the top of the home page ("Above the Fold"). For images further down the page, you would omit `priority` to get automatic Lazy Loading.

BONUS: Custom image loader.

Images stored in Firebase Storage and transformed using Cloudflare Image Transformations. Transformed images for specific sizes are cached on Cloudflare edge locations.

```typescript
// src/app/app.config.ts
import { IMAGE_LOADER, ImageLoaderConfig } from '@angular/common';

export const appConfig: ApplicationConfig = {
  providers: [
    // ...
    {
      provide: IMAGE_LOADER,
      useValue: (config: ImageLoaderConfig) => {
        // remove /images/ from src
        const src = config.src.replace('/images/', '');
        return `https://static-assets.dev/cdn-cgi/image/width=${config.width},format=auto/https://storage.googleapis.com/images-cdn-e0395.firebasestorage.app/${src}`;
      },
    },
  ],
};
```

---

## Step 3: Enabling SSR & Hydration

To use Hydration, we first need to render the application on the server. We will use the Angular CLI schematic to convert our client-side app to a full-stack SSR app.

1.  **Stop the Server:**
    Go to your terminal and press `Ctrl + C` to stop `npm run dev`.

2.  **Run the SSR Schematic:**
    Run the following command. This automates the entire setup (creating `server.ts`, updating `angular.json`, and configuring hydration).

    ```bash
    ng add @angular/ssr
    ```

    - If asked "Skip installation of packages?", choose **No**.

3.  **Verify Configuration:**
    Open **`src/app/app.config.ts`**.
    The schematic should have automatically added `provideClientHydration()` (and `withIncrementalHydration()`).

    Ensure it looks like this:

    ```typescript
    import { provideClientHydration, withIncrementalHydration() } from '@angular/platform-browser';

    export const appConfig: ApplicationConfig = {
      providers: [
        provideZonelessChangeDetection(),

        provideClientHydration(withIncrementalHydration()),

        provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
        provideHttpClient(withFetch()),
        { provide: API_URL, useValue: 'http://localhost:3000' },
      ],
    };
    ```

4.  Add Server routes configuration.

Open **`src/app/app.routes.server.ts`**.

Add the following code:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  {
    path: 'event/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return [{ id: '1' }, { id: '2' }];
    },
  },
  {
    path: 'admin/create',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

4.  **Restart the Server:**
    - start json-server `npm run server`.
    - Run `npm run build`. Json-server should be running in the background otherwise the won't be prerendered events data.
    - Run `npm run serve:ssr:modern-angular-engineering-lab`.

5.  **Verify SSR is Working:**
    - Open **DevTools -> Network** tab.
    - Open `http://localhost:4000`.
    - Click on the **Doc** request (the first request, usually `localhost`).
    - Look at the **Response** (or Preview) tab.
    - **Observe:** You should see full HTML content (Event titles, descriptions) _rendered in the source_. In Day 1, this was just an empty `<app-root></app-root>`.

---

## Step 4: Viewport Deferral (`@defer`)

Now that we are sending HTML from the server, we want to be careful not to send _too much_ JavaScript. We will lazy-load the heavy "Venue Map".

Open **`src/app/features/events/event-details.ts`**.

1.  Wrap the Map section in a `@defer` block with a special **Hydration Trigger**.

```html
<!-- src/app/features/events/event-details.ts template -->

 <!-- large spacer that pushes the map below the fold (deferred). -->
<div class="h-96 p-12">
<p>Check the venue details below</p>
</div>

<div class="bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
<!--
@defer (hydrate on viewport)
SSR Behavior: The SERVER renders the @placeholder content (or the main content if compatible).
Hydration Behavior: The browser downloads the JS for this block ONLY when it enters the viewport.
-->
@defer (hydrate on viewport) {
    <div class="h-140 bg-gray-200 rounded mb-4 overflow-hidden relative">
    <img [src]="'/images/venue-map.png'" class="w-full h-full object-cover" />
    </div>
} @placeholder {
    <!-- Rendered instantly on Server, visible immediately -->
    <div
    class="h-140 bg-gray-100 rounded mb-4 flex items-center justify-center border-2 border-dashed border-gray-300"
    >
    <span class="text-gray-400">Map Loading...</span>
    </div>
}
</div>
</div>
```

---

## Step 5: Interaction Deferral

Update the "Buy Button" section in **`event-details.ts`**.

for interaction deferral we need to start the server without Hot Module Replacement (HMR).

```bash
ng serve --no-hmr
```

```html
<!--
  hydrate on interaction:
  The button is visible (SSR), but the Angular Code to handle the click (addToCart)
  is not downloaded until the user hovers/clicks.

  withIncrementalHydration() (enabled in Step 3) ensures that incremental hydration is enabled and event replay comes as part of it. If they click FAST, the click is recorded and replayed once the code downloads.
-->
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

---

## Step 6: Final Verification

1.  **Hydration Overlay:**
    - Open **Angular DevTools** -> **Profiler**.
    - Enable the "Hydration Overlay" (if available in settings) or simply look at the Component Tree.
    - You should see components marked as **"Hydrated"**.
2.  **View Source:**
    - Right-click the page -> "View Page Source".
    - Confirm that your event data is in the HTML.
3.  **Lighthouse:**
    - Run a Lighthouse audit. You should see improved **LCP** (thanks to SSR) and **TTI** (Time to Interactive, thanks to Zoneless + Defer).

---

### Module 1 Complete! ✅

You have successfully migrated to **Full Stack Angular**.

- **SSR:** `ng add @angular/ssr` enabled server rendering.
- **Hydration:** `provideClientHydration` wakes up the static HTML.
- **Incremental:** `@defer` blocks split the hydration work into small chunks.
