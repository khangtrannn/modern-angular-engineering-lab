# Day 1 - Module 5: Shared State & Dependency Injection

**Goal:** Create a global "Ticket Cart" to manage state across the application. You will learn to **Lift State Up** into a singleton service, implement **Optimistic Updates** (update UI immediately, revert on error), and master **Advanced DI** using Factory Providers.

**Estimated Time:** 45 Minutes

---

## 🛠️ Prerequisites

1.  Ensure the app is running (`npm run dev`).
2.  You should be able to navigate to an Event Details page.

---

## Step 1: Advanced DI (Injection Tokens & Factories)

Before we build the service, let's configure our API endpoints. Instead of hardcoding URLs, we will use a **Factory Provider** to derive the Tickets URL from a Base API URL.

1.  Create a file: **`src/app/core/tokens.ts`**.

```typescript
// src/app/core/tokens.ts
import { InjectionToken, inject } from '@angular/core';

// 1. The Base URL Token
// This allows us to switch environments (dev/prod) easily.
export const API_URL = new InjectionToken<string>('API_URL');

// 2. The Derived Token (Factory Pattern)
// This token automatically injects API_URL and appends '/tickets'.
// You never have to manually concatenate strings in your services.
export const TICKETS_URL = new InjectionToken<string>('TICKETS_URL', {
  providedIn: 'root',
  factory: () => {
    const api = inject(API_URL);
    return `${api}/tickets`;
  },
});
```

2.  Provide the Base URL in **`src/app/app.config.ts`**.

```typescript
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
// ... other imports
import { API_URL } from './core/tokens'; // Import token

export const appConfig: ApplicationConfig = {
  providers: [
    // ... existing providers (Router, HttpClient) ...

    // We only provide the BASE url.
    // The TICKETS_URL is 'providedIn: root' via its factory.
    { provide: API_URL, useValue: 'http://localhost:3000' },
  ],
};
```

---

## Step 2: Create the Cart Service

Now we build the service.

- **State:** A simple array of Event IDs (`string[]`). If you buy 2 tickets, the ID appears twice.
- **Reading:** Fetch existing tickets when the service initializes.
- **Writing:** Use **Optimistic UI** (Update Signal -> Send Request -> Revert on Error).

1.  Create a new file: **`src/app/core/cart.service.ts`**.

```typescript
// src/app/core/cart.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TICKETS_URL } from './tokens';

// Shape of data from json-server
interface TicketEntry {
  id: string; // database ID
  eventId: string; // our actual event ID
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly http = inject(HttpClient);
  // Inject the token we defined in Step 1
  private readonly ticketsUrl = inject(TICKETS_URL);

  // 1. State: Just a list of Event IDs
  private readonly ticketIds = signal<string[]>([]);

  // 2. Computed: Total count
  readonly count = computed(() => this.ticketIds().length);

  constructor() {
    this.loadTickets();
  }

  // 3. Initial Load
  private loadTickets() {
    this.http.get<TicketEntry[]>(this.ticketsUrl).subscribe({
      next: (data) => {
        // Extract just the event IDs for our local state
        const ids = data.map((t) => t.eventId);
        this.ticketIds.set(ids);
      },
      error: (err) => console.error('Failed to load cart', err),
    });
  }

  // 4. Action: Optimistic Add
  addTicket(eventId: string) {
    // A. Snapshot current state (for rollback)
    const previousIds = this.ticketIds();

    // B. Optimistically update UI
    // We just append the ID to the list
    this.ticketIds.update((ids) => [...ids, eventId]);

    // C. Persist to Backend
    // We POST the eventId. json-server will generate a unique 'id' for the record.
    this.http.post(this.ticketsUrl, { eventId }).subscribe({
      next: () => console.log('Ticket synced to backend'),
      error: (err) => {
        console.error('Sync failed, reverting state', err);
        // D. Revert on Error
        this.ticketIds.set(previousIds);
        alert('Failed to add ticket to cart.');
      },
    });
  }
}
```

---

## Step 3: Connect the Header (Reading State)

Use the service to display the count.

1.  Open **`src/app/layout/header.ts`**.
2.  Inject `CartService` and bind the `count` signal.

```typescript
// src/app/layout/header.ts
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CartService } from '../core/cart.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="bg-blue-700 text-white shadow-md">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <!-- Logo & Nav ... -->
        <a routerLink="/" class="text-2xl font-bold flex items-center gap-2">...</a>

        <nav class="flex gap-6 items-center">
          <!-- Links ... -->

          <!-- STATE BINDING -->
          <button
            class="bg-white text-blue-700 px-4 py-2 rounded-full font-bold shadow hover:bg-gray-100 transition"
          >
            <span>Tickets: {{ cartService.count() }}</span>
          </button>
        </nav>
      </div>
    </header>
  `,
})
export class Header {
  // Public so template can access it
  readonly cartService = inject(CartService);
}
```

---

## Step 4: Connect Event Details (Writing State)

Use the service to add items.

1.  Open **`src/app/features/events/event-details.ts`**.

```typescript
// src/app/features/events/event-details.ts
import { Component, input, inject } from '@angular/core';
// ... imports
import { CartService } from '../../core/cart.service';

@Component({
  // ... imports
})
export class EventDetails {
  private readonly cartService = inject(CartService);
  // (Assuming you have an events service here too)

  readonly id = input.required<string>();
  // ... eventResource code ...

  addToCart() {
    this.cartService.addTicket(this.id());
  }
}
```

2.  **Update Template:**
    Modify the "Buy Tickets" button inside the `@if (eventResource.hasValue())` block.

```html
<!-- Inside event-details template -->
<button
  (click)="addToCart()"
  class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition active:scale-95"
>
  Buy Ticket
</button>
```

---

## Step 5: Update Events Service (Refactor)

Since we created the `API_URL` token, we should update our `EventsService` to use it as well, ensuring the whole app uses the same configuration source.

1.  Open **`src/app/core/events.service.ts`**.
2.  Inject `API_URL`.

```typescript
import { API_URL } from './tokens';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private http = inject(HttpClient);

  // Construct the events API URL
  private apiUrl = `${inject(API_URL)}/events`;

  // ... rest of code remains the same
}
```

---

## Step 6: Verification

1.  **Initial Load:**
    - Reload the page. The Header might show "Tickets: 0" (or previous count).
2.  **Optimistic UI:**
    - Go to "Event Details".
    - Click "Buy Ticket".
    - **Observe:** Header increments immediately (e.g., 0 -> 1).
    - Click "Buy Ticket" again.
    - **Observe:** Header increments again (e.g., 1 -> 2). We now have 2 tickets for this event.
3.  **Persistance:**
    - Reload the page.
    - **Observe:** Header still shows the correct count (data fetched from `loadTickets()`).
4.  **Error Handling (Rollback):**
    - Stop your backend (`Ctrl+C` in the `npm run dev` terminal).
    - Click "Buy Ticket".
    - **Observe:** Header increments momentarily, then decrements back when the request fails. An alert appears.
    - _Restart your server!_

---

### Module 5 Complete! ✅

You have successfully implemented **Shared State** and **Advanced DI**.

**Key Takeaways:**

- **Factory Providers:** We used `factory` in `InjectionToken` to combine dependencies (`API_URL`) into new values (`TICKETS_URL`) automatically.
- **Optimistic Updates:** We updated the Signal _before_ the HTTP request to make the app feel instant, but kept a snapshot to rollback if the server failed.
- **Lifting State:** By moving the `tickets` signal to a service, the Header and Details page share the same truth.

---

## 🏁 Day 1 Complete

You have built the core feature set of **DevFest Manager**:

1.  **Components:** Signals, Inputs, Outputs.
2.  **Data:** `httpResource` & Declarative Fetching.
3.  **Router:** Input Binding & Guards.
4.  **Forms:** Model-Driven Signal Forms.
5.  **State:** Shared Services & Optimistic UI.

**Tomorrow (Day 2):** We optimize for performance (Zoneless, Hydration) and scale (SignalStore, Testing).
