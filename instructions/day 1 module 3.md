# Day 1 - Module 3: Modern Routing

**Goal:** Create a multi-view application. You will learn how to access route parameters as **Component Inputs** (removing the need for `ActivatedRoute`), fetch data based on those inputs using **Chained Resources**, and protect routes with **Functional Guards**.

**Estimated Time:** 55 Minutes

---

## 🛠️ Prerequisites

1.  Ensure the app is running (`npm run dev`).
2.  Your `EventList` should be displaying data from the backend.

---

## Step 1: Route Configuration

We need to define the routes for our application. We have the "Home" page, but we need the "Details" and "Admin" pages.

1.  Open **`src/app/app.routes.ts`**.
2.  Ensure your routes point to the correct components.

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { EventList } from './features/events/event-list';
import { EventDetails } from './features/events/event-details';
import { CreateEvent } from './features/admin/create-event';

export const routes: Routes = [
  { path: '', component: EventList },
  // The ':id' token acts as a variable
  { path: 'event/:id', component: EventDetails },
  { path: 'admin/create', component: CreateEvent },
  // Fallback
  { path: '**', redirectTo: '' },
];
```

3.  **Verify Configuration:** Open **`src/app/app.config.ts`** and confirm that `withComponentInputBinding()` is included in the router provider. This is the mechanism that turns route parameters into Component Inputs.

---

## Step 2: Component Input Binding

Traditionally, you would inject `ActivatedRoute` and subscribe to `paramMap`. In latest Angular, we just use `input()`.

1.  Open **`src/app/features/events/event-details.ts`**.
2.  Add an `id` input. Use `readonly` because inputs are read-only signals.

```typescript
// src/app/features/events/event-details.ts
import { Component, input } from '@angular/core';

@Component({
  selector: 'app-event-details',
  imports: [], // We will add imports later
  template: `...`,
})
export class EventDetails {
  // The name 'id' matches the ':id' token in app.routes.ts
  readonly id = input.required<string>();
}
```

That's it. When you navigate to `/event/123`, the signal `id()` will equal `"123"`.

---

## Step 3: Fetching Single Event (Service)

We need a way to fetch a single event from the API based on that ID.

1.  Open **`src/app/core/events.service.ts`**.
2.  Add a `getEventResource` method using `httpResource`.

```typescript
// src/app/core/events.service.ts

// ... imports

export class EventsService {
  // ... existing code ...

  // Factory for a single event resource
  // We accept a Signal<string> to allow reactive chaining
  getEventResource(id: Signal<string>) {
    return httpResource<DevFestEvent>(() => {
      const eventId = id();
      // If no ID (or routing transition), don't fetch yet
      if (!eventId) return undefined;

      return `${this.apiUrl}/${eventId}`;
    });
  }
}
```

---

## Step 4: Chained Resources

Now, link the Input to the Resource in the component.

1.  Open **`src/app/features/events/event-details.ts`**.
2.  Inject the service and create the resource.

```typescript
import { Component, input, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // Utilities
import { RouterLink } from '@angular/router';
import { EventsService } from '../../../core/events.service';

@Component({
  selector: 'app-event-details',
  imports: [CommonModule, RouterLink, DatePipe],
  template: `...`, // We will update this next
})
export class EventDetails {
  private readonly eventService = inject(EventsService);

  // 1. Route Param Input
  readonly id = input.required<string>();

  // 2. Resource depends on the 'id' signal
  // When the route changes, 'id' updates, and 'eventResource' re-fetches automatically.
  readonly eventResource = this.eventService.getEventResource(this.id);
}
```

---

## Step 5: The Details Template

Let's build the UI to show the event data.

1.  Update the template in **`event-details.ts`**.

```html
<div class="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
  <!-- Back Button -->
  <a routerLink="/" class="text-blue-600 hover:underline mb-6 inline-block"> ← Back to Events </a>

  <!-- Loading State -->
  @if (eventResource.isLoading()) {
  <div class="animate-pulse h-64 bg-gray-100 rounded-lg"></div>
  }

  <!-- Error State -->
  @if (eventResource.error()) {
  <div class="text-red-600 p-4 bg-red-50 rounded">Event not found.</div>
  }

  <!-- Success State -->
  <!-- Always check hasValue() before accessing value() -->
  @if (eventResource.hasValue()) { @let event = eventResource.value()!;

  <div class="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[600px]">
    <!-- Left: Content -->
    <div class="md:col-span-2 space-y-4">
      <h1 class="text-4xl font-bold text-gray-900">{{ event.title }}</h1>
      <p class="text-gray-500 text-lg">{{ event.date | date:'fullDate' }} • {{ event.location }}</p>
      <p class="text-gray-700 leading-relaxed text-lg">{{ event.description }}</p>
    </div>

    <!-- Right: Actions -->
    <div class="bg-gray-50 p-6 rounded-xl h-fit border border-gray-100">
      <div class="h-48 bg-gray-200 rounded mb-4 overflow-hidden">
        <!-- We will optimize this image in Day 2 -->
        <img [src]="event.image" class="w-full h-full object-cover" />
      </div>

      <button
        class="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg transition"
      >
        Buy Tickets
      </button>
    </div>
  </div>
  }
</div>
```

---

## Step 6: Linking from the Card

We need to update our `EventCard` to link to this new page.

1.  Open **`src/app/features/events/event-card.ts`**.
2.  Add `id` to the inputs. Mark it as `readonly`.

```typescript
export class EventCard {
  readonly id = input.required<string>(); // Add this line
  readonly title = input.required<string>();
  // ...
}
```

3.  Update the **template** in `event-card.ts` to use `RouterLink` on the "View Details" button.

```typescript
import { RouterLink } from '@angular/router'; // Import this!

@Component({
  imports: [RouterLink, DatePipe], // Add RouterLink to imports
  // ...
})
// ...
```

```html
<!-- Inside template -->
<div class="mt-4 pt-4 border-t border-gray-100 text-right">
  <!-- Use [routerLink] with the id signal -->
  <a
    [routerLink]="['/event', id()]"
    class="text-blue-600 font-medium hover:underline cursor-pointer"
  >
    View Details →
  </a>
</div>
```

4.  **Update Parent (`EventList`):**
    Open `event-list.ts`. The compiler will complain that the `id` input is missing.
    Update the loop:

```html
<app-event-card [id]="event.id" [title]="event.title" ... />
```

5.  **Verify:** Click "View Details" on an event. You should see the full description page. Click "Back" to return.

---

## Step 7: Functional Guards

We want to prevent unauthorized access to the `/admin/create` route. In latest Angular, we use **Functional Guards**.

1.  Create a file: **`src/app/core/auth.guard.ts`**.

```typescript
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Simulation: Check if user is "admin"
  // In a real app, you'd check a UserSignal or AuthService
  const isAdmin = localStorage.getItem('isAdmin') === 'true';

  if (isAdmin) {
    return true;
  } else {
    // Redirect to home if not authorized
    alert('Restricted Area! (Simulating 403)');
    return router.createUrlTree(['/']);
  }
};
```

2.  Apply it in **`src/app/app.routes.ts`**.

```typescript
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  // ...
  {
    path: 'admin/create',
    component: CreateEvent,
    canActivate: [authGuard], // Add the guard
  },
  // ...
];
```

3.  **Verify:**
    - Click the "Admin" link in the header.
    - **Expectation:** You get an alert and are redirected to Home.
    - **Hack it:** Open DevTools Console -> `localStorage.setItem('isAdmin', 'true')` -> Click Admin.
    - **Expectation:** You are allowed into the Admin Create page.

---

### Module 3 Complete! ✅

You have built a fully navigable application.

**Key Takeaways:**

- **Component Input Binding:** No need for `ActivatedRoute`. Route parameters (`:id`) are just Inputs.
- **Chained Resources:** Pass one signal (`id()`) into the factory of another (`getEventResource`) to create reactive data chains.
- **Readonly Signals:** Using `readonly` on inputs and resources enforces immutability and makes the data flow clearer.

**Next Module:** We will build the **Create Event** form using the unified **Signal Forms API**.
