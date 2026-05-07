# Day 2 - Module 4: Enterprise State (SignalStore)

**Goal:** Refactor the application state management to use **SignalStore**. You will create a reusable store feature (`withRequestStatus`), implement robust asynchronous flows using `rxMethod` and `exhaustMap`, and handle **Optimistic Updates** with automatic rollback mechanisms.

**Estimated Time:** 70 Minutes

---

## 🛠️ Prerequisites

1.  **State:** Your app currently uses `CartService` (Day 1 code).
2.  **Context:** You just learned about `exhaustMap` in Module 3. Now we apply it.
3.  **Dependencies:** Ensure `@ngrx/signals` and `@ngrx/operators` are installed (or present in the node_modules of the starter project).

---

## Step 1: Create the Custom Store Feature

We want to track the status of our API calls (Idle, Pending, Fulfilled, Error) without manually creating boolean flags (`isLoading`, `isSaving`, `error`) for every single store. We will build a reusable **Feature**.

1.  Create a folder: **`src/app/core/store-features/`**.
2.  Create a file: **`src/app/core/store-features/request-status.feature.ts`**.
3.  Paste the following code:

```typescript
// src/app/core/store-features/request-status.feature.ts
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';

export type RequestStatus = 'idle' | 'pending' | 'fulfilled' | { error: string };
export type RequestStatusState = { requestStatus: RequestStatus };

export function withRequestStatus() {
  return signalStoreFeature(
    withState<RequestStatusState>({ requestStatus: 'idle' }),
    withComputed(({ requestStatus }) => ({
      isPending: () => requestStatus() === 'pending',
      isFulfilled: () => requestStatus() === 'fulfilled',
      error: () => {
        const status = requestStatus();
        return typeof status === 'object' ? status.error : null;
      },
    })),
  );
}

// Helpers for state updates
export function setPending(): RequestStatusState {
  return { requestStatus: 'pending' };
}
export function setFulfilled(): RequestStatusState {
  return { requestStatus: 'fulfilled' };
}
export function setError(error: string): RequestStatusState {
  return { requestStatus: { error } };
}
```

---

## Step 2: Define the CartStore Shell

Now we replace our Service with a Store.

1.  Create a file: **`src/app/core/cart.store.ts`**.
2.  Setup the basic structure, including our new feature and computed signals.

```typescript
// src/app/core/cart.store.ts
import { inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
  withHooks,
} from '@ngrx/signals';
import { HttpClient } from '@angular/common/http';
import { TICKETS_URL } from './tokens';
import { withRequestStatus } from '../store-features/with-request-status.feature';

type CartState = {
  ticketIds: string[];
};

export const CartStore = signalStore(
  { providedIn: 'root' },

  // 1. Initial State
  withState<CartState>({ ticketIds: [] }),

  // 2. Add Custom Feature (Gives us isPending, error, etc.)
  withRequestStatus(),

  // 3. Computed Selectors
  withComputed(({ ticketIds }) => ({
    count: () => ticketIds().length,
  })),

  // Next steps: withMethods...
);
```

---

## Step 3: Implement Async Methods (`rxMethod`)

This is the core logic. We need to handle **Loading** (Reading) and **Checking Out** (Writing).

1.  Import RxJS operators and `tapResponse` from `@ngrx/operators`.
2.  Add `withMethods` to the store definition.

```typescript
// Add imports
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';
import { pipe, tap, switchMap, exhaustMap } from 'rxjs';
import { setPending, setFulfilled, setError } from '../store-features/with-request-status.feature';

// Helper interface for API response
interface TicketEntry { id: string; eventId: string; }

export const CartStore = signalStore(
  // ... previous config ...

  withMethods((store) => {
    const http = inject(HttpClient);
    const ticketsUrl = inject(TICKETS_URL);

    return {
      // METHOD 1: Load Tickets (Read)
      // Strategy: switchMap (If called again, cancel previous load)
      load: rxMethod<void>(
        pipe(
          tap(() => patchState(store, setPending())),
          switchMap(() => http.get<TicketEntry[]>(ticketsUrl).pipe(
            tapResponse({
              next: (tickets) => patchState(store,
                { ticketIds: tickets.map(t => t.eventId) },
                setFulfilled()
              ),
              error: (err: any) => patchState(store, setError(err.message))
            })
          ))
        )
      ),

      // METHOD 2: Checkout (Write)
      // Strategy: exhaustMap (Ignore clicks while one is processing)
      addToCart: rxMethod<{ eventId: string }>(
        pipe(
          exhaustMap(({ eventId }) => {
            patchState(
              store,
              (state) => ({ ticketIds: [...state.ticketIds, eventId] }),
              setPending(),
            );
            return http.post(ticketsUrl, { eventId }).pipe(
              tapResponse({
                next: () => {
                  patchState(store, setFulfilled());
                  console.log('Transaction Confirmed');
                },
                error: (err: any) => {
                  console.error('Transaction Failed - Rolling Back');

                  // CRITICAL: ROLLBACK LOGIC
                  // We optimistically added the ID. Now we must remove ONE instance of it.
                  patchState(
                    store,
                    (state) => {
                      const index = state.ticketIds.lastIndexOf(eventId);
                      if (index === -1) return state;

                      const newIds = [...state.ticketIds];
                      newIds.splice(index, 1);
                      return { ticketIds: newIds };
                    },
                    setError(err.message),
                  );
                },
              }),
            );
          }),
        ),
      ),
    };
  }),
```

---

## Step 4: Initialization

We also need to load data when the app starts.

Append to the store definition:

```typescript
  // LIFECYCLE HOOKS
  withHooks({
    onInit(store) {
      // Automatically load data when the store is first injected
      store.load();
    }
  })
);
```

---

## Step 5: Refactoring Components

We now replace `CartService` with `CartStore` in our components.

### 1. Update `EventDetails`

Open **`src/app/features/events/event-details.ts`**.

```typescript
import { CartStore } from '../../../core/cart.store'; // Import Store

export class EventDetails {
  // Replace service with Store
  readonly cartStore = inject(CartStore);

  readonly id = input.required<string>();
  // ...

  addToCart() {
    // Call the store method
    this.cartStore.addToCart({ eventId: this.id() });
  }
}
```

**Update Template:**
Use the `isPending` signal to disable the button and show feedback.

```html
<!-- Inside event-details template -->
<button
  (click)="addToCart()"
  [disabled]="cartStore.isPending()"
  class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition active:scale-95 disabled:opacity-50 disabled:cursor-wait"
>
  @if (cartStore.isPending()) { Syncing... } @else { Buy Ticket }
</button>
```

### 2. Update `Header`

Open **`src/app/layout/header.ts`**.

```typescript
import { CartStore } from '../core/cart.store';

export class Header {
  readonly cartStore = inject(CartStore);
}
```

**Update Template:**
Change `cartService.count()` to `cartStore.count()`.

---

## Step 6: Verification

1.  **Initial Data:** Reload the page.
    - **Check:** The `onInit` hook should fire. Network tab shows `GET /tickets`. The header badge should reflect the count.
2.  **Concurrency (The `exhaustMap` Test):**
    - Click "Buy Ticket" **5 times** rapidly.
    - **Check:** The button disables instantly (`isPending`).
    - **Check:** Network tab shows **only 1** `POST` request.
3.  **Multiple Tickets:**
    - Wait for the first purchase to finish.
    - Click "Buy Ticket" again.
    - **Check:** Header count increments again. You now have 2 tickets.
4.  **Rollback (The Error Test):**
    - Go to your terminal running `npm run dev`. Press `Ctrl + C` to kill the backend.
    - Click "Buy Ticket".
    - **Observe:**
      1.  Header count goes **Up** (Optimistic).
      2.  Button says "Syncing...".
      3.  Network request fails (red).
      4.  Header count goes **Down** (Rollback).
      5.  Button reverts to "Buy Ticket".
    - **Restart your server** (`npm run dev`) before moving on!

---

### Module 4 Complete! ✅

You have successfully refactored to an **Enterprise-Grade SignalStore**.

**Key Takeaways:**

- **Custom Features:** `withRequestStatus` allows you to standardize loading/error states across all stores in your company.
- **RxJS Interop:** `rxMethod` bridges the gap between Signals (State) and RxJS (Async Events), allowing us to use powerful operators like `exhaustMap`.
- **Resilience:** We implemented a sophisticated **Optimistic UI** pattern that keeps the user happy (fast UI) while ensuring data consistency (Rollback on error).

**Next Module:** We will learn how to verify this logic without clicking buttons manually by writing **Unit Tests and Harnesses**.
