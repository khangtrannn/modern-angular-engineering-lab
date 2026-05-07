# Day 2 - Module 3: RxJS Concurrency & Error Patterns

This module is unique because it is a **"Code Playground"** module. We will write some temporary code in `EventDetails` to prove why specific RxJS operators are necessary for the Checkout logic we are about to build in the Store.

**Goal:** Before we implement the Checkout logic in our Store, we must choose the correct concurrency strategy. You will experiment with `mergeMap` vs `exhaustMap` to prevent "Double Booking" bugs and learn how to handle errors without killing the application.

**Estimated Time:** 45 Minutes

---

## 🛠️ Prerequisites

1.  Open **`src/app/features/events/event-details.ts`**.
2.  Your code should match the version you just confirmed (with Tabs, Defer blocks, etc.).
3.  Ensure the app is running: `npm run dev`.

---

## Step 1: The Concurrency Playground

We want to simulate a slow backend. If a user spam-clicks "Buy Ticket", we don't want to accidentally charge them 5 times.

1.  Open **`src/app/features/events/event-details.ts`**.
2.  Add a `Subject` to act as our trigger and inject the `DestroyRef` (for clean cleanup).
3.  Add a constructor to set up the RxJS pipeline.

```typescript
// Add imports
import { Subject, of, delay, tap } from 'rxjs';
import { mergeMap, exhaustMap, takeUntil } from 'rxjs/operators';
import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'; // Angular 16+ magic

export class EventDetails {
  // ... existing injections ...

  // 1. Create a Trigger
  private buyBtnClick$ = new Subject<void>();

  constructor() {
    // 2. Setup the Pipeline
    this.buyBtnClick$
      .pipe(
        // STRATEGY: We will change this operator in Step 2
        mergeMap(() => {
          console.log('🔄 Transaction Started...');
          // Simulate a 2-second backend request
          return of('Transaction Complete').pipe(delay(2000));
        }),
        takeUntilDestroyed(), // Auto-unsubscribe
      )
      .subscribe((result) => {
        console.log('✅', result);
      });
  }

  // 3. Hijack the existing method
  addToCart() {
    // Instead of calling the service, trigger the Subject
    this.buyBtnClick$.next();
  }
}
```

---

Here is the updated **Step 2** for **Day 2 - Module 3**, including the `concatMap` scenario.

---

## Step 2: The Operator Battle

Now, open your browser Console (F12) and test the button.

### Round 1: `mergeMap` (The Dangerous Default)

1.  **Action:** Click the "Buy Ticket" button **5 times** rapidly.
2.  **Observe Console:**
    - You see 5 `🔄 Transaction Started...` messages immediately.
    - 2 seconds later, you see 5 `✅ Transaction Complete` messages.
3.  **Verdict:** ❌ **Fail.** You just bought 5 tickets simultaneously. This is the default behavior of `subscribe()` inside a click handler.

### Round 2: `switchMap` (The Canceller)

1.  Change `mergeMap` to `switchMap` in the code.
2.  **Action:** Click the button **5 times** rapidly.
3.  **Observe Console:**
    - You see 5 `🔄 Transaction Started...`.
    - You see **only 1** `✅ Transaction Complete` (the last one).
4.  **Verdict:** ❌ **Fail.** You started 5 requests. The browser cancelled the first 4 responses, but the _Server_ might have still processed the charges. The UI is now out of sync with the backend.

### Round 3: `concatMap` (The Queue)

1.  Change `switchMap` to `concatMap`.
2.  **Action:** Click the button **5 times** rapidly.
3.  **Observe Console:**
    - You see 1 `🔄 Transaction Started...`.
    - Wait 2 seconds... `✅ Transaction Complete`.
    - Immediately, the 2nd `🔄 Transaction Started...` appears.
    - Wait 2 seconds... `✅ Transaction Complete`.
    - (Repeats 3 more times).
4.  **Verdict:** ❌ **Fail.** While "Safe" (no race conditions), the user has to wait 10 seconds because they accidentally spam-clicked. We shouldn't punish the user for clicking fast.

### Round 4: `exhaustMap` (The Protector)

1.  Change `concatMap` to **`exhaustMap`**.
2.  **Action:** Click the button **5 times** rapidly.
3.  **Observe Console:**
    - You see **1** `🔄 Transaction Started...`.
    - You click 4 more times... **nothing happens**.
    - 2 seconds later, you see **1** `✅ Transaction Complete`.
    - Click again -> A new transaction starts.
4.  **Verdict:** 🏆 **Winner.** `exhaustMap` ignores all new triggers while the inner Observable (the HTTP request) is still pending. This is the correct strategy for "Checkout" or "Login" buttons.

## Step 3: The Error Trap

A common mistake in reactive programming is letting an error kill the stream.

1.  Modify your pipeline to throw an error.

```typescript
import { catchError, EMPTY, throwError } from 'rxjs';

// ... inside constructor ...
this.buyBtnClick$
  .pipe(
    exhaustMap(() => {
      console.log('🔄 Trying to buy...');
      // Simulate an API Error
      return throwError(() => new Error('Credit Card Declined')).pipe(delay(500));
    }),
    takeUntilDestroyed(),
  )
  .subscribe({
    next: (res) => console.log(res),
    error: (err) => console.error('☠️ Stream Died:', err),
  });
```

2.  **Test:**
    - Click "Buy Ticket".
    - Console: `☠️ Stream Died: Credit Card Declined`.
    - **Click "Buy Ticket" again.**
    - **Result:** Nothing happens. The button is dead. The subscription has completed because of the error.

---

## Step 4: The Resilient Pattern

To keep the stream alive, we must catch the error **inside** the flattening operator (the "Inner Observable").

1.  Fix the code:

```typescript
this.buyBtnClick$
  .pipe(
    exhaustMap(() => {
      console.log('🔄 Trying to buy...');
      return throwError(() => new Error('Credit Card Declined')).pipe(
        delay(500),
        // CATCH IT HERE (Inner Stream)
        catchError((err) => {
          console.warn('⚠️ Handled Error:', err.message);
          // Return a safe value (Observable) to keep the outer stream going
          return EMPTY;
        }),
      );
    }),
    takeUntilDestroyed(),
  )
  .subscribe({
    next: (res) => console.log(res),
    error: (err) => console.error('☠️ This will never run now'),
  });
```

2.  **Test:**
    - Click "Buy Ticket". -> `⚠️ Handled Error`.
    - Click "Buy Ticket" again. -> `⚠️ Handled Error`.
    - **Result:** The button stays alive!

---

## Step 5: Cleanup

Now that we understand **why** we need `exhaustMap` and **inner error handling**, let's revert the component so it's ready for the Store implementation in the next module.

1.  **Remove** the `buyBtnClick$` subject.
2.  **Remove** the constructor pipeline.
3.  **Revert** `addToCart()` to its original simple state:

```typescript
addToCart() {
  this.cartService.addTicket(this.id());
}
```

> **Why did we do this?** In the next module, we will implement `rxMethod` in the SignalStore. We will explicitly choose `exhaustMap` inside that method, and now you understand exactly why that choice is critical for enterprise applications.

---

### Module 3 Complete! ✅

**Key Takeaways:**

- **Concurrency:** Use `exhaustMap` for non-idempotent actions (like paying) to prevent double-submissions.
- **Resilience:** Always `catchError` inside the flattening operator. If the error reaches the main `subscribe`, the feature breaks until the page is refreshed.

**Next Module:** We will implement the **Enterprise SignalStore** with these patterns built-in.
