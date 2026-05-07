# Day 1 - Module 2: Declarative Data Fetching

**Goal:** Connect your application to a backend using the new **`httpResource`** API. You will learn to fetch data declaratively via a Service, handle loading/error states, and manage mutations using Observables.

**Estimated Time:** 70 Minutes

---

## 🛠️ Prerequisites

Ensure your backend is running.

1.  Check your terminal where `npm run dev` is active.
2.  Verify `http://localhost:3000/events` returns a JSON array in your browser.

---

## Step 1: Create the Data Service

We will define our data fetching logic inside a service using the experimental **`httpResource`** API, which simplifies HTTP GET requests into Signals.

1.  Create a new file: **`src/app/core/events.service.ts`**.
2.  Define the class. We need a method to create the resource (factory pattern) and a method for deletion.

```typescript
// src/app/core/events.service.ts
import { Injectable, inject, Signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DevFestEvent } from '../models/event';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/events';

  // 1. Define the Resource Factory
  // We accept a Signal<string> so the resource can react to changes automatically.
  getEventsResource(query: Signal<string>) {
    return httpResource<DevFestEvent[]>(() => {
      const q = query();
      // The function returns the URL to fetch.
      // Whenever 'q' changes, httpResource re-fetches automatically.
      return q ? `${this.apiUrl}?q=${q}` : this.apiUrl;
    });
  }

  // 2. Delete an event
  // We return an Observable (classic pattern) for the component to subscribe to.
  deleteEvent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

---

## Step 2: Consuming the Resource

Now we use this service in our Component. Notice how much cleaner this is compared to the old `ngOnInit` style.

1.  Open **`src/app/features/events/event-list.ts`**.
2.  Import `inject`.
3.  Inject the service and initialize the resource.

```typescript
// src/app/features/events/event-list.ts
import { Component, inject, signal } from '@angular/core';
import { EventsService } from '../../../core/events.service';
// ... imports (EventCard, SearchBar)

@Component({
  // ... selector/template/imports
})
export class EventList {
  private eventsService = inject(EventsService);

  // Existing state from Mod 1
  searchQuery = signal('');

  // 1. Initialize the Resource
  // We pass our signal directly to the service.
  // This creates a live connection: searchQuery -> URL -> HTTP Request -> events.value
  events = this.eventsService.getEventsResource(this.searchQuery);
}
```

---

## Step 3: Handling States in the Template

The `httpResource` object gives us standard signals:

- `.isLoading()`: Boolean
- `.error()`: Error object
- `.hasValue()`: Boolean (Safe check)
- `.value()`: The data (Accessor)

**Critical Safety Note:** We must check `events.hasValue()` before accessing `events.value()`, otherwise Angular will throw an error if the data isn't ready.

1.  Update the template in **`event-list.ts`** to handle these states.

```html
<!-- src/app/features/events/event-list.ts -->
<!-- 1. Error State -->
@if (events.error()) {
<div class="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
  Failed to load events. Is the server running?
</div>
}

<!-- 2. Loading State -->
@if (events.isLoading()) {
<div class="text-center py-12 text-gray-500 animate-pulse">Loading events...</div>
}

<!-- 3. Data State -->
<!-- We guard the value access with hasValue() -->
@if (events.hasValue()) {
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  @for (event of events.value(); track event.id) {
  <app-event-card
    [title]="event.title"
    [date]="event.date"
    [image]="event.image"
    (delete)="deleteEvent(event.id)"
  />
  } @empty {
  <p class="col-span-3 text-center text-gray-500">No events found.</p>
  }
</div>
}
```

---

## Step 4: Reactive Search (Verification)

Because `httpResource` inside the service is observing the `searchQuery` signal we passed in:

1.  Go to your browser.
2.  Type "Angular" in the Search Bar.
3.  **Observe:** The list updates automatically.

---

## Step 5: Handling Mutations (Delete)

To delete an item, we will use the classic Observable subscription pattern for the _action_, and then refresh the _resource_.

1.  In **`event-list.ts`**, implement the `deleteEvent` method.

```typescript
export class EventList {
  // ... previous code ...

  deleteEvent(id: string) {
    if (!confirm('Are you sure?')) return;

    // 1. Subscribe to the action
    this.eventsService.deleteEvent(id).subscribe({
      next: () => {
        // 2. On success, reload the resource
        // This re-fetches the current list from the server
        this.events.reload();
      },
      error: (err) => {
        console.error('Delete failed', err);
        alert('Could not delete event');
      },
    });
  }
}
```

2.  **Verify Event Binding:**
    Ensure your `@for` loop in the template is calling this method:
    `(delete)="deleteEvent(event.id)"`.

---

## Step 6: Testing Error Handling (Verification)

Let's simulate a server crash.

1.  Go to the terminal running `npm run server`.
2.  Press `Ctrl + C` to stop `json-server`.
3.  Reload the browser.
4.  **Observe:** You should see the red "Failed to load events" banner.
5.  **Restart Server:** Run `npm run server` again.
6.  Click "Reload" (or refresh page) to see data return.

---

### Module 2 Complete! ✅

You have successfully implemented **Declarative Data Fetching** with **`httpResource`**.

**Key Takeaways:**

- **`httpResource`**: A specialized primitive for HTTP GET requests.
- **Safety First**: Always use `.hasValue()` before accessing the data signal.
- **Hybrid Patterns**: Using Signals for _Reading_ data (Resource) and Observables for _Writing_ data (deleteEvent) is the standard pattern in Angular.

**Next Module:** We will build the **Event Details** page using modern Routing and Component Input Binding.
