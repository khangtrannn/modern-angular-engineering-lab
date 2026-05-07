# Day 2 - Module 5: Quality Assurance & Testing (Vitest Edition)

**Goal:** Ensure the stability of your application using **Vitest**. You will learn to unit test **SignalStores** (business logic), verify Signal effects using **`flushEffects()`**, interact with the DOM using **Component Harnesses**, and test asynchronous **`@defer`** blocks.

**Estimated Time:** 55 Minutes

---

## 🛠️ Prerequisites

1.  **Terminal:** Stop the development server.
2.  **Run Tests:** Start Vitest in watch mode.
    ```bash
    npm test
    ```

---

## Step 0: Configure Test Environment

Before writing tests, we need to configure the Angular testing environment for **Zoneless** mode and **Vitest**.

1.  Create **`src/test-setup.ts`**:
    This file initializes the Angular test environment and provides global configuration.

```typescript
import '@angular/compiler';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { beforeEach } from 'vitest';
import { provideZonelessChangeDetection } from '@angular/core';

// Initialize the Angular testing environment
try {
  TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
} catch (e) {
  // Ignore if already initialized
}

// Global setup for all tests
beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(), // Enable zoneless mode for all tests
    ],
  });
});
```

2.  Create **`vitest.config.ts`**:
    Configure Vitest to use the setup file.

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
  },
});
```

3.  Update **`angular.json`**:
    Configure the test builder to use the Vitest configuration.

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": { "runnerConfig": "vitest.config.ts" }
}
```

---

## Step 1: Unit Testing the SignalStore

We will use a **Setup Function** to create an isolated environment for each test, avoiding shared mutable state (global variables).

1.  Create the test file: **`src/app/core/cart.store.spec.ts`**.
2.  Define a `setup()` function that configures the `TestBed` and returns the Store and HttpController.

```typescript
// src/app/core/cart.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect } from 'vitest';
import { CartStore } from './cart.store';
import { API_URL } from './tokens';

describe('CartStore', () => {
  // 1. The Setup Function
  // Configures the module and returns the needed instances
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_URL, useValue: 'http://localhost:3000' },
        CartStore,
        provideHttpClientTesting(),
      ],
    });

    return {
      store: TestBed.inject(CartStore),
      httpMock: TestBed.inject(HttpTestingController),
    };
  }

  it('loads initial tickets on init', () => {
    const { store, httpMock } = setup();

    // Expect the onInit load request
    const req = httpMock.expectOne('http://localhost:3000/tickets');
    expect(req.request.method).toBe('GET');

    expect(store.ticketIds().length).toBe(0);

    // Flush mock data
    req.flush([{ id: '100', eventId: '1' }]);

    // Verify Store State
    expect(store.ticketIds().length).toBe(1);
    expect(store.count()).toBe(1);

    httpMock.verify();
  });

  it('optimistically adds ticket and reverts on error', () => {
    const { store, httpMock } = setup();

    // Handle initial load
    httpMock.expectOne('http://localhost:3000/tickets').flush([]);

    // Action: Add to cart
    store.addToCart({ eventId: '999' });

    // Assert: Optimistic Update
    expect(store.count()).toBe(1);
    expect(store.isPending()).toBe(true);

    // Action: Simulate Network Error
    const req = httpMock.expectOne('http://localhost:3000/tickets');
    req.flush('Server Error', { status: 500, statusText: 'Server Error' });

    // Assert: Rollback
    expect(store.count()).toBe(0);
    expect(store.error()).toContain('Server Error');

    httpMock.verify();
  });
});
```

---

## Step 2: Testing Computed Signals

Computed Signals are lazy and synchronous. They update immediately when read, so we generally don't need special flushing logic unless we are testing `effect()` blocks.

1.  Create/Open: **`src/app/features/events/event-card.spec.ts`**.

```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { EventCard } from './event-card';
import { provideRouter } from '@angular/router';

describe('EventCard', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [EventCard],
      providers: [provideRouter([])],
    }).compileComponents();

    const fixture = TestBed.createComponent(EventCard);
    const component = fixture.componentInstance;

    // Set Default Required Inputs
    fixture.componentRef.setInput('title', 'Test Event');
    fixture.componentRef.setInput('image', 'img.jpg');

    return { fixture, component };
  }

  it('toggles favorite state on click', async () => {
    const { fixture, component } = await setup();

    // Assert Initial State
    expect(component.isFavorite()).toBe(false);

    // Act
    await fixture.whenStable(); // Wait for initial render

    // Find the button that contains "Like"
    const buttons = fixture.nativeElement.querySelectorAll('button');
    const heartButton = Array.from(buttons).find((btn: any) =>
      btn.textContent.includes('Like'),
    ) as HTMLElement;

    if (!heartButton) throw new Error('Like button not found');

    heartButton.click();
    await fixture.whenStable(); // Wait for click update

    expect(heartButton.textContent).toContain('♥');
  });

  it('calculates computed daysUntil correctly', async () => {
    const { fixture, component } = await setup();

    // Set a date 5 days in the future
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);
    fixture.componentRef.setInput('date', futureDate.toISOString());

    // Note: Computed signals are lazy and synchronous, so reading them
    // triggers recalculation. No flushEffects() needed!

    expect(component.daysUntil()).toBe(5);
  });
});
```

---

## Step 3: Component Harnesses

Selecting elements with `querySelector` is brittle. We use **Harnesses** to test behavior, not implementation details.

1.  Create the harness: **`src/app/features/events/event-card.harness.ts`**.

```typescript
import { ComponentHarness } from '@angular/cdk/testing';

export class EventCardHarness extends ComponentHarness {
  static hostSelector = 'app-event-card';

  // Locators
  protected getTitleElement = this.locatorFor('h3');
  protected getLikeButton = this.locatorFor('button');

  async getTitleText(): Promise<string> {
    const title = await this.getTitleElement();
    return title.text();
  }

  async clickLike(): Promise<void> {
    const btn = await this.getLikeButton();
    return btn.click();
  }

  async getLikeButtonText(): Promise<string> {
    const btn = await this.getLikeButton();
    return btn.text();
  }
}
```

2.  Update **`src/app/features/events/event-card.spec.ts`** to use the harness in a new test.

```typescript
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { EventCardHarness } from './event-card.harness';

// Patch PointerEvent and MouseEvent to avoid JSDOM error with Angular CDK
// JSDOM throws "member view is not of type Window" if view is not strictly window
if (typeof window !== 'undefined') {
  const patchEvent = (EventClass: any) => {
    const Original = EventClass;
    return class extends Original {
      constructor(type: string, eventInitDict: any = {}) {
        if (eventInitDict && eventInitDict.view) {
          // @ts-ignore
          eventInitDict.view = null;
        }
        super(type, eventInitDict);
      }
    };
  };

  if (window.PointerEvent) {
    (window as any).PointerEvent = patchEvent(window.PointerEvent);
  }
  if (window.MouseEvent) {
    (window as any).MouseEvent = patchEvent(window.MouseEvent);
  }
}

// ... inside describe ...

it('toggles favorite using Harness interaction', async () => {
  const { fixture } = await setup();

  // 1. Create Harness Loader from fixture
  // Since the fixture IS the component, we use harnessForFixture
  const card = await TestbedHarnessEnvironment.harnessForFixture(fixture, EventCardHarness);

  // 2. Interact via high-level API
  expect(await card.getLikeButtonText()).toContain('♡');

  await card.clickLike();

  expect(await card.getLikeButtonText()).toContain('♥');
});
```

---

## Step 4: Testing `@defer` Blocks

Angular's testing API allows us to manually trigger `@defer` block states to verify lazy loading behavior.

1.  Create/Open: **`src/app/features/events/event-details.spec.ts`**.

```typescript
import { TestBed } from '@angular/core/testing';
import { describe, it, expect } from 'vitest';
import { EventDetails } from './event-details';
import { provideRouter } from '@angular/router';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { DeferBlockState } from '@angular/core/testing';

import { API_URL } from '../../core/tokens';

describe('EventDetails', () => {
  async function setup() {
    await TestBed.configureTestingModule({
      imports: [EventDetails],
      providers: [
        { provide: API_URL, useValue: 'http://localhost:3000' },
        provideRouter([]),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(EventDetails);
    const httpMock = TestBed.inject(HttpTestingController);

    // Set required input
    fixture.componentRef.setInput('id', '1');
    fixture.detectChanges();

    return { fixture, httpMock };
  }

  it('renders map only when deferred block completes', async () => {
    const { fixture, httpMock } = await setup();

    // 1. Handle CartStore initialization (it loads tickets)
    const ticketsReq = httpMock.expectOne('http://localhost:3000/tickets');
    ticketsReq.flush([]);

    // 2. Handle EventDetails data fetching
    const req = httpMock.expectOne('http://localhost:3000/events/1');
    req.flush({
      id: '1',
      title: 'Test Event',
      date: new Date().toISOString(),
      location: 'Test Location',
      description: 'Test Description',
      speakers: [],
      image: 'test.jpg',
    });
    fixture.detectChanges(); // Update view with data
    await fixture.whenStable(); // Wait for signals to settle
    fixture.detectChanges(); // Update view again for content projection

    // 1. Get all defer blocks
    const deferBlocks = await fixture.getDeferBlocks();
    const mapBlock = deferBlocks[0];

    // Switch to Venue tab to render the defer block placeholder
    const tabs = fixture.nativeElement.querySelectorAll('button');
    // Helper to find tab by text content (trimming whitespace)
    const venueTab = Array.from(tabs).find(
      (t: any) => t.textContent.trim() === 'Venue',
    ) as HTMLElement;

    if (!venueTab) throw new Error('Venue tab not found');

    venueTab.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // 2. Verify Placeholder State
    expect(fixture.nativeElement.textContent).toContain('Loading Map...');
    expect(fixture.nativeElement.textContent).not.toContain('Heavy Map Loaded');

    // 3. Force Render (Simulate Viewport Entry)
    await mapBlock.render(DeferBlockState.Complete);

    // 4. Verify Final State
    expect(fixture.nativeElement.textContent).toContain('Heavy Map Loaded');
  });
});
```

---

## 🧠 Deep Dive: Testing in a Zoneless World

In Angular 21+ with Zoneless and Signals, the rules of testing change slightly.

### The "Why" Matrix

| Scenario                    | State Change          | `await fixture.whenStable()` Result                   | Do you need `fixture.detectChanges()`? |
| :-------------------------- | :-------------------- | :---------------------------------------------------- | :------------------------------------- |
| **Zone.js / Standard Prop** | `this.prop = 'val'`   | Waits for Promises. DOM **NOT** updated.              | **YES.** Mandatory to update DOM.      |
| **Zoneless / Signals**      | `this.sig.set('val')` | Flushes Scheduler (renders view). DOM **IS** updated. | **NO.** (Usually).                     |
| **Effect()**                | `effect(() => ...)`   | Flushes Scheduler (runs effect). DOM **IS** updated.  | **NO.**                                |

### When do you _still_ need `detectChanges()`?

Even in a Zoneless/Signal app, `fixture.detectChanges()` is useful in specific edge cases:

1.  **Setting Component Inputs:** When you set an input on a component fixture (`fixture.componentRef.setInput`), the change is staged but not "committed" until change detection runs.
2.  **Manual DOM Manipulation:** If your test manually manipulates the DOM and you need to trigger a template listener synchronously.
3.  **Synchronous Testing:** If you prefer to force an update immediately without waiting for the scheduler.

**Verdict:** The Signal system bridges the gap between state changes and the DOM. The Signal tells the framework to update, and `whenStable` allows that update to finish.

---

## Step 5: Final Review

Check your Vitest terminal output. You should see green checkmarks for all suites:

- ✅ `CartStore`
- ✅ `EventCard`
- ✅ `EventDetails`

---

### Module 5 Complete! ✅

You have successfully implemented a robust **Quality Assurance** strategy using **Vitest**.

**Key Takeaways:**

- **Setup Functions:** Avoid global variables and `beforeEach` soup by using clean factory functions for test setup.
- **Unit Testing Stores:** Isolate business logic from the UI.
- **Testing Signals:** Signals notify the scheduler of changes. `await fixture.whenStable()` flushes the scheduler and updates the DOM, often replacing the need for `fixture.detectChanges()` except for inputs and manual triggers.
- **Defer Testing:** Use `.render(DeferBlockState.Complete)` to deterministically test lazy-loaded UI.

---

# 🎓 Course Completed!

Congratulations! You have successfully completed Intermediate and Advanced Angular courses.

**What you built:**

- A **Zoneless** application using Signals for everything.
- A **Server-Side Rendered** PWA with **Incremental Hydration**.
- An **Enterprise State Architecture** using SignalStore and RxJS Interop.
- A **Testable** codebase using Vitest and Harnesses.
