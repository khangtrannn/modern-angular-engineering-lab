# Day 1 - Module 1: The Signal-Powered Component Model

**Goal:** Master the core primitives of Angular Components. You will use modern Signal APIs instead of legacy `@Input` and `@Output` decorators, handle derived state with `linkedSignal`, and implement two-way binding with `model()`.

**Estimated Time:** 70 Minutes

---

## 🛠️ Prerequisites

1.  Open your terminal in the project root.
2.  Run the development server (starts Angular + Backend):
    ```bash
    npm run dev
    ```
3.  Open your browser to `http://localhost:4200`.

You should see the "DevFest Manager" header and three empty "Placeholder" event cards.

---

## Step 1: Anatomy of a Modern Component

We will start by breathing life into the `EventCard` component.
Open the file: **`src/app/features/events/event-card.ts`**.

Notice the Angular differences:

- **Filename:** It is `event-card.ts` (no `.component.ts`).
- **Decorator:** No `standalone: true` needed (it is the default).

---

## Step 2: Signal Inputs (`input`)

We need to pass data (Title, Date, Image) from the List into the Card.

1.  In **`event-card.ts`**, import `input` from `@angular/core`.
2.  Define the inputs inside the class. We will make `title` and `image` required.

```typescript
// src/app/features/events/event-card.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-event-card',
  // standalone: true is DEFAULT now
  imports: [],
  template: `...`, // (existing template)
})
export class EventCard {
  // New Signal Inputs
  title = input.required<string>();
  image = input.required<string>();
  date = input<string>(); // Optional, returns Signal<string | undefined>
}
```

3.  Update the **template** inside `event-card.ts` to read these signals. Remember, signals are functions, so call them with `()`.

```html
<!-- Inside template -->
<!-- TODO: Add Image -->
<div class="relative h-48 w-full bg-gray-200">
  <img
    [src]="image()"
    class="object-cover w-full h-full max-h-full max-w-full"
    alt="Event thumbnail"
  />
</div>

<!-- ... -->

<h3 class="text-xl font-bold text-gray-800 my-2">{{ title() }}</h3>
```

4.  **Update the Parent:** Open **`src/app/features/events/event-list.ts`**. We need to pass mock data to the cards so the app doesn't crash.

```html
<!-- src/app/features/events/event-list.ts -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Temporary hardcoded data for testing -->
  <app-event-card
    title="Angular Keynote"
    image="/images/angular-keynote.png"
    date="2025-12-10T09:00:00.000Z"
  />
  <app-event-card title="Signals Deep Dive" image="/images/signals-deep-dive.png" />
</div>
```

---

## Step 3: Derived State (`computed`) & Template Variables

We want to show a badge saying "In 5 Days" or "Today". We _could_ calculate this in the template, but that is inefficient. Instead, we use `computed()`, which creates a read-only signal that only re-calculates when its dependencies (`this.date()`) change.

1.  In **`event-card.ts`**, import `computed` from `@angular/core`.
2.  Define the computed signal.

```typescript
// src/app/features/events/event-card.ts
import { Component, input, computed } from '@angular/core';

export class EventCard {
  title = input.required<string>();
  image = input.required<string>();
  date = input<string>(); // e.g., '2025-11-20T09:00:00Z'

  // NEW: Computed Signal
  daysUntil = computed(() => {
    const eventDate = this.date();
    if (!eventDate) return null;

    const today = new Date();
    const target = new Date(eventDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  });
}
```

3.  Update the **template** to display this badge. We'll use the new control flow `@if`. We'll also use `@let` to calculate the days once in the template.

<!-- prettier-ignore-start -->
```html
<!-- Inside template, near the date, before the title -->
<!-- The Badge -->
<div class="flex justify-between items-center mt-4">
  <!-- TODO Mod 1: Add Date using DatePipe -->
  <p class="text-sm text-blue-600 font-semibold mb-2">
    TBA
  </p>

  <!-- The Badge -->
  @let days = daysUntil();
  @if (days !== null) {
    <div
      class="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm"
    >
      @if (days > 0) {
        In {{ days }} Days
      } @else if (days < 0) {
        Past event
      } @else {
        Happening Now!
      }
    </div>
  }
</div>
```
<!-- prettier-ignore-end -->

---

## Step 4: Mutable Derived State (`linkedSignal`)

We want a "Like" button.

- It should initialize to `false`.
- However, if we later pass an `isFavorite` input from the server, it should update to match.
- The user can _also_ toggle it manually.

This "dependant but mutable" state is the perfect use case for **`linkedSignal`**.

1.  In **`event-card.ts`**, import `linkedSignal`.
2.  Add an `initialLike` input and the `isFavorite` state.

```typescript
// src/app/features/events/event-card.ts
import { Component, input, linkedSignal } from '@angular/core';

export class EventCard {
  // ... previous inputs

  // 1. An optional input to set initial state
  initialLike = input(false);

  // 2. State that defaults to the input value, but can change
  isFavorite = linkedSignal(() => this.initialLike());

  toggleFavorite() {
    // 3. Update the signal based on previous value
    this.isFavorite.update((val) => !val);
  }
}
```

3.  Update the Template to use this state.

```html
<!-- Inside template -->
<div class="flex justify-between items-center mt-4">
  <button
    (click)="toggleFavorite()"
    [class.text-red-500]="isFavorite()"
    class="text-gray-400 hover:text-red-500 transition-colors flex gap-2 items-center"
  >
    <!-- Dynamic Heart Icon -->
    <span>{{ isFavorite() ? '♥' : '♡' }}</span>
    Like
  </button>
  <!-- ... -->
</div>
```

---

## Step 5: Modern Outputs (`output`)

We need a way to tell the parent list to delete this event.

1.  In **`event-card.ts`**, import `output`.
2.  Create the output property.

```typescript
import { Component, input, output, linkedSignal } from '@angular/core';

export class EventCard {
  // ... inputs

  // New Output API (replaces @Output + EventEmitter)
  delete = output<void>();

  removeEvent() {
    this.delete.emit();
  }
}
```

3.  Bind it in the Template.

```html
<!-- Inside template -->
<button (click)="removeEvent()" class="text-gray-400 text-sm hover:text-gray-600">Remove</button>
```

4.  **Test it:** In the parent `event-list.ts`, bind to the event:
    `<app-event-card (delete)="console.log('Delete clicked')" ... />`

    We will also need to alias the console object in the component to make it available in the template.

    ```typescript
    readonly console = console;
    ```

    _(Note: We won't implement the actual delete logic until Module 2)._

---

## Step 6: provided DatePipe (using pipe)

We have a raw date string `2025-11-20...`. We want to format it.

1.  Import `DatePipe` in the `event-card.ts` imports array.
2.  Use `date:` pipe in the template.

<!-- prettier-ignore-start -->
```html
<!-- src/app/features/events/event-card.ts template -->

<p class="text-sm text-blue-600 font-semibold mb-2">
  {{ (date() | date: 'mediumDate') || 'TBA' }}
</p>
<!-- ... -->
```
<!-- prettier-ignore-end -->

---

## Step 7: Two-Way Binding (`model`)

We need a Search Bar in the parent list.
Open the scaffolded file: **`src/app/features/events/search-bar.ts`**.

1.  Implement the class using `model()`.

```typescript
import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-search-bar',
  imports: [FormsModule],
  template: `
    <div class="relative mb-6">
      <input
        [(ngModel)]="query"
        placeholder="Search events..."
        class="w-full p-4 pl-12 rounded-lg border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
      />
      <span class="absolute left-4 top-4 text-gray-400">🔍</span>
    </div>
  `,
})
export class SearchBar {
  // Model creates a writable signal that syncs with parent
  query = model('');
}
```

2.  Add it to **`event-list.ts`**.
    - Import `SearchBar`.
    - Create a signal `searchQuery` to hold the state.
    - Bind it using the "banana-in-a-box" syntax `[(query)]`.

```typescript
// src/app/features/events/event-list.ts
import { Component, signal } from '@angular/core';
import { EventCard } from '../event-card';
import { SearchBar } from './search-bar'; // import the file

@Component({
  selector: 'app-event-list',
  imports: [EventCard, SearchBar],
  template: `
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">Upcoming Events</h1>

      <!-- Two-way binding syncs parent signal <-> child model -->
      <app-search-bar [(query)]="searchQuery" />

      <p class="text-gray-500 mt-2">Searching for: {{ searchQuery() }}</p>
    </div>
    <!-- ... grid ... -->
  `,
})
export class EventList {
  searchQuery = signal('');
}
```

---

## Step 8: Verification (DevTools)

Now, let's prove it works.

1.  Open **Chrome DevTools** (F12).
2.  Navigate to the **Angular** tab.
3.  Click on the **Components** sub-tab (left side).
4.  Select `<app-event-card>` in the tree.
5.  Look at the **Properties** pane on the right.
    - Find `isFavorite`.
    - Click the "Heart" button in your app.
    - **Observe:** The value in DevTools flips from `false` to `true` instantly.
6.  Select `<app-search-bar>`.
    - Type in the input box.
    - **Observe:** The `query` model updates in real-time.
7.  Change the `date` of an event in `event-list.ts` to be 3 days from now.
    - **Observe:** The "In 3 Days" badge appears instantly.
8.  Change the date to yesterday.
    - **Observe:** The badge updates to "Happening Now!" (or disappears based on your logic).

---

### Module 1 Complete! ✅

You have successfully adopted the new signal-based **Angular Component Model**.

- `@Input` ➡️ `input()`
- `@Output` ➡️ `output()`
- `derived state` ➡️ `computed()`
- `state` ➡️ `linkedSignal()`
- `two-way binding` ➡️ `model()`

**Next Module:** We will delete the hardcoded data and fetch real events using the **Resource API**.
