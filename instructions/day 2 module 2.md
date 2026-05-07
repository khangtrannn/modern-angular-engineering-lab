# Day 2 - Module 2: Advanced UI Patterns & DI

**Goal:** Refactor the application to use reusable, architectural UI components. You will master **Content Projection** to build generic wrappers, use **Hierarchical Dependency Injection** to create isolated "Service Sandboxes", and implement **Host Directives**.

**Estimated Time:** 60 Minutes

---

## 🛠️ Prerequisites

1.  **Terminal:** Ensure `npm run dev` is running.
2.  **State:** SSR and Hydration should be enabled from Module 1.

---

## Step 1: Multi-Slot Content Projection (`UiCard`)

Currently, `EventCard` and `EventDetails` duplicate a lot of CSS (shadows, rounded corners, padding). Let's build a reusable **UI Card** that projects content into specific "Slots".

1.  Create a file: **`src/app/shared/ui-card.ts`**.
2.  Define the component with multi-slot projection.

```typescript
// src/app/shared/ui-card.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  template: `
    <div
      class="bg-white rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-xl h-full flex flex-col"
    >
      <!-- Slot 1: The Header (Image, Banner, etc) -->
      <!-- We select elements with the 'card-header' attribute -->
      <div class="border-b border-gray-100">
        <ng-content select="[card-header]" />
      </div>

      <!-- Slot 2: Main Content (Default) -->
      <div class="p-6 flex-grow">
        <ng-content />
      </div>

      <!-- Slot 3: Footer (Actions) -->
      <div class="p-4 bg-gray-50 border-t border-gray-100">
        <ng-content select="[card-footer]" />
      </div>
    </div>
  `,
})
export class UiCard {}
```

3.  **Refactor `EventCard`**: Open **`src/app/features/events/event-card.ts`**.
    - Import `UiCard`.
    - Wrap your HTML in `<app-ui-card>`.

```html
<!-- src/app/features/events/event-card.ts template -->
<app-ui-card>
  <!-- Projecting into the Header Slot -->
  <div card-header class="relative h-48 w-full bg-gray-200">
    <img
      [ngSrc]="image()"
      width="500"
      height="200"
      priority
      class="object-cover w-full h-full max-h-full max-w-full"
      alt="Event thumbnail"
    />
  </div>

  <!-- Default Content -->
  <div>
    <!-- Title, Date, Badges... -->
  </div>

  <!-- Projecting into the Footer Slot -->
  <div card-footer class="mt-4 text-right">
    <a
      [routerLink]="['/event', id()]"
      class="text-blue-600 font-medium hover:underline cursor-pointer"
    >
      View Details →
    </a>
  </div>
</app-ui-card>
```

---

## Step 2: The Service Sandbox (`TabState`)

We want to add a Tab Interface to the Details page (Overview | Speakers | Map).
Instead of passing `activeTab` inputs/outputs between parents and children, we will use **Hierarchical DI**.

1.  Create the service: **`src/app/shared/tabs/tab-state.ts`**.
2.  **Crucial:** Do **NOT** add `{ providedIn: 'root' }`. We want this service to be transient (one instance per TabGroup).

```typescript
// src/app/shared/tabs/tab-state.ts
import { Injectable, signal } from '@angular/core';

@Injectable() // No providedIn: 'root'!
export class TabState {
  // Tracks the label of the currently active tab
  readonly activeTab = signal<string>('');

  activate(label: string) {
    this.activeTab.set(label);
  }
}
```

---

## Step 3: The Tab Components

We need a Parent (`TabGroup`) and a Child (`Tab`).

1.  Create **`src/app/shared/tabs/tab.ts`**.
    - This component injects `TabState` to register itself and check if it is active.

```typescript
// src/app/shared/tabs/tab.ts
import { Component, inject, input, computed } from '@angular/core';
import { TabState } from './tab-state';

@Component({
  selector: 'app-tab',
  template: `
    <!-- Only render content if active -->
    @if (isActive()) {
      <div class="py-6 animate-in fade-in duration-300">
        <ng-content />
      </div>
    }
  `,
})
export class Tab {
  private readonly state = inject(TabState);

  readonly label = input.required<string>();

  // Derived state: am I active?
  readonly isActive = computed(() => this.state.activeTab() === this.label());
}
```

2.  Create **`src/app/shared/tabs/tab-group.ts`**.
    - **Architecture:** This component provides the `TabState`. This creates a "Sandbox". Any child injected here gets _this specific instance_ of the state.

```typescript
// src/app/shared/tabs/tab-group.ts
import { Component, contentChildren, inject, effect } from '@angular/core';
import { TabState } from './tab-state';
import { Tab } from './tab';

@Component({
  selector: 'app-tab-group',
  // SERVICE SANDBOX:
  // Every time <app-tab-group> is used, a NEW instance of TabState is created.
  providers: [TabState],
  imports: [],
  template: `
    <div class="border-b border-gray-200 flex gap-4">
      <!-- Render the buttons -->
      @for (tab of tabs(); track tab.label()) {
        <button
          (click)="activate(tab.label())"
          class="px-4 py-2 border-b-2 transition-colors font-medium"
          [class.border-blue-600]="state.activeTab() === tab.label()"
          [class.text-blue-600]="state.activeTab() === tab.label()"
          [class.border-transparent]="state.activeTab() !== tab.label()"
        >
          {{ tab.label() }}
        </button>
      }
    </div>

    <!-- Render the active tab content -->
    <ng-content />
  `,
})
export class TabGroup {
  readonly state = inject(TabState);

  // Query all child <app-tab> components
  readonly tabs = contentChildren(Tab);

  constructor() {
    // Select the first tab automatically when tabs load
    effect(() => {
      const allTabs = this.tabs();
      if (allTabs.length > 0 && !this.state.activeTab()) {
        this.state.activate(allTabs[0].label());
      }
    });
  }

  activate(label: string) {
    this.state.activate(label);
  }
}
```

---

## Step 4: Implementing Tabs in Details

Now let's use our clean UI architecture.

1.  Open **`src/app/features/events/event-details.ts`**.
2.  Import `TabGroup` and `Tab`.
3.  Replace the template structure.

```html
<!-- src/app/features/events/event-details.ts -->
<!-- ... Header ... -->

<div class="md:col-span-2 space-y-4">
  <h1 class="text-4xl font-bold text-gray-900">{{ event.title }}</h1>
  <p class="text-gray-500 text-lg">{{ event.date | date: 'fullDate' }} • {{ event.location }}</p>

  <app-tab-group>
    <app-tab label="Overview">
      <p class="text-gray-700 leading-relaxed text-lg">{{ event.description }}</p>
    </app-tab>

    <app-tab label="Venue">
      <p class="mb-4 text-gray-600">Location: {{ event.location }}</p>

      <!-- Move our Defer block from Mod 1 here! -->
      @defer (hydrate on viewport) {
      <div class="h-64 bg-gray-200 rounded relative">
        <img src="/images/venue-map.png" class="object-cover w-full h-full" />
      </div>
      } @placeholder {
      <div class="h-64 bg-gray-100 flex items-center justify-center">Loading Map...</div>
      }
    </app-tab>

    <app-tab label="Speakers">
      @if (event.speakers.length > 0) {
      <ul class="space-y-3">
        @for (speaker of event.speakers; track speaker) {
        <li class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div
            class="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold"
          >
            {{ speaker.charAt(0) }}
          </div>
          <span class="text-gray-700 font-medium">{{ speaker }}</span>
        </li>
        }
      </ul>
      } @else {
      <div class="p-4 bg-yellow-50 text-yellow-800 rounded">Speaker list coming soon.</div>
      }
    </app-tab>
  </app-tab-group>
</div>
```

---

## Step 5: Advanced DI Verification

Let's prove that the Dependency Injection is working hierarchically.

1.  Open **Angular DevTools**.
2.  Navigate to the **Injector Tree** tab (or check the component tree details).
3.  Find `<app-tab-group>`.
4.  Look at its **Providers**. You should see `TabState`.
5.  Select a child `<app-tab>`. Look at its dependencies. It is using the `TabState` from its direct parent, not the Root.
6.  **Mental Check:** If you added a second `TabGroup` to the page, clicking tabs in Group A would _not_ change tabs in Group B. They are isolated.

---

## Step 6: Host Directives (`hostDirectives`)

We want to track analytics every time a user clicks an `EventCard`. Instead of forcing the parent to add a `[appClickLogger]` directive to every card in the HTML, we will **compose** this behavior directly into the `EventCard` component itself.

1.  Create the standalone directive: **`src/app/shared/directives/click-logger.ts`**.

```typescript
// src/app/shared/directives/click-logger.ts
import { Directive, input } from '@angular/core';

@Directive({
  selector: '[appClickLogger]',
  host: {
    '(click)': 'onClick()',
  },
})
export class ClickLogger {
  // The directive expects an input named 'eventName'
  eventName = input<string>('unknown_event');

  onClick() {
    console.log(`[Analytics] Card Clicked: ${this.eventName()}`);
  }
}
```

2.  **Compose it into `EventCard`**:
    Open **`src/app/features/events/event-card.ts`**.
    Add the `hostDirectives` array to the component metadata.

```typescript
// src/app/features/events/event-card.ts
import { Component, input } from '@angular/core';
import { ClickLogger } from '../../shared/directives/click-logger'; // Import the directive

@Component({
  selector: 'app-event-card',

  // COMPOSE BEHAVIOR:
  // Every time <app-event-card> is rendered, Angular will automatically
  // attach a new instance of ClickLogger to it.
  hostDirectives: [
    {
      directive: ClickLogger,
      // We expose the directive's 'eventName' input as 'trackingId'
      // so the parent can do: <app-event-card [trackingId]="..." />
      inputs: ['eventName: trackingId'],
    },
  ],

  template: `...`, // (template remains the same)
})
export class EventCard {
  title = input.required<string>();
  // Note: We do NOT define 'trackingId' here. It is handled by the host directive.
}
```

3.  **Update the Parent (`EventList`)**:
    Open **`src/app/features/events/event-list.ts`**.
    Bind the new `trackingId` input that we just exposed.

```html
<!-- src/app/features/events/event-list.ts -->

<app-event-card
  [title]="event.title"
  [image]="event.image"
  [date]="event.date"
  [trackingId]="'event_card_' + event.id"
  (delete)="deleteEvent(event.id)"
/>
```

4.  **Verification:**
    - Reload the app.
    - Click anywhere on an Event Card.
    - Check the Console.
    - **Observe:** `[Analytics] Card Clicked: event_card_1`
    - **Lesson:** You successfully added click tracking to the component _definition_ without writing any event handling logic in the component class or the HTML template.

---

### Module 2 Complete! ✅

You have refactored the UI using advanced Angular patterns.

**Key Takeaways:**

- **Content Projection:** `<ng-content select="...">` creates flexible component shells.
- **Hierarchical DI:** `providers: []` on a Component creates a "Service Sandbox" for that specific branch of the DOM.
- **Host Directives:** Allows you to compose behaviors (like Logging, Tooltips, or Validation) onto components at the architecture level, keeping your component classes clean.

**Next Module:** We will tackle **Concurrency and Error Handling** using RxJS to prepare for the Enterprise Store.
